// Copyright (c) 2026 thezencirs (https://github.com/thezencirs) - MIT License
using System.Windows;
using CircleFIDIC.Server;

namespace CircleFIDIC;

public sealed class LaunchOptions
{
    public bool HeadlessServerOnly { get; set; }
    public string? ScreenshotPath { get; set; }
    public string? Role { get; set; }
    public string? Tab { get; set; }
    public string? Lang { get; set; }
    public bool MobileViewport { get; set; }
    public int Port { get; set; } = 4580;
}

public static class Program
{
    [STAThread]
    public static int Main(string[] args)
    {
        var opts = ParseArgs(args);
        var host = new EmbeddedWebHost();
        host.StartAsync(opts.Port).GetAwaiter().GetResult();

        if (opts.HeadlessServerOnly)
        {
            var wait = new ManualResetEventSlim(false);
            try { Console.CancelKeyPress += (_, e) => { e.Cancel = true; wait.Set(); }; } catch { }
            wait.Wait();
            host.DisposeAsync().AsTask().GetAwaiter().GetResult();
            return 0;
        }

        var app = new Application();
        var win = new MainWindow(host, opts);
        app.Exit += (_, _) =>
        {
            _ = Task.Run(async () => { try { await host.DisposeAsync(); } catch { } });
        };
        app.Run(win);
        Environment.Exit(0);
        return 0;
    }

    private static LaunchOptions ParseArgs(string[] args)
    {
        var o = new LaunchOptions();
        for (int i = 0; i < args.Length; i++)
        {
            var a = args[i];
            if (a.Equals("--server", StringComparison.OrdinalIgnoreCase))
                o.HeadlessServerOnly = true;
            else if (a.Equals("--mobile", StringComparison.OrdinalIgnoreCase))
                o.MobileViewport = true;
            else if (a.Equals("--screenshot", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                o.ScreenshotPath = args[++i];
            else if (a.Equals("--role", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                o.Role = args[++i];
            else if (a.Equals("--tab", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                o.Tab = args[++i];
            else if (a.Equals("--lang", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                o.Lang = args[++i];
            else if (a.Equals("--port", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length && int.TryParse(args[++i], out int p))
                o.Port = p;
        }
        return o;
    }
}
