// Copyright (c) 2026 thezencirs (https://github.com/thezencirs) - MIT License
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text.Json.Nodes;
using CircleFIDIC.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging;

namespace CircleFIDIC.Server;

public sealed class EmbeddedWebHost : IAsyncDisposable
{
    private WebApplication? _app;
    private readonly object _stateLock = new();
    private JsonObject _state;
    public int Port { get; private set; }
    public string LocalUrl => $"http://127.0.0.1:{Port}";
    public string LanUrl { get; private set; } = "";

    public EmbeddedWebHost()
    {
        _state = SeedData.LoadOrCreateState();
    }

    public async Task StartAsync(int preferredPort = 4580)
    {
        Port = FindAvailablePort(preferredPort);
        var lanIp = GetLocalLanIp() ?? "127.0.0.1";
        LanUrl = $"http://{lanIp}:{Port}";

        var exeDir = AppContext.BaseDirectory;
        var wwwroot = Path.Combine(exeDir, "wwwroot");
        const string liveWorkspaceWww = @"C:\Users\zenci\.gemini\antigravity\scratch\CircleFIDIC\wwwroot";
        if (Directory.Exists(liveWorkspaceWww) && File.Exists(Path.Combine(liveWorkspaceWww, "index.html")))
        {
            wwwroot = liveWorkspaceWww;
        }
        else if (!Directory.Exists(wwwroot) || !File.Exists(Path.Combine(wwwroot, "index.html")))
        {
            var devRoot = Path.GetFullPath(Path.Combine(exeDir, "..", "..", "..", "wwwroot"));
            if (Directory.Exists(devRoot) && File.Exists(Path.Combine(devRoot, "index.html")))
            {
                wwwroot = devRoot;
            }
            else
            {
                wwwroot = ExtractEmbeddedWwwroot();
            }
        }

        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            ContentRootPath = exeDir,
            WebRootPath = wwwroot
        });

        builder.Logging.ClearProviders();
        builder.WebHost.ConfigureKestrel(k =>
        {
            k.Limits.MaxRequestBodySize = 250 * 1024 * 1024; // 250 MB photo/video/CAD upload support
            try
            {
                k.Listen(IPAddress.Any, Port);
            }
            catch
            {
                k.ListenLocalhost(Port);
            }
        });

        var app = builder.Build();

        app.UseDefaultFiles();
        app.UseStaticFiles();

        var uploadsDir = Path.Combine(SeedData.GetDataDirectory(), "uploads");
        Directory.CreateDirectory(uploadsDir);
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(uploadsDir),
            RequestPath = "/uploads"
        });

        const string fidicFolder = @"D:\26FIDIC";
        if (Directory.Exists(fidicFolder))
        {
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(fidicFolder),
                RequestPath = "/fidic-library",
                ServeUnknownFileTypes = true
            });
        }

        MapApiRoutes(app, uploadsDir, fidicFolder);

        await app.StartAsync();
        _app = app;
    }

    private void MapApiRoutes(WebApplication app, string uploadsDir, string fidicFolder)
    {
        app.MapGet("/api/info", () => Results.Json(new
        {
            product = "Circle FIDIC",
            author = "thezencirs",
            version = "1.0.0",
            localUrl = LocalUrl,
            lanUrl = LanUrl,
            fidicFolderAvailable = Directory.Exists(fidicFolder),
            fidicFolderPath = fidicFolder
        }));

        app.MapGet("/api/state", () =>
        {
            lock (_stateLock)
            {
                return Results.Content(_state.ToJsonString(), "application/json; charset=utf-8");
            }
        });

        app.MapPost("/api/state/reset", () =>
        {
            lock (_stateLock)
            {
                var p = SeedData.GetStateFilePath();
                if (File.Exists(p)) File.Delete(p);
                _state = SeedData.LoadOrCreateState();
                return Results.Content(_state.ToJsonString(), "application/json; charset=utf-8");
            }
        });

        app.MapPost("/api/projects", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            if (body == null) return Results.BadRequest();
            lock (_stateLock)
            {
                var arr = _state["projects"]!.AsArray();
                body["id"] = "prj-" + Guid.NewGuid().ToString("N")[..8];
                arr.Insert(0, body);
                SeedData.SaveState(_state);
                return Results.Content(body.ToJsonString(), "application/json; charset=utf-8");
            }
        });

        app.MapPost("/api/users", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            if (body == null) return Results.BadRequest();
            lock (_stateLock)
            {
                var arr = _state["users"]!.AsArray();
                body["id"] = "u-" + Guid.NewGuid().ToString("N")[..6];
                arr.Add(body);
                SeedData.SaveState(_state);
                return Results.Content(body.ToJsonString(), "application/json; charset=utf-8");
            }
        });

        app.MapPost("/api/tasks", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            if (body == null) return Results.BadRequest();
            lock (_stateLock)
            {
                var arr = _state["tasks"]!.AsArray();
                body["id"] = "tsk-" + Guid.NewGuid().ToString("N")[..6];
                arr.Insert(0, body);
                SeedData.SaveState(_state);
                return Results.Content(body.ToJsonString(), "application/json; charset=utf-8");
            }
        });

        app.MapPost("/api/tasks/progress", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            if (body == null) return Results.BadRequest();
            var id = body["id"]?.GetValue<string>() ?? "";
            var prog = body["progress"]?.GetValue<int>() ?? 0;
            lock (_stateLock)
            {
                foreach (var item in _state["tasks"]!.AsArray())
                {
                    if (item is JsonObject obj && obj["id"]?.GetValue<string>() == id)
                    {
                        obj["progress"] = Math.Clamp(prog, 0, 100);
                        obj["status"] = prog >= 100 ? "done" : (prog > 0 ? "in_progress" : "open");
                        break;
                    }
                }
                SeedData.SaveState(_state);
                return Results.Json(new { ok = true });
            }
        });

        app.MapPost("/api/hourly", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            if (body == null) return Results.BadRequest();
            var projectId = body["projectId"]?.GetValue<string>() ?? "";
            lock (_stateLock)
            {
                foreach (var p in _state["projects"]!.AsArray())
                {
                    if (p is JsonObject pobj && pobj["id"]?.GetValue<string>() == projectId)
                    {
                        var logs = pobj["hourlyLogs"] as JsonArray ?? new JsonArray();
                        pobj["hourlyLogs"] = logs;
                        body.Remove("projectId");
                        logs.Insert(0, body);
                        break;
                    }
                }
                SeedData.SaveState(_state);
                return Results.Json(new { ok = true });
            }
        });

        app.MapPost("/api/meals", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            if (body == null) return Results.BadRequest();
            lock (_stateLock)
            {
                var arr = _state["meals"]!.AsArray();
                body["id"] = "ml-" + Guid.NewGuid().ToString("N")[..6];
                arr.Insert(0, body);
                // Also sync project activeWorkers if provided
                var pid = body["projectId"]?.GetValue<string>();
                var hc = body["activeHeadcount"]?.GetValue<int>() ?? 0;
                if (!string.IsNullOrEmpty(pid) && hc > 0)
                {
                    foreach (var p in _state["projects"]!.AsArray())
                    {
                        if (p is JsonObject pobj && pobj["id"]?.GetValue<string>() == pid && pobj["numbers"] is JsonObject nums)
                        {
                            nums["activeWorkers"] = hc;
                        }
                    }
                }
                SeedData.SaveState(_state);
                return Results.Content(body.ToJsonString(), "application/json; charset=utf-8");
            }
        });

        app.MapPost("/api/snags", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            if (body == null) return Results.BadRequest();
            lock (_stateLock)
            {
                var arr = _state["snags"]!.AsArray();
                body["id"] = $"E-{101 + arr.Count}";
                arr.Insert(0, body);
                SeedData.SaveState(_state);
                return Results.Content(body.ToJsonString(), "application/json; charset=utf-8");
            }
        });

        app.MapPost("/api/snags/status", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            if (body == null) return Results.BadRequest();
            var id = body["id"]?.GetValue<string>() ?? "";
            var st = body["status"]?.GetValue<string>() ?? "open";
            var note = body["noteTr"]?.GetValue<string>();
            lock (_stateLock)
            {
                foreach (var s in _state["snags"]!.AsArray())
                {
                    if (s is JsonObject sobj && sobj["id"]?.GetValue<string>() == id)
                    {
                        sobj["status"] = st;
                        if (!string.IsNullOrWhiteSpace(note))
                            sobj["noteTr"] = note;
                        break;
                    }
                }
                SeedData.SaveState(_state);
                return Results.Json(new { ok = true });
            }
        });

        app.MapPost("/api/feedbacks", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            if (body == null) return Results.BadRequest();
            lock (_stateLock)
            {
                var arr = _state["feedbacks"]!.AsArray();
                body["id"] = "fb-" + Guid.NewGuid().ToString("N")[..6];
                arr.Insert(0, body);
                SeedData.SaveState(_state);
                return Results.Content(body.ToJsonString(), "application/json; charset=utf-8");
            }
        });

        app.MapPost("/api/feedbacks/reply", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            if (body == null) return Results.BadRequest();
            var id = body["id"]?.GetValue<string>() ?? "";
            var reply = body["replyTr"]?.GetValue<string>() ?? "";
            lock (_stateLock)
            {
                foreach (var f in _state["feedbacks"]!.AsArray())
                {
                    if (f is JsonObject fobj && fobj["id"]?.GetValue<string>() == id)
                    {
                        fobj["replyTr"] = reply;
                        fobj["status"] = "answered";
                        break;
                    }
                }
                SeedData.SaveState(_state);
                return Results.Json(new { ok = true });
            }
        });

        app.MapPost("/api/notices", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            if (body == null) return Results.BadRequest();
            lock (_stateLock)
            {
                var arr = _state["notices"]!.AsArray();
                body["id"] = $"FIDIC-N-0{arr.Count + 1}";
                arr.Insert(0, body);
                SeedData.SaveState(_state);
                return Results.Content(body.ToJsonString(), "application/json; charset=utf-8");
            }
        });

        app.MapPost("/api/media/upload", async (HttpRequest req) =>
        {
            if (!req.HasFormContentType) return Results.BadRequest();
            var form = await req.ReadFormAsync();
            var file = form.Files.FirstOrDefault();
            string savedUrl = "/samples/kat_plani_rev02.svg";
            if (file != null && file.Length > 0)
            {
                var ext = Path.GetExtension(file.FileName);
                if (string.IsNullOrWhiteSpace(ext)) ext = ".bin";
                var safeName = $"{DateTime.Now:yyyyMMdd_HHmmss}_{Guid.NewGuid().ToString("N")[..6]}{ext}";
                var fullPath = Path.Combine(uploadsDir, safeName);
                await using var fs = File.Create(fullPath);
                await file.CopyToAsync(fs);
                savedUrl = "/uploads/" + safeName;
            }

            var item = new JsonObject
            {
                ["id"] = "med-" + Guid.NewGuid().ToString("N")[..6],
                ["projectId"] = form["projectId"].ToString(),
                ["kind"] = form["kind"].ToString(),
                ["discipline"] = form["discipline"].ToString(),
                ["revision"] = string.IsNullOrWhiteSpace(form["revision"]) ? "Rev.01 (Güncel)" : form["revision"].ToString(),
                ["isCurrent"] = true,
                ["titleTr"] = form["titleTr"].ToString(),
                ["zone"] = form["zone"].ToString(),
                ["uploadedBy"] = form["uploadedBy"].ToString(),
                ["date"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm"),
                ["url"] = savedUrl,
                ["fidicClause"] = form["fidicClause"].ToString()
            };

            lock (_stateLock)
            {
                _state["media"]!.AsArray().Insert(0, item);
                SeedData.SaveState(_state);
            }

            return Results.Content(item.ToJsonString(), "application/json; charset=utf-8");
        });

        app.MapGet("/api/weather", async (double? lat, double? lon) =>
        {
            double latitude = lat ?? 41.0082;
            double longitude = lon ?? 28.9784;
            try
            {
                using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(4) };
                var url = string.Create(System.Globalization.CultureInfo.InvariantCulture,
                    $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto");
                var resp = await http.GetStringAsync(url);
                return Results.Content(resp, "application/json; charset=utf-8");
            }
            catch
            {
                // Reliable offline construction site weather fallback
                var fallback = """
                {
                  "offlineFallback": true,
                  "current": {
                    "temperature_2m": 14.6,
                    "relative_humidity_2m": 62,
                    "precipitation": 0.0,
                    "wind_speed_10m": 21.4,
                    "weather_code": 2
                  },
                  "daily": {
                    "time": ["Bugün", "Yarın", "+2 Gün", "+3 Gün", "+4 Gün"],
                    "temperature_2m_max": [15.2, 16.0, 12.4, 11.0, 14.8],
                    "temperature_2m_min": [9.4, 10.1, 7.2, 6.5, 8.9],
                    "precipitation_sum": [0.0, 0.4, 14.2, 4.8, 0.0],
                    "wind_speed_10m_max": [22.0, 26.5, 52.0, 34.0, 19.0]
                  }
                }
                """;
                return Results.Content(fallback, "application/json; charset=utf-8");
            }
        });

        app.MapPost("/api/open-fidic-local", async (HttpRequest req) =>
        {
            var body = await JsonNode.ParseAsync(req.Body) as JsonObject;
            var fileName = body?["file"]?.GetValue<string>() ?? "";
            if (string.IsNullOrWhiteSpace(fileName)) return Results.BadRequest();
            var safeFile = Path.GetFileName(fileName);
            var fullPath = Path.Combine(fidicFolder, safeFile);
            if (!File.Exists(fullPath))
                return Results.NotFound(new { error = "Dosya bulunamadı" });

            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = fullPath,
                    UseShellExecute = true
                });
                return Results.Json(new { ok = true, path = fullPath });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        });
    }

    private static string ExtractEmbeddedWwwroot()
    {
        var targetDir = Path.Combine(SeedData.GetDataDirectory(), "wwwroot_bundle_v1");
        var asm = typeof(EmbeddedWebHost).Assembly;
        var resName = asm.GetManifestResourceNames().FirstOrDefault(n => n.EndsWith("wwwroot.zip", StringComparison.OrdinalIgnoreCase));
        if (resName != null)
        {
            if (Directory.Exists(targetDir)) Directory.Delete(targetDir, recursive: true);
            Directory.CreateDirectory(targetDir);
            using var s = asm.GetManifestResourceStream(resName)!;
            System.IO.Compression.ZipFile.ExtractToDirectory(s, targetDir, overwriteFiles: true);
        }
        return targetDir;
    }

    private static int FindAvailablePort(int preferred)
    {
        try
        {
            using var listener = new TcpListener(IPAddress.Loopback, preferred);
            listener.Start();
            listener.Stop();
            return preferred;
        }
        catch
        {
            using var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            int port = ((IPEndPoint)listener.LocalEndpoint).Port;
            listener.Stop();
            return port;
        }
    }

    private static string? GetLocalLanIp()
    {
        try
        {
            foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus != OperationalStatus.Up ||
                    ni.NetworkInterfaceType == NetworkInterfaceType.Loopback)
                    continue;
                foreach (var ua in ni.GetIPProperties().UnicastAddresses)
                {
                    if (ua.Address.AddressFamily == AddressFamily.InterNetwork &&
                        !IPAddress.IsLoopback(ua.Address))
                    {
                        var s = ua.Address.ToString();
                        if (s.StartsWith("192.168.") || s.StartsWith("10.") || s.StartsWith("172."))
                            return s;
                    }
                }
            }
        }
        catch { }
        return null;
    }

    public async ValueTask DisposeAsync()
    {
        if (_app != null)
        {
            await _app.StopAsync();
            await _app.DisposeAsync();
        }
    }
}
