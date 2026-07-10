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
    public class Test_BillPay
    {
        private IWebDriver driver = null!;
        private BillPayPage billPayPage = null!;
        private TestCaseModel currentTestCase = null!;
        private string actualResultText = "";

        [SetUp]
        public void SetupTest()
        {
            driver = new ChromeDriver();
            driver.Manage().Window.Maximize();
            driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(5);

            driver.Navigate().GoToUrl("https://parabank.parasoft.com/parabank/index.htm");
            driver.FindElement(By.Name("username")).SendKeys("john");
            driver.FindElement(By.Name("password")).SendKeys("demo");
            driver.FindElement(By.XPath("//input[@value='Log In']")).Click();

            // Nhớ đợi 2s để web login kịp nhé
            System.Threading.Thread.Sleep(2000);

            billPayPage = new BillPayPage(driver);
        }

        [Test, TestCaseSource(typeof(JsonReader), nameof(JsonReader.ReadTestData), new object[] { "BillPayPage.json" })]
        public void ExecuteBillPayTests(TestCaseModel testCase)
        {
            actualResultText = "";
            currentTestCase = testCase;

            billPayPage.ClickMenuBillPay();

            switch (testCase.TestID)
            {
                case "TC_F5.1":
                case "TC_F5.4":
                    billPayPage.FillBillPayForm("Điện lực EVN", "123 Street", "HCM", "HCM", "70000", "0901234567", "123456", "123456", "50");
                    billPayPage.ClickSendPayment();

                    string title = billPayPage.GetSuccessTitle();
                    if (title == "Bill Payment Complete")
                    {
                        string msg = billPayPage.GetSuccessMessage();
                        actualResultText = $"Giao dịch thành công. Lời nhắn: '{msg}'";
                        Assert.Pass(actualResultText);
                    }
                    else
                    {
                        actualResultText = "Không hiển thị biên lai thanh toán (billpayResult) thành công.";
                        Assert.Fail(actualResultText);
                    }
                    break;

                case "TC_F5.2":
                    billPayPage.FillBillPayForm("", "", "HCM", "HCM", "70000", "0901234567", "123456", "123456", "50");
                    billPayPage.ClickSendPayment();

                    if (billPayPage.HasValidationErrors())
                    {
                        actualResultText = $"Hệ thống báo lỗi bắt buộc điền: {billPayPage.GetAllErrorText()}";
                        Assert.Pass(actualResultText);
                    }
                    else
                    {
                        actualResultText = "Bug Web: Hệ thống cho phép thanh toán khi bỏ trống Payee Name và Address.";
                        Assert.Fail(actualResultText);
                    }
                    break;

                case "TC_F5.3":
                    billPayPage.FillBillPayForm("Tiền Nước", "123 Street", "HCM", "HCM", "70000", "0901234567", "123456", "123456", "9999999");
                    billPayPage.ClickSendPayment();

                    if (billPayPage.GetSuccessTitle() == "Bill Payment Complete")
                    {
                        actualResultText = "Bug Web: Hệ thống cho phép thanh toán vượt quá số dư (Gây âm tài khoản).";
                        Assert.Fail(actualResultText);
                    }
                    else
                    {
                        actualResultText = "Hệ thống đã chặn đúng kỳ vọng và báo lỗi không đủ tiền.";
                        Assert.Pass(actualResultText);
                    }
                    break;

                case "TC_F5.5":
                    billPayPage.FillBillPayForm("Internet VNPT", "123 Street", "HCM", "HCM", "70000", "0901234567", "123456", "654321", "50");
                    billPayPage.ClickSendPayment();

                    string errText = billPayPage.GetAllErrorText();
                    if (errText.ToLower().Contains("mismatch") || errText.ToLower().Contains("do not match"))
                    {
                        actualResultText = $"Hệ thống báo lỗi Mismatch chuẩn: {errText}";
                        Assert.Pass(actualResultText);
                    }
                    else if (billPayPage.GetSuccessTitle() == "Bill Payment Complete")
                    {
                        actualResultText = "Bug Web: Hệ thống vẫn cho thanh toán dù Account và Verify Account không khớp.";
                        Assert.Fail(actualResultText);
                    }
                    else
                    {
                        actualResultText = "Không thấy thông báo lỗi Mismatch rõ ràng.";
                        Assert.Fail(actualResultText);
                    }
                    break;

                case "TC_F5.7":
                    billPayPage.FillBillPayForm("Tiền Rác", "123 Street", "HCM", "HCM", "70000", "0901234567", "123456", "123456", "-100");
                    billPayPage.ClickSendPayment();

                    if (billPayPage.GetSuccessTitle() == "Bill Payment Complete")
                    {
                        actualResultText = "Bug Web: Hệ thống cho phép thanh toán số tiền ÂM.";
                        Assert.Fail(actualResultText);
                    }
                    else
                    {
                        actualResultText = $"Hệ thống chặn đúng kỳ vọng: {billPayPage.GetAllErrorText()}";
                        Assert.Pass(actualResultText);
                    }
                    break;

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
                ExcelHelper.UpdateTestResult(currentTestCase.TestID, result, actualResultText, "Hào", screenshotPath);
            }

            if (driver != null)
            {
                driver.Quit();
                driver.Dispose();
            }
        }
    }
}