using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using System;
using System.Threading;

namespace TH_CK_Test.Pages
{
    public class TransferFundsPage
    {
        private IWebDriver _driver;

        // --- 1. LOCATORS ---
        private By menuTransferFunds = By.LinkText("Transfer Funds");
        private By txtAmount = By.Id("amount");
        private By dropdownFromAccount = By.Id("fromAccountId");
        private By dropdownToAccount = By.Id("toAccountId");
        private By btnTransfer = By.XPath("//input[@value='Transfer']");

        // Kết quả sau khi chuyển
        private By resultTitle = By.XPath("//div[@id='showResult']//h1");
        private By resultMessage = By.XPath("//div[@id='showResult']//p");
        private By errorMessage = By.XPath("//span[@id='amount.errors'] | //p[@class='error']");

        public TransferFundsPage(IWebDriver driver)
        {
            _driver = driver;
        }

        // --- 2. ACTIONS ---
        public void ClickMenuTransferFunds()
        {
            _driver.FindElement(menuTransferFunds).Click();
            // Đợi một chút để các dropdown load danh sách tài khoản từ API
            Thread.Sleep(2000);
        }

        public void Transfer(string amount, int fromIndex = 0, int toIndex = 1)
        {
            _driver.FindElement(txtAmount).Clear();
            _driver.FindElement(txtAmount).SendKeys(amount);

            // Chọn tài khoản gửi (mặc định cái đầu tiên)
            SelectElement fromSelect = new SelectElement(_driver.FindElement(dropdownFromAccount));
            if (fromSelect.Options.Count > fromIndex) fromSelect.SelectByIndex(fromIndex);

            // Chọn tài khoản nhận (mặc định cái thứ hai)
            SelectElement toSelect = new SelectElement(_driver.FindElement(dropdownToAccount));
            if (toSelect.Options.Count > toIndex) toSelect.SelectByIndex(toIndex);

            _driver.FindElement(btnTransfer).Click();
            Thread.Sleep(1500);
        }

        public string GetResultTitle() => GetTextSafe(resultTitle);
        public string GetResultMessage() => GetTextSafe(resultMessage);
        public string GetErrorMessage() => GetTextSafe(errorMessage);

        private string GetTextSafe(By by)
        {
            try { return _driver.FindElement(by).Text; }
            catch { return ""; }
        }
    }
}