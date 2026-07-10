namespace TechPhoneE2E.Utils;

/// <summary>
/// Base URL frontend (Vite). Override: biến môi trường TECHPHONE_BASE_URL.
/// Chạy test: bật API (npm run server) + Vite (npm run dev) trước.
/// User seed: <c>npm run seed</c> — admin mặc định.
/// </summary>
public static class TestConfig
{
    public const string SeedAdminEmail = "admin@techphone.local";
    public const string SeedAdminPassword = "Admin@123456";

    public static string BaseUrl =>
        Environment.GetEnvironmentVariable("TECHPHONE_BASE_URL")?.Trim().TrimEnd('/')
        ?? "http://localhost:5173";

    public static string TesterName =>
        Environment.GetEnvironmentVariable("TECHPHONE_TESTER")?.Trim()
        ?? "Tester";
}
