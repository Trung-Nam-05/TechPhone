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
    public class Test_Register
    {
        private IWebDriver driver = null!;
        private RegisterPage registerPage = null!;
        private TestCaseModel currentTestCase = null!;
        private string actualResultText = "";

        [SetUp]
        public void SetupTest()
        {
            TestContext.WriteLine("=== [SETUP] KHỞI TẠO MÔI TRƯỜNG ===");

            driver = new ChromeDriver();
            driver.Manage().Window.Maximize();
            driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(5);

            // Mở trang chủ Parabank
            driver.Navigate().GoToUrl("https://parabank.parasoft.com/parabank/index.htm");
            registerPage = new RegisterPage(driver);
        }

        [Test, TestCaseSource(typeof(JsonReader), nameof(JsonReader.ReadTestData), new object[] { "RegisterPage.json" })]
        public void ExecuteRegisterTests(TestCaseModel testCase)
        {
            actualResultText = "";
            currentTestCase = testCase;
            TestContext.WriteLine($"=== [THỰC THI] {testCase.TestID} ===");

            // Điều hướng sang trang Register
            registerPage.ClickMenuRegister();

            switch (testCase.TestID)
            {
                case "TC_F1.1": // Đăng ký thành công
                    // KỸ THUẬT DYNAMIC DATA: Tạo username ngẫu nhiên bằng thời gian thực để tránh trùng lặp
                    string uniqueUser = "user_" + DateTime.Now.ToString("yyyyMMddHHmmss");

                    registerPage.FillRegistrationForm("Danh", "Nguyen", "123 Street", "HCM", "HCM", "70000", "0901234567", "12345", uniqueUser, "password123", "password123");
                    registerPage.ClickSubmit();

                    string welcomeTxt = registerPage.GetWelcomeTitle();
                    if (welcomeTxt.Contains("Welcome"))
                    {
                        actualResultText = $"Đăng ký thành công. Đã chuyển sang màn hình {welcomeTxt}";
                        Assert.Pass(actualResultText);
                    }
                    else
                    {
                        actualResultText = $"Lỗi: Không thấy thông báo Welcome. Lỗi văng ra: {registerPage.GetAllValidationErrors()}";
                        Assert.Fail(actualResultText);
                    }
                    break;

                case "TC_F1.2": // Để trống form
                    // Truyền chuỗi rỗng vào tất cả tham số
                    registerPage.FillRegistrationForm("", "", "", "", "", "", "", "", "", "", "");
                    registerPage.ClickSubmit();

                    string allErrors = registerPage.GetAllValidationErrors();
                    if (!string.IsNullOrEmpty(allErrors) && allErrors.Contains("is required"))
                    {
                        actualResultText = $"Hệ thống báo lỗi bắt buộc điền chuẩn xác: {allErrors}";
                        Assert.Pass(actualResultText);
                    }
                    else
                    {
                        actualResultText = "Bug Web: Không hiển thị đầy đủ thông báo lỗi cho các trường bắt buộc.";
                        Assert.Fail(actualResultText);
                    }
                    break;

                case "TC_F1.3": // Confirm Password không khớp
                    // Cố tình nhập pass 1 kiểu, confirm 1 kiểu
                    string tempUser = "user_" + DateTime.Now.ToString("HHmmss");
                    registerPage.FillRegistrationForm("Danh", "Nguyen", "123 Street", "HCM", "HCM", "70000", "0901234567", "12345", tempUser, "password123", "WRONG_PASS");
                    registerPage.ClickSubmit();

                    string passMismatchError = registerPage.GetPasswordMismatchError();
                    if (passMismatchError == "Passwords did not match.")
                    {
                        actualResultText = $"Hệ thống báo lỗi chuẩn: {passMismatchError}";
                        Assert.Pass(actualResultText);
                    }
                    else
                    {
                        actualResultText = "Lỗi: Không xuất hiện thông báo 'Passwords did not match' như kỳ vọng.";
                        Assert.Fail(actualResultText);
                    }
                    break;

                case "TC_F1.4": // Username đã tồn tại
                    // Cố tình dùng user "john" - tài khoản mặc định của Parabank
                    registerPage.FillRegistrationForm("Danh", "Nguyen", "123 Street", "HCM", "HCM", "70000", "0901234567", "12345", "john", "password123", "password123");
                    registerPage.ClickSubmit();

                    string userExistError = registerPage.GetUsernameExistsError();
                    if (userExistError == "This username already exists.")
                    {
                        actualResultText = $"Hệ thống báo lỗi chuẩn: {userExistError}";
                        Assert.Pass(actualResultText);
                    }
                    else
                    {
                        actualResultText = "Lỗi: Hệ thống không báo lỗi khi nhập Username đã tồn tại.";
                        Assert.Fail(actualResultText);
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