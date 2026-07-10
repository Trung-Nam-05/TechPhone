using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using System.Threading;
using System;

namespace TH_CK_Test.Pages
{
    public class OpenNewAccountPage
    {
        
        private IWebDriver _driver;

        // --- 1. KHO LOCATOR ---
        private By menuOpenNewAccount = By.LinkText("Open New Account");
        private By dropdownAccountType = By.Id("type");
        private By dropdownFromAccountId = By.Id("fromAccountId");
        private By btnOpenNewAccount = By.XPath("//input[@value='Open New Account']");

        // ĐÃ CẬP NHẬT: Dựa trên id bạn tìm được để tránh lấy nhầm h1 tàng hình
        private By titleResult = By.XPath("//div[@id='openAccountResult']//h1");
        private By newAccountId = By.Id("newAccountId");

        // ĐÃ CẬP NHẬT: XPath bắt mọi loại lỗi bao gồm cả Internal Error
        private By errorMessage = By.XPath("//*[@class='error' or contains(text(), 'internal error')]");

        public OpenNewAccountPage(IWebDriver driver)
        {
            _driver = driver;
        }

        // --- 2. CÁC HÀNH ĐỘNG ---
        public void ClickMenuOpenNewAccount()
        {
            _driver.FindElement(menuOpenNewAccount).Click();
            Thread.Sleep(1500); // Tăng thêm một chút để dropdown load kịp data
        }

        public void SelectAccountType(string typeValue)
        {
            SelectElement select = new SelectElement(_driver.FindElement(dropdownAccountType));
            select.SelectByText(typeValue);
        }

        public void ClickSubmit()
        {
            // Quan trọng: Đợi một nhịp trước khi bấm để tránh submit form rỗng
            Thread.Sleep(1000);
            _driver.FindElement(btnOpenNewAccount).Click();

            // CHỜ ĐỢI THÔNG MINH:
            try
            {
                WebDriverWait wait = new WebDriverWait(_driver, TimeSpan.FromSeconds(5));
                // Chờ cho đến khi cái khối ID kết quả hiện ra thì mới đi tiếp
                wait.Until(d => d.FindElement(By.Id("openAccountResult")).Displayed);
            }
            catch
            {
                // Nếu quá 5s không thấy khối kết quả (có thể web lỗi), vẫn cho đi tiếp để hàm Assert báo lỗi
            }
        }

        public string GetResultTitle()
        {
            try { return _driver.FindElement(titleResult).Text; }
            catch { return ""; }
        }

        public string GetNewAccountNumber()
        {
            try { return _driver.FindElement(newAccountId).Text; }
            catch { return ""; }
        }

        public string GetErrorMessage()
        {
            try { return _driver.FindElement(errorMessage).Text; }
            catch { return ""; }
        }
    }
}