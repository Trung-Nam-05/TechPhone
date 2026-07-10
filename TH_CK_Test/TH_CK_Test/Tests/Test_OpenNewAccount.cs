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
using System.Threading;
using TH_CK_Test.Pages;

namespace ParabankAutoTests.Tests
{
    [Ignore("")]
    public class Test_OpenNewAccount
    {
        private IWebDriver driver;
        private OpenNewAccountPage openAccPage;
        private TestCaseModel currentTestCase;
        private string actualResultText = "";

        public static IEnumerable<TestCaseData> OpenNewAccountData()
        {
            // Đảm bảo bạn đã có file OpenNewAccountPage.json trong thư mục TestData nhé
            return JsonReader.ReadTestData("OpenNewAccountPage.json");
        }

        [SetUp]
        public void Setup()
        {
            TestContext.WriteLine("=== [SETUP] KHỞI TẠO MÔI TRƯỜNG ===");
            driver = new ChromeDriver();
            driver.Manage().Window.Maximize();
            driver.Manage().Timeouts().ImplicitWait = System.TimeSpan.FromSeconds(10);

            driver.Navigate().GoToUrl("https://parabank.parasoft.com/parabank/index.htm");
            driver.FindElement(By.Name("username")).SendKeys("john");
            driver.FindElement(By.Name("password")).SendKeys("demo");
            driver.FindElement(By.XPath("//input[@value='Log In']")).Click();

            openAccPage = new OpenNewAccountPage(driver);
        }

        [Test]
        [TestCaseSource(nameof(OpenNewAccountData))]
        public void RunOpenNewAccountTests(TestCaseModel testData)
        {
            actualResultText = "";
            currentTestCase = testData;

            TestContext.WriteLine($"=== [THỰC THI] {testData.TestID} ===");

            switch (testData.TestID)
            {
                case "TC_F3.1": // Mở Savings
                    openAccPage.ClickMenuOpenNewAccount();
                    openAccPage.SelectAccountType("SAVINGS");
                    openAccPage.ClickSubmit();

                    // Bắt đầu đọc dữ liệu trên màn hình
                    string title1 = openAccPage.GetResultTitle();
                    string newId1 = openAccPage.GetNewAccountNumber();

                    // THÊM DÒNG NÀY: Ngó xem web có đang văng câu báo lỗi đỏ nào không
                    string error1 = openAccPage.GetErrorMessage();

                    if (!string.IsNullOrEmpty(error1))
                    {
                        // Nếu có lỗi, ghi thẳng lỗi vào Excel và đánh Fail
                        actualResultText = $"Web bị sập văng lỗi: {error1}";
                        Assert.Fail(actualResultText);
                    }
                    else
                    {
                        // Nếu không có lỗi thì kiểm tra như bình thường
                        actualResultText = $"Hệ thống báo: '{title1}'. Số tài khoản mới sinh ra là: {newId1}";
                        Assert.AreEqual("Account Opened!", title1, "Không thấy thông báo thành công!");
                        Assert.IsNotEmpty(newId1, "Không sinh được số tài khoản mới");
                    }
                    break;

                case "TC_F3.2": // Mở Checking
                    openAccPage.ClickMenuOpenNewAccount();
                    openAccPage.SelectAccountType("CHECKING");
                    openAccPage.ClickSubmit();

                    string title2 = openAccPage.GetResultTitle();
                    string newId2 = openAccPage.GetNewAccountNumber();

                    // THÊM DÒNG NÀY tương tự như trên
                    string error2 = openAccPage.GetErrorMessage();

                    if (!string.IsNullOrEmpty(error2))
                    {
                        actualResultText = $"Web bị sập văng lỗi: {error2}";
                        Assert.Fail(actualResultText);
                    }
                    else
                    {
                        actualResultText = $"Hệ thống báo: '{title2}'. Số TK mới sinh ra là: {newId2}";
                        Assert.AreEqual("Account Opened!", title2, "Không thấy thông báo thành công!");
                        Assert.IsNotEmpty(newId2, "Không sinh được số tài khoản mới");
                    }
                    break;

                case "TC_F3.3": // Kiểm tra xuất hiện trong Overview
                    // Bước 1: Tạo tài khoản mới trước
                    openAccPage.ClickMenuOpenNewAccount();
                    openAccPage.ClickSubmit();
                    string newId3 = openAccPage.GetNewAccountNumber();

                    // Bước 2: Nhảy sang trang Overview check xem có ID này chưa
                    driver.FindElement(By.LinkText("Accounts Overview")).Click();
                    Thread.Sleep(1000); // Chờ load bảng

                    // Tìm số tài khoản trong toàn bộ text của trang
                    bool isExist = driver.PageSource.Contains(newId3);
                    actualResultText = isExist ? $"Số tài khoản mới ({newId3}) ĐÃ XUẤT HIỆN trong bảng Accounts Overview." : $"KHÔNG TÌM THẤY số {newId3} trong bảng.";

                    Assert.IsTrue(isExist, "Tài khoản mới tạo không xuất hiện trong lưới Accounts Overview!");
                    break;

                case "TC_F3.5": // Không đủ tiền (ParaBank cho tiền âm nên case này sẽ Fail - Bắt đúng logic)
                    openAccPage.ClickMenuOpenNewAccount();
                    openAccPage.ClickSubmit();

                    string errorMsg = openAccPage.GetErrorMessage();
                    if (string.IsNullOrEmpty(errorMsg))
                    {
                        actualResultText = "Bug Web: Hệ thống vẫn cho mở tài khoản dù không đủ tiền (Không có thông báo lỗi).";
                        Assert.Fail(actualResultText); // Đánh fail ép buộc
                    }
                    else
                    {
                        actualResultText = $"Hệ thống báo lỗi đúng: {errorMsg}";
                    }
                    break;

                case "TC_F3.9": // From Account rỗng (Giả lập Inspect HTML xóa option)
                    openAccPage.ClickMenuOpenNewAccount();

                    // Dùng JS để can thiệp xóa các lựa chọn dropdown
                    IJavaScriptExecutor js = (IJavaScriptExecutor)driver;
                    js.ExecuteScript("document.getElementById('fromAccountId').innerHTML = '<option value=\"\">Select</option>';");

                    openAccPage.ClickSubmit();

                    string errorEmpty = openAccPage.GetErrorMessage();
                    actualResultText = string.IsNullOrEmpty(errorEmpty) ? "Hệ thống sập/Lỗi không bắt validation rỗng" : $"Báo lỗi: {errorEmpty}";

                    Assert.IsNotEmpty(errorEmpty, "Không có thông báo lỗi khi From Account rỗng!");
                    break;

                default:
                    Assert.Ignore($"Chưa code cho case {testData.TestID}");
                    break;
            }
        }

        [TearDown]
        public void TearDown()
        {
            var status = TestContext.CurrentContext.Result.Outcome.Status;
            string result = "";
            string screenshotPath = "";

            if (status == TestStatus.Failed)
            {
                result = "FAIL";
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
            else if (status == TestStatus.Passed)
            {
                result = "PASS";
                if (string.IsNullOrEmpty(actualResultText)) actualResultText = "Pass đúng kỳ vọng.";
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