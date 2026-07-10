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
   // [Ignore("")]
    [TestFixture]
    public class Test_Authentication
    {
        private IWebDriver driver = null!;
        private LoginPage loginPage = null!;
        private TestCaseModel currentTestCase = null!;
        private string actualResultText = "";

        [SetUp]
        public void SetupTest()
        {
            driver = new ChromeDriver();
            driver.Manage().Window.Maximize();
            driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(5);

            // CHỈ MỞ TRANG CHỦ, KHÔNG ĐĂNG NHẬP SẴN
            driver.Navigate().GoToUrl("https://parabank.parasoft.com/parabank/index.htm");
            loginPage = new LoginPage(driver);
        }

        [Test, TestCaseSource(typeof(JsonReader), nameof(JsonReader.ReadTestData), new object[] { "LoginPage.json" })]
        public void ExecuteLoginTests(TestCaseModel testCase)
        {
            actualResultText = "";
            currentTestCase = testCase;

            switch (testCase.TestID)
            {
                case "TC_F1.6": // Đăng nhập thành công
                    // Điền user và pass có sẵn trong database test của Parabank
                    loginPage.Login("john", "demo");

                    if (loginPage.IsAccountsOverviewDisplayed())
                    {
                        actualResultText = "Đăng nhập thành công, đã chuyển sang trang Accounts Overview.";
                        Assert.Pass(actualResultText);
                    }
                    else
                    {
                        actualResultText = "Không chuyển hướng vào được trang Accounts Overview.";
                        Assert.Fail(actualResultText);
                    }
                    break;

                case "TC_F1.7": // Sai mật khẩu
                    loginPage.Login("john", "wrongpass123");
                    CheckLoginError("Sai mật khẩu");
                    break;

                case "TC_F1.8": // User không tồn tại
                    loginPage.Login("ghost_user_999", "123456");
                    CheckLoginError("User không tồn tại");
                    break;

                case "TC_F1.9": // Để trống user/pass
                    loginPage.Login("", "");
                    CheckLoginError("Bỏ trống trường đăng nhập");
                    break;

                case "TC_F1.10": // Quên thông tin
                    loginPage.ClickForgotLoginInfo();

                    // Điền thông tin chuẩn của user "john"
                    loginPage.FillForgotInfoForm("John", "Smith", "123 Street", "City", "State", "12345", "123-45-678");

                    string forgotResult = loginPage.GetForgotInfoResultMessage();
                    if (forgotResult.ToLower().Contains("your login information was located"))
                    {
                        actualResultText = "Đã tìm thấy và hiển thị thông tin đăng nhập thành công.";
                        Assert.Pass(actualResultText);
                    }
                    else
                    {
                        actualResultText = $"Lỗi: Thông báo trả về không đúng kỳ vọng. Actual: {forgotResult}";
                        Assert.Fail(actualResultText);
                    }
                    break;

                case "TC_F1.11": // Đăng xuất
                    // Phải login thành công trước thì mới có nút Logout để bấm
                    loginPage.Login("john", "demo");

                    loginPage.ClickLogout();

                    if (loginPage.IsLoginFormDisplayed())
                    {
                        actualResultText = "Đăng xuất thành công, đã hiển thị lại form đăng nhập bên tay trái.";
                        Assert.Pass(actualResultText);
                    }
                    else
                    {
                        actualResultText = "Đăng xuất thất bại, form Login không xuất hiện.";
                        Assert.Fail(actualResultText);
                    }
                    break;

                default:
                    Assert.Ignore($"Chưa code cho case {testCase.TestID}");
                    break;
            }
        }

        // Hàm phụ trợ để tái sử dụng logic kiểm tra lỗi login
        private void CheckLoginError(string context)
        {
            string error = loginPage.GetErrorMessage();
            if (string.IsNullOrEmpty(error))
            {
                actualResultText = $"Bug Web ({context}): Hệ thống không báo lỗi xác thực!";
                Assert.Fail(actualResultText);
            }
            else
            {
                actualResultText = $"Hệ thống báo lỗi chuẩn: {error}";
                Assert.Pass(actualResultText);
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
                ExcelHelper.UpdateTestResult(currentTestCase.TestID, result, actualResultText, "Duy", screenshotPath);
            }

            if (driver != null)
            {
                driver.Quit();
                driver.Dispose();
            }
        }
    }
}