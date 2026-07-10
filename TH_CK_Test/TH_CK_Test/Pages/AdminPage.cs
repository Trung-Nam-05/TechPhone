using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using System;
using System.Threading;

namespace ParabankAutoTests.Pages
{
    public class AdminPage
    {
        // ❗ FIX: Thêm = null! để tắt cảnh báo Visual Studio
        private readonly IWebDriver _driver = null!;

        // ===== LOCATOR =====
        private By menuAdmin = By.LinkText("Admin Page");

        private By btnInitialize = By.XPath("//button[@value='INIT' or contains(text(), 'nitialize')] | //input[@value='INIT' or contains(@value, 'nitialize') or contains(@value, 'NITIALIZE')]");
        // Data Access Mode
        private By radioSOAP = By.XPath("//input[@value='soap']");
        private By radioJDBC = By.XPath("//input[@value='jdbc']");
        private By btnClean = By.XPath("//button[@value='CLEAN' or contains(text(), 'lean')] | //input[@value='CLEAN' or contains(@value, 'lean') or contains(@value, 'LEAN')]");
        private By initBalance = By.Id("initialBalance");
        private By threshold = By.Name("loanProcessorThreshold");

        // Submit
        private By btnSubmit = By.XPath("//input[@value='Submit']");

        // ❗ FIX: Mở rộng XPath để bắt được mọi loại thông báo trả về (Init, Clean, Submit)
        private By resultMsg = By.XPath("//div[@id='rightPanel']//b | //div[@id='rightPanel']/p[contains(text(), 'Database')]");

        public AdminPage(IWebDriver driver)
        {
            _driver = driver;
        }

        public void ClickMenu()
        {
          
            System.Threading.Thread.Sleep(2000);
            _driver.FindElement(menuAdmin).Click();
            System.Threading.Thread.Sleep(2000);
        }
        public void ClickInitialize()
        {
            _driver.FindElement(btnInitialize).Click();
            Thread.Sleep(1500); // Đợi DB khởi tạo
        }

        public void ClickClean()
        {
            _driver.FindElement(btnClean).Click();
            Thread.Sleep(1500); // Đợi DB dọn dẹp
        }

        public void SelectSOAP()
        {
            _driver.FindElement(radioSOAP).Click();
        }

        public void SelectJDBC()
        {
            _driver.FindElement(radioJDBC).Click();
        }

        public void EnterInitBalance(string value)
        {
            var e = _driver.FindElement(initBalance);
            e.Clear();
            e.SendKeys(value);
        }

        public void EnterThreshold(string value)
        {
            var e = _driver.FindElement(threshold);
            e.Clear();
            e.SendKeys(value);
        }

        public void ClickSubmit()
        {
            _driver.FindElement(btnSubmit).Click();
            Thread.Sleep(1500);
        }

        public string GetResult()
        {
            try { return _driver.FindElement(resultMsg).Text; }
            catch { return ""; }
        }
    }
}