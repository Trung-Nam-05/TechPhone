using NUnit.Framework;
using NUnit.Framework.Interfaces;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using ParabankAutoTests.Models;
using ParabankAutoTests.Utils;
using System;
using System.Collections.Generic;
using System.IO;
using TH_CK_Test.Pages;

namespace ParabankAutoTests.Tests
{
    [Ignore("")]
    [TestFixture]
    public class Test_TransferFunds
    {
        private IWebDriver driver = null!;
        private TransferFundsPage transferPage = null!;
        private TestCaseModel currentTestCase = null!;
        private string actualResultText = "";

        public static IEnumerable<TestCaseData> TransferFundsData()
        {
            // Đọc dữ liệu từ file TransferFundsPage.json
            return JsonReader.ReadTestData("TransferFundsPage.json");
        }

        [SetUp]
        public void Setup()
        {
            driver = new ChromeDriver();
            driver.Manage().Window.Maximize();
            driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(10);

            // Login mặc định (như mẫu của bạn)
            driver.Navigate().GoToUrl("https://parabank.parasoft.com/parabank/index.htm");
            driver.FindElement(By.Name("username")).SendKeys("john");
            driver.FindElement(By.Name("password")).SendKeys("demo");
            driver.FindElement(By.XPath("//input[@value='Log In']")).Click();

            transferPage = new TransferFundsPage(driver);
        }

        [Test]
        [TestCaseSource(nameof(TransferFundsData))]
        public void RunTransferFundsTests(TestCaseModel testData)
        {
            currentTestCase = testData;
            actualResultText = "";
            transferPage.ClickMenuTransferFunds();

            switch (testData.TestID)
            {
                case "TC_F4.1": // Chuyển tiền thành công
                case "TC_F4.2": // Chuyển toàn bộ số dư (Tạm giả lập nhập số tiền hợp lệ)
                    transferPage.Transfer("100");
                    string title = transferPage.GetResultTitle();

                    if (title == "Transfer Complete!")
                    {
                        actualResultText = $"Kết quả: {title} - {transferPage.GetResultMessage()}";
                        Assert.Pass(actualResultText);
                    }
                    else
                    {
                        actualResultText = "Lỗi: Không hiển thị thông báo chuyển tiền thành công.";
                        Assert.Fail(actualResultText);
                    }
                    break;

                case "TC_F4.3": // Số âm
                case "TC_F4.4": // Ký tự đặc biệt/Chữ cái
                case "TC_F4.8": // Bỏ trống
                case "TC_F4.11": // XSS
                    // 1. Tự động chia giá trị input cho từng case
                    string input = testData.TestID switch
                    {
                        "TC_F4.3" => "-50",
                        "TC_F4.4" => "abc!@#",
                        "TC_F4.8" => "",
                        "TC_F4.11" => "<script>alert(1)</script>",
                        _ => ""
                    };

                    transferPage.Transfer(input);
                    string error = transferPage.GetErrorMessage();

                    // 2. Kiểm tra web có bắt lỗi không (Parabank hay bị lọt các lỗi này)
                    if (string.IsNullOrEmpty(error))
                    {
                        actualResultText = $"Bug Web: Hệ thống không báo lỗi khi nhập '{input}'";
                        Assert.Fail(actualResultText);
                    }
                    else
                    {
                        actualResultText = $"Hệ thống chặn đúng và báo lỗi: {error}";
                        Assert.Pass(actualResultText);
                    }
                    break;

                case "TC_F4.6": // Chuyển số tiền vượt Available Amount
                    transferPage.Transfer("9999999");

                    string overAmountError = transferPage.GetErrorMessage();

                    if (string.IsNullOrEmpty(overAmountError))
                    {
                        string successTitle = transferPage.GetResultTitle();
                        if (successTitle == "Transfer Complete!")
                        {
                            actualResultText = "Bug Web: Hệ thống cho phép chuyển tiền vượt quá số dư (Gây âm tài khoản).";
                            Assert.Fail(actualResultText); // Ép Fail vì web sai logic
                        }
                        else
                        {
                            actualResultText = "Web không báo lỗi cũng không báo thành công.";
                            Assert.Fail(actualResultText);
                        }
                    }
                    else
                    {
                        actualResultText = $"Hệ thống đã chặn đúng kỳ vọng và báo lỗi: {overAmountError}";
                        Assert.Pass(actualResultText);
                    }
                    break;

                case "TC_F4.7": // From Account trùng To Account
                    transferPage.Transfer("10", 0, 0); // Chọn index 0 cho cả 2 dropdown (cùng 1 tài khoản)

                    string sameAccError = transferPage.GetErrorMessage();

                    if (string.IsNullOrEmpty(sameAccError))
                    {
                        string successTitleSameAcc = transferPage.GetResultTitle();
                        if (successTitleSameAcc == "Transfer Complete!")
                        {
                            actualResultText = "Bug Web: Hệ thống cho phép chuyển tiền cho chính mình.";
                            Assert.Fail(actualResultText);
                        }
                        else
                        {
                            actualResultText = "Web không có phản hồi chặn lỗi rõ ràng.";
                            Assert.Fail(actualResultText);
                        }
                    }
                    else
                    {
                        actualResultText = $"Thông báo lỗi chuẩn: {sameAccError}";
                        Assert.Pass(actualResultText);
                    }
                    break;

                default:
                    Assert.Ignore($"Chưa cấu hình code cho case {testData.TestID}");
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
                    var ts = (ITakesScreenshot)driver;
                    string path = @"D:\dambaochatluong\Screenshots\";
                    Directory.CreateDirectory(path);
                    screenshotPath = Path.Combine(path, $"{currentTestCase.TestID}.png");
                    ts.GetScreenshot().SaveAsFile(screenshotPath);
                }
                catch { }
            }

            if (currentTestCase != null)
            {
                ExcelHelper.UpdateTestResult(currentTestCase.TestID, result, actualResultText, "Danh", screenshotPath);
            }

            // CÁCH SỬA NUnit1032: Thêm Dispose() để dọn dẹp bộ nhớ
            if (driver != null)
            {
                driver.Quit();    // Đóng trình duyệt
                driver.Dispose(); // Giải phóng tài nguyên khỏi RAM
            }
        }
    }
}