namespace TechPhoneE2E.Utils;

/// <summary>Tìm thư mục gốc repo (có package.json + vite.config.js).</summary>
public static class RepoPaths
{
    public static string FindRepoRoot()
    {
        var d = new DirectoryInfo(AppContext.BaseDirectory);
        while (d != null)
        {
            var pkg = Path.Combine(d.FullName, "package.json");
            var vite = Path.Combine(d.FullName, "vite.config.js");
            if (File.Exists(pkg) && File.Exists(vite))
                return d.FullName;
            d = d.Parent;
        }
        return Directory.GetCurrentDirectory();
    }

    public static string TestReportExcelPath => Path.Combine(FindRepoRoot(), "test", "TestReport.xlsx");

    public static string ScreenshotDirectory => Path.Combine(FindRepoRoot(), "test", "e2e-screenshots");
}
