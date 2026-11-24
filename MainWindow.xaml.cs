// Copyright (c) 2026 thezencirs (https://github.com/thezencirs) - MIT License
using System.IO;
using System.Windows;
using CircleFIDIC.Models;
using CircleFIDIC.Server;
using Microsoft.Web.WebView2.Core;

namespace CircleFIDIC;

public partial class MainWindow : Window
{
    private readonly EmbeddedWebHost _webHost;
    private readonly LaunchOptions _options;

    public MainWindow(EmbeddedWebHost webHost, LaunchOptions options)
    {
        InitializeComponent();
        _webHost = webHost;
        _options = options;

        if (_options.MobileViewport)
        {
            Width = 430;
            Height = 910;
        }

        Loaded += OnWindowLoaded;
    }

    private async void OnWindowLoaded(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(_options.ScreenshotPath))
        {
            Topmost = true;
            Activate();
            Focus();
            _ = Dispatcher.BeginInvoke(new Action(() => Topmost = false), System.Windows.Threading.DispatcherPriority.ApplicationIdle);
        }

        try
        {
            var userDataDir = Path.Combine(SeedData.GetDataDirectory(), "WebView2Cache");
            var env = await CoreWebView2Environment.CreateAsync(null, userDataDir);
            await BrowserView.EnsureCoreWebView2Async(env);

            BrowserView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            BrowserView.CoreWebView2.Settings.IsStatusBarEnabled = false;

            var qs = new List<string>();
            if (!string.IsNullOrWhiteSpace(_options.Role)) qs.Add($"role={Uri.EscapeDataString(_options.Role)}");
            if (!string.IsNullOrWhiteSpace(_options.Tab)) qs.Add($"tab={Uri.EscapeDataString(_options.Tab)}");
            if (!string.IsNullOrWhiteSpace(_options.Lang)) qs.Add($"lang={Uri.EscapeDataString(_options.Lang)}");
            if (_options.MobileViewport) qs.Add("mobile=1");

            var targetUrl = _webHost.LocalUrl + (qs.Count > 0 ? "/?" + string.Join("&", qs) : "/");
            BrowserView.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
            BrowserView.Source = new Uri(targetUrl);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"WebView2 başlatılamadı: {ex.Message}\nTarayıcı adresi: {_webHost.LocalUrl}", "Circle FIDIC", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }

    private async void OnNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(_options.ScreenshotPath))
            return;

        try
        {
            await Task.Delay(1200);
            var outPath = Path.GetFullPath(_options.ScreenshotPath);
            Directory.CreateDirectory(Path.GetDirectoryName(outPath)!);
            await using var fs = File.Create(outPath);
            await BrowserView.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, fs);
        }
        catch
        {
            // Ignore capture errors in headless environments
        }
        finally
        {
            Application.Current.Shutdown(0);
        }
    }
}
