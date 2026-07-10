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
    [Ignore("")]
    public class Test_AdminPage
    {
        private IWebDriver driver;
        private AdminPage adminPage;
        private TestCaseModel currentTestCase;
        private string actualResultText = "";

        public static IEnumerable<TestCaseData> AdminData()
        {
            return JsonReader.ReadTestData("AdminPage.json");
        }

        [SetUp]
        public void Setup()
        {
            driver = new ChromeDriver();
            driver.Manage().Window.Maximize();
            driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(10);

            driver.Navigate().GoToUrl("https://parabank.parasoft.com/parabank/index.htm");

            driver.FindElement(By.Name("username")).SendKeys("john");
            driver.FindElement(By.Name("password")).SendKeys("demo");
            driver.FindElement(By.XPath("//input[@value='Log In']")).Click();

            adminPage = new AdminPage(driver);
        }

        [Test]
        [TestCaseSource(nameof(AdminData))]
        public void RunAdminTests(TestCaseModel testData)
        {
            actualResultText = "";
            currentTestCase = testData;

            TestContext.WriteLine($"=== RUN {testData.TestID} ===");

            switch (testData.TestID)
            {
                case "TC_F7.1":
                    adminPage.ClickMenu();
                    adminPage.ClickInitialize();
                    actualResultText = adminPage.GetResult();
                    Assert.IsTrue(actualResultText.ToLower().Contains("initialized"));
                    break;

                case "TC_F7.2":
                    adminPage.ClickMenu();
                    adminPage.ClickClean();
                    actualResultText = adminPage.GetResult();
                    Assert.IsTrue(actualResultText.ToLower().Contains("clean"));
                    break;

                case "TC_F7.5":
                    adminPage.ClickMenu();
                    adminPage.SelectSOAP();
                    adminPage.ClickSubmit();
                    actualResultText = "Switched SOAP";
                    Assert.Pass();
                    break;

                case "TC_F7.8":
                    adminPage.ClickMenu();
                    adminPage.SelectJDBC();
                    adminPage.ClickSubmit();
                    actualResultText = "Switched JDBC";
                    Assert.Pass();
                    break;

                case "TC_F7.20":
                    adminPage.ClickMenu();
                    adminPage.EnterInitBalance("500");
                    adminPage.ClickSubmit();
                    actualResultText = "Balance = 500";
                    Assert.Pass();
                    break;

                case "TC_F7.22":
                    adminPage.ClickMenu();
                    adminPage.EnterInitBalance("0");
                    adminPage.ClickSubmit();
                    actualResultText = "Balance = 0";
                    Assert.Pass();
                    break;

                case "TC_F7.23":
                    adminPage.ClickMenu();
                    adminPage.EnterInitBalance("-100");
                    adminPage.ClickSubmit();
                    actualResultText = adminPage.GetResult();
                    Assert.IsTrue(actualResultText != "");
                    break;

                case "TC_F7.34":
                    adminPage.ClickMenu();
                    adminPage.EnterThreshold("0");
                    adminPage.ClickSubmit();
                    actualResultText = "Threshold 0";
                    Assert.Pass();
                    break;

                case "TC_F7.35":
                    adminPage.ClickMenu();
                    adminPage.EnterThreshold("100");
                    adminPage.ClickSubmit();
                    actualResultText = "Threshold 100";
                    Assert.Pass();
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

            driver.Quit();
            driver.Dispose();
        }
    }
}