using NUnit.Framework;
using NUnit.Framework.Interfaces;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using ParabankAutoTests.Models;
using ParabankAutoTests.Pages;
using ParabankAutoTests.Utils;
using System;
using System.Collections.Generic;
using System.IO;

namespace ParabankAutoTests.Tests
{
    [Ignore("Đã test xong F2, tạm thời bỏ qua để chạy cái khác")]
    public class Test_AccountsOverview
    {
        private IWebDriver driver;
        private AccountsOverviewPage accountsPage;

        private TestCaseModel currentTestCase;

        // BIẾN MỚI: Dùng để lưu lại kết quả thực tế trên màn hình
        private string actualResultText = "";

        public static IEnumerable<TestCaseData> AccountsOverviewData()
        {
            return JsonReader.ReadTestData("AccountsOverviewPage.json");
        }

        [SetUp]
        public void Setup()
        {
            TestContext.WriteLine("=== [SETUP] KHỞI TẠO MÔI TRƯỜNG ===");
            TestContext.WriteLine("- Mở trình duyệt Chrome.");

            driver = new ChromeDriver();
            driver.Manage().Window.Maximize();

            driver.Manage().Timeouts().ImplicitWait = System.TimeSpan.FromSeconds(10);

            TestContext.WriteLine("- Truy cập trang Parabank.");
            driver.Navigate().GoToUrl("https://parabank.parasoft.com/parabank/index.htm");
            TestContext.WriteLine("- Thực hiện Login tiền quyết...");
            driver.FindElement(By.Name("username")).SendKeys("john");
            driver.FindElement(By.Name("password")).SendKeys("demo");
            driver.FindElement(By.XPath("//input[@value='Log In']")).Click();
            TestContext.WriteLine("- Login thành công, chuẩn bị vào bài Test.\n");

            accountsPage = new AccountsOverviewPage(driver);
        }

        [Test]
        [TestCaseSource(nameof(AccountsOverviewData))]
        public void RunAccountsOverviewTests(TestCaseModel testData)
        {
            // Reset lại biến thực tế cho mỗi lần chạy test case mới
            actualResultText = "";
            currentTestCase = testData;

            TestContext.WriteLine($"=== [THỰC THI] {testData.TestID} ===");
            TestContext.WriteLine($"* Tên Test: {testData.TestName}");
            TestContext.WriteLine($"* Hành động: {testData.Action}");
            TestContext.WriteLine($"* Kỳ vọng: {testData.ExpectedResult}");
            TestContext.WriteLine("--------------------------------------");

            switch (testData.TestID)
            {
                case "TC_F2.1":
                    TestContext.WriteLine("-> Click menu Accounts Overview...");
                    accountsPage.ClickMenuAccountsOverview();

                    TestContext.WriteLine("-> Đang đếm số lượng tài khoản trên lưới...");
                    int rowsCount = accountsPage.GetTotalAccountRows();
                    TestContext.WriteLine($"-> Thực tế: Có {rowsCount} tài khoản được hiển thị.");

                    // GHI LẠI KẾT QUẢ THỰC TẾ
                    actualResultText = $"Hệ thống hiển thị {rowsCount} tài khoản trên lưới.";

                    Assert.IsTrue(rowsCount > 0, "Bảng danh sách tài khoản trống!");
                    TestContext.WriteLine("=> PASS: Hiển thị lưới danh sách thành công.");
                    break;

                case "TC_F2.2":
                    TestContext.WriteLine("-> Click menu Accounts Overview...");
                    accountsPage.ClickMenuAccountsOverview();

                    TestContext.WriteLine("-> Đang lấy số dư của tài khoản đầu tiên...");
                    string firstBalance = accountsPage.GetFirstAccountBalance();
                    TestContext.WriteLine($"-> Thực tế: Số dư tài khoản đầu tiên là {firstBalance}");

                    // GHI LẠI KẾT QUẢ THỰC TẾ
                    actualResultText = $"Hệ thống hiển thị số dư tài khoản đầu tiên là: {firstBalance}";

                    Assert.IsNotEmpty(firstBalance, "Không lấy được số dư!");
                    Assert.IsTrue(firstBalance.Contains("$"), "Định dạng số dư không đúng (Thiếu dấu $)");

                    TestContext.WriteLine("=> PASS: Số dư hiển thị chính xác và đúng định dạng.");
                    break;

                case "TC_F2.3":
                    TestContext.WriteLine("-> Click menu Accounts Overview...");
                    accountsPage.ClickMenuAccountsOverview();

                    TestContext.WriteLine("-> Đang lấy thông tin Total Balance...");
                    string total = accountsPage.GetTotalBalanceText();
                    TestContext.WriteLine($"-> Thực tế: Total Balance đang là {total}");

                    // GHI LẠI KẾT QUẢ THỰC TẾ
                    actualResultText = $"Hệ thống tính toán Total Balance là: {total}";

                    Assert.IsNotEmpty(total, "Không hiển thị số dư Total Balance");
                    TestContext.WriteLine("=> PASS: Lấy được Total Balance hợp lệ.");
                    break;

                case "TC_F2.4":
                    TestContext.WriteLine("-> Click menu Accounts Overview...");
                    accountsPage.ClickMenuAccountsOverview();

                    TestContext.WriteLine("-> Click vào số tài khoản đầu tiên để xem chi tiết...");
                    accountsPage.ClickFirstAccountDetails();

                    string currentUrl = driver.Url;
                    TestContext.WriteLine($"-> Thực tế: Đã chuyển hướng tới URL: {currentUrl}");

                    // GHI LẠI KẾT QUẢ THỰC TẾ
                    actualResultText = $"Hệ thống chuyển hướng tới URL: {currentUrl}";

                    Assert.IsTrue(currentUrl.Contains("activity"), "Điều hướng tới trang Account Details thất bại");
                    TestContext.WriteLine("=> PASS: Điều hướng thành công.");
                    break;

                default:
                    Assert.Ignore($"Test case {testData.TestID} chưa được implement code Selenium.");
                    break;
            }
        }

        [TearDown]
        public void TearDown()
        {
            var status = TestContext.CurrentContext.Result.Outcome.Status;
            TestContext.WriteLine($"\n=== [KẾT QUẢ CUỐI CÙNG] Trạng thái: {status.ToString().ToUpper()} ===");

            string result = "";
            string screenshotPath = "";

            if (status == TestStatus.Failed)
            {
                result = "FAIL";
                // LẤY CÂU BÁO LỖI CỦA HỆ THỐNG NẾU TEST FAIL
                actualResultText = "Lỗi: " + TestContext.CurrentContext.Result.Message;

                try
                {
                    var screenshot = ((ITakesScreenshot)driver).GetScreenshot();
                    string screenshotDir = @"D:\dambaochatluong\Screenshots\";
                    Directory.CreateDirectory(screenshotDir);

                    screenshotPath = Path.Combine(screenshotDir, $"{currentTestCase.TestID}_{DateTime.Now:yyyyMMdd_HHmmss}.png");
                    screenshot.SaveAsFile(screenshotPath);
                    TestContext.WriteLine($"- Đã lưu ảnh chụp màn hình lỗi tại: {screenshotPath}");
                }
                catch (Exception ex)
                {
                    TestContext.WriteLine($"- Lỗi khi chụp màn hình: {ex.Message}");
                }
            }
            else if (status == TestStatus.Passed)
            {
                result = "PASS";
                // Nếu test pass mà chưa kịp ghi gì vào actualResultText, thì để câu mặc định
                if (string.IsNullOrEmpty(actualResultText))
                {
                    actualResultText = "Thực thi đúng như kỳ vọng (Không bắt được dữ liệu cụ thể).";
                }
            }

            // GHI DỮ LIỆU ĐỘNG VÀO EXCEL
            if (currentTestCase != null)
            {
                ExcelHelper.UpdateTestResult(
                    testId: currentTestCase.TestID,
                    status: result,
                    actualResult: actualResultText,
                    testerName: "Hào",
                    screenshotPath: screenshotPath
                );
                TestContext.WriteLine("- Đã xuất dữ liệu cập nhật vào file Excel Report.");
            }

            if (driver != null)
            {
                TestContext.WriteLine("- Đang đóng trình duyệt và dọn dẹp bộ nhớ...");
                driver.Quit();
                driver.Dispose();
                TestContext.WriteLine("=== HOÀN TẤT ===");
            }
        }
    }
}