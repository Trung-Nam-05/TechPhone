using DocumentFormat.OpenXml.Bibliography;
using OpenQA.Selenium;
using System;

namespace ParabankAutoTests.Pages
{
    public class RequestLoanPage
    {
        private IWebDriver _driver;

        // ===== LOCATOR =====
        private By menuRequestLoan = By.LinkText("Request Loan");
        private By loanAmount = By.Id("amount");
        private By downPayment = By.Id("downPayment");
        private By btnApply = By.XPath("//input[@value='Apply Now']");

        // 🔥 FIX QUAN TRỌNG: lấy toàn bộ kết quả trong rightPanel
        private By resultPanel = By.Id("rightPanel");

        public RequestLoanPage(IWebDriver driver)
        {
            _driver = driver;
        }

        // ===== ACTION =====
        public void ClickMenu()
        {
            _driver.FindElement(menuRequestLoan).Click();
            System.Threading.Thread.Sleep(2000); // chờ load
        }

        public void EnterLoanAmount(string value)
        {
            var e = _driver.FindElement(loanAmount);
            e.Clear();
            e.SendKeys(value);
        }

        public void EnterDownPayment(string value)
        {
            var e = _driver.FindElement(downPayment);
            e.Clear();
            e.SendKeys(value);
        }
        public string GetNewAccountId()
        {
            return _driver.FindElement(By.Id("newAccountId")).Text;
        }

        public void ClickAccountById(string accountId)
        {
            _driver.FindElement(By.LinkText(accountId)).Click();
        }

        public string GetAccountBalance()
        {
            return _driver.FindElement(By.Id("balance")).Text;
        }
        public void ClickApply()
        {
            _driver.FindElement(btnApply).Click();
            System.Threading.Thread.Sleep(2000); // 🔥 chờ kết quả hiện ra
        }

        // ===== GET RESULT =====
        public string GetResult()
        {
            try
            {
                return _driver.FindElement(resultPanel).Text;
            }
            catch
            {
                return "";
            }
        }
    }
}