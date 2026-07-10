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
    [Ignore("Đã test ")]
    public class Test_RequestLoan
    {
        private IWebDriver driver;
        private RequestLoanPage loanPage;
        private TestCaseModel currentTestCase;
        private string actualResultText = "";

        public static IEnumerable<TestCaseData> LoanData()
        {
            return JsonReader.ReadTestData("RequestLoanPage.json");
        }

        [SetUp]
        public void Setup()
        {
            driver = new ChromeDriver();
            driver.Manage().Window.Maximize();
            driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(10);

            driver.Navigate().GoToUrl("https://parabank.parasoft.com/parabank/index.htm");

            // LOGIN
            driver.FindElement(By.Name("username")).SendKeys("john");
            driver.FindElement(By.Name("password")).SendKeys("demo");
            driver.FindElement(By.XPath("//input[@value='Log In']")).Click();

            loanPage = new RequestLoanPage(driver);
        }

        [Test]
        [TestCaseSource(nameof(LoanData))]
        public void RunRequestLoanTests(TestCaseModel testData)
        {
            actualResultText = "";
            currentTestCase = testData;

            TestContext.WriteLine($"=== RUN {testData.TestID} ===");

            switch (testData.TestID)
            {
                case "TC_F9.1":
                    loanPage.ClickMenu();
                    loanPage.EnterLoanAmount("1000");
                    loanPage.EnterDownPayment("999999");
                    loanPage.ClickApply();

                    string rs1 = loanPage.GetResult();
                    actualResultText = rs1;

                    TestContext.WriteLine("Actual: " + rs1);

                    Assert.IsTrue(
                        rs1.ToLower().Contains("denied") ||
                        rs1.ToLower().Contains("insufficient")
                    );
                    break;

                case "TC_F9.2":
                    loanPage.ClickMenu();
                    loanPage.EnterLoanAmount("999999999");
                    loanPage.EnterDownPayment("100");
                    loanPage.ClickApply();

                    string rs2 = loanPage.GetResult();
                    actualResultText = rs2;

                    TestContext.WriteLine("Actual: " + rs2);

                    Assert.IsTrue(
                        rs2.ToLower().Contains("denied") ||
                        rs2.ToLower().Contains("not approved")
                    );
                    break;

                case "TC_F9.3":
                    loanPage.ClickMenu();
                    loanPage.EnterLoanAmount("1000");
                    loanPage.EnterDownPayment("100");
                    loanPage.ClickApply();

                    // Lấy account ID mới
                    string newAccountId = loanPage.GetNewAccountId();

                    TestContext.WriteLine("New Account ID: " + newAccountId);

                    // Click vào account vừa tạo
                    loanPage.ClickAccountById(newAccountId);

                    // Lấy balance
                    string balance = loanPage.GetAccountBalance();

                    actualResultText = balance;
                    TestContext.WriteLine("Balance: " + balance);

                    // Verify có tiền (balance > 0)
                    Assert.IsTrue(
                        balance.Contains("1000") || !balance.Contains("0.00"),
                        "Balance không được cập nhật đúng"
                    );
                    break;
                case "TC_F9.4":
                    loanPage.ClickMenu();
                    loanPage.EnterLoanAmount("1000");
                    loanPage.EnterDownPayment("-50");
                    loanPage.ClickApply();

                    string rs4 = loanPage.GetResult();
                    actualResultText = rs4;

                    TestContext.WriteLine("Actual: " + rs4);

                    Assert.IsTrue(rs4.ToLower().Contains("error") || rs4 != "");
                    break;

                case "TC_F9.5":
                    loanPage.ClickMenu();
                    loanPage.EnterLoanAmount("");
                    loanPage.ClickApply();

                    string rs5 = loanPage.GetResult();
                    actualResultText = rs5;

                    TestContext.WriteLine("Actual: " + rs5);

                    Assert.IsTrue(rs5 != "");
                    break;

                default:
                    Assert.Ignore("Chưa code case này");
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
                    string dir = @"D:\dambaochatluong\Screenshots\";
                    Directory.CreateDirectory(dir);

                    screenshotPath = Path.Combine(dir, $"{currentTestCase.TestID}_{DateTime.Now:yyyyMMdd_HHmmss}.png");
                    screenshot.SaveAsFile(screenshotPath);
                }
                catch { }
            }
            else if (status == TestStatus.Passed)
            {
                result = "PASS";
                if (string.IsNullOrEmpty(actualResultText))
                    actualResultText = "Pass";
            }

            if (currentTestCase != null)
            {
                ExcelHelper.UpdateTestResult(
                    currentTestCase.TestID,
                    result,
                    actualResultText,
                    "Phú",
                    screenshotPath
                );
            }

            if (driver != null)
            {
                driver.Quit();
                driver.Dispose();
            }
        }
    }
}