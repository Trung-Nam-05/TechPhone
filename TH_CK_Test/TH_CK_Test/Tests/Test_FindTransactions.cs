using NUnit.Framework;
using NUnit.Framework.Interfaces;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using ParabankAutoTests.Models;
using ParabankAutoTests.Pages;
using ParabankAutoTests.Utils;
using System;
using System.IO;

namespace ParabankAutoTests.Tests
{
    [Ignore("")]
    [TestFixture]
    public class Test_FindTransactions
    {
        // FIX: Thêm = null! để tắt cảnh báo CS8618
        private IWebDriver driver = null!;
        private FindTransactionsPage findTxPage = null!;
        private TestCaseModel currentTestCase = null!;
        private string actualResultText = "";

        [SetUp]
        public void SetupTest()
        {
            TestContext.WriteLine("=== [SETUP] KHỞI TẠO MÔI TRƯỜNG & ĐĂNG NHẬP ===");

            driver = new ChromeDriver();
            driver.Manage().Window.Maximize();
            driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(5);

            // 1. Mở trang chủ & Login
            driver.Navigate().GoToUrl("https://parabank.parasoft.com/parabank/index.htm");
            driver.FindElement(By.Name("username")).SendKeys("john");
            driver.FindElement(By.Name("password")).SendKeys("demo");
            driver.FindElement(By.XPath("//input[@value='Log In']")).Click();

            // 2. Vào trang Find Transactions
            driver.Navigate().GoToUrl("https://parabank.parasoft.com/parabank/findtrans.htm");
            findTxPage = new FindTransactionsPage(driver);
        }

        [Test, TestCaseSource(typeof(JsonReader), nameof(JsonReader.ReadTestData), new object[] { "FindTransactionsPage.json" })]
        public void ExecuteFindTransactionsTests(TestCaseModel testCase)
        {
            actualResultText = "";
            currentTestCase = testCase;
            TestContext.WriteLine($"=== [THỰC THI] {testCase.TestID} ===");

            // FIX: Thay vì hardcode "13011", tự động chọn tài khoản đầu tiên có trong dropdown
            findTxPage.SelectAccountByIndex(0);

            switch (testCase.TestID)
            {
                case "TC_F6.1":
                    // LƯU Ý: Nếu ID này không tồn tại thật, count1 sẽ = 0 và Assert.Fail. 
                    // Tốt nhất bạn nên sửa "14920" thành một ID có thật lúc chạy test.
                    findTxPage.FindByTransactionId("14920");
                    int count1 = findTxPage.GetTransactionResultsCount();
                    actualResultText = $"Tìm thấy {count1} giao dịch";
                    Assert.That(count1, Is.GreaterThanOrEqualTo(1), "Không tìm thấy giao dịch nào (Có thể ID này không tồn tại).");
                    break;

                case "TC_F6.2":
                    findTxPage.FindByDate("03-24-2026");
                    int count2 = findTxPage.GetTransactionResultsCount();
                    actualResultText = $"Tìm thấy {count2} giao dịch";
                    Assert.That(count2, Is.GreaterThanOrEqualTo(1), "Không tìm thấy giao dịch nào trong ngày này.");
                    break;

                case "TC_F6.3":
                    findTxPage.FindByAmount("10");
                    int count3 = findTxPage.GetTransactionResultsCount();
                    actualResultText = $"Tìm thấy {count3} giao dịch";
                    Assert.That(count3, Is.GreaterThanOrEqualTo(1), "Không tìm thấy giao dịch với Amount này.");
                    break;

                case "TC_F6.4": // Tìm ID không tồn tại
                    findTxPage.FindByTransactionId("99999999");
                    actualResultText = findTxPage.GetResultMessage();

                    if (string.IsNullOrEmpty(actualResultText))
                    {
                        Assert.Fail("Bug: Hệ thống không hiển thị thông báo lỗi khi không tìm thấy giao dịch.");
                    }
                    else
                    {
                        Assert.That(actualResultText.ToLower(), Does.Contain("error").Or.Contain("not found").Or.Contain("no transactions"), "Thiếu thông báo lỗi khi không tìm thấy.");
                    }
                    break;

                case "TC_F6.5": // Ký tự đặc biệt vào ID
                    findTxPage.FindByTransactionId("ID@123");
                    actualResultText = findTxPage.GetResultMessage();
                    Assert.That(actualResultText, Is.Not.Empty, "Lỗi Bug: Hệ thống không chặn ký tự đặc biệt ở ô Transaction ID.");
                    break;

                case "TC_F6.6": // Sai định dạng ngày
                    findTxPage.FindByDate("31-12-2023");
                    actualResultText = findTxPage.GetResultMessage();
                    Assert.That(actualResultText, Is.Not.Empty, "Lỗi Bug: Hệ thống không báo lỗi khi nhập sai định dạng ngày (MM-dd-yyyy).");
                    break;

                // FIX: Thêm default case
                default:
                    Assert.Ignore($"Chưa cấu hình code cho case {testCase.TestID}");
                    break;
            }
        }

        [TearDown]
        public void TearDown()
        {
            var status = TestContext.CurrentContext.Result.Outcome.Status;
            string result = (status == TestStatus.Passed) ? "PASS" : "FAIL";
            string screenshotPath = "";

            if (status == TestStatus.Failed)
            {
                actualResultText = "Lỗi: " + TestContext.CurrentContext.Result.Message;
                try
                {
                    var screenshot = ((ITakesScreenshot)driver).GetScreenshot();
                    string screenshotDir = @"D:\dambaochatluong\Screenshots\";
                    Directory.CreateDirectory(screenshotDir);
                    screenshotPath = Path.Combine(screenshotDir, $"{currentTestCase.TestID}_{DateTime.Now:yyyyMMdd_HHmmss}.png");
                    screenshot.SaveAsFile(screenshotPath);
                }
                catch { }
            }
            else if (status == TestStatus.Passed && string.IsNullOrEmpty(actualResultText))
            {
                actualResultText = "Pass đúng kỳ vọng.";
            }

            if (currentTestCase != null)
            {
                // Chú ý: Ở file này bạn đang dùng "Nguyễn" thay vì "Danh"
                ExcelHelper.UpdateTestResult(currentTestCase.TestID, result, actualResultText, "Danh", screenshotPath);
            }

            if (driver != null)
            {
                driver.Quit();
                driver.Dispose();
            }
        }
    }
}