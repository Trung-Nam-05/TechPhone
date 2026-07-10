using OpenQA.Selenium;
using System.Collections.Generic;

namespace ParabankAutoTests.Pages
{
    public class AccountsOverviewPage
    {
        private IWebDriver _driver;

        // --- 1. KHO LOCATOR ---
        // Menu link bạn đã cung cấp
        private By menuAccountsOverview = By.LinkText("Accounts Overview");

        // Bắt các dòng tài khoản trong bảng (Bảng của Parabank có id="accountTable")
        // Thay dòng bắt accountRows cũ bằng dòng này (Bắt chính xác các dòng do Angular sinh ra)
        // Bắt thẳng vào các thẻ <a> (đường link) chứa chữ 'activity.htm'
        private By accountRows = By.XPath("//table[@id='accountTable']//a[contains(@href, 'activity.htm')]");

        // Bắt tổng tiền Total (Mở rộng cho an toàn)
        // Nhảy lùi 1 bậc ra thẻ td cha, rồi tìm thẻ td anh em ngay liền kề phía sau
        private By totalBalance = By.XPath("//b[contains(text(),'Total')]/parent::td/following-sibling::td");

        // Gói XPath vào ngoặc và lấy phần tử [1] đầu tiên
        private By firstAccountNumberLink = By.XPath("(//table[@id='accountTable']//a[contains(@href, 'activity.htm')])[1]");
        // 1. Thêm dòng này vào khu vực "KHO LOCATOR" (nằm dưới mấy cái XPath cũ)
        // Bắt vào cột số 2 (cột Balance) của dòng tài khoản đầu tiên
        private By firstAccountBalance = By.XPath("(//table[@id='accountTable']//a[contains(@href, 'activity.htm')])[1]/parent::td/following-sibling::td[1]");
        // 2. Thêm hàm này vào khu vực "CÁC HÀNH ĐỘNG"
        public string GetFirstAccountBalance()
        {
            return _driver.FindElement(firstAccountBalance).Text;
        }

        // Constructor
        public AccountsOverviewPage(IWebDriver driver)
        {
            _driver = driver;
        }

        // --- 2. CÁC HÀNH ĐỘNG (ACTIONS) ---
        public void ClickMenuAccountsOverview()
        {
            _driver.FindElement(menuAccountsOverview).Click();
        }

        public int GetTotalAccountRows()
        {
            // Trả về số lượng dòng tài khoản (để test lưới hiển thị)
            IReadOnlyCollection<IWebElement> rows = _driver.FindElements(accountRows);
            return rows.Count;
        }

        public string GetTotalBalanceText()
        {
            return _driver.FindElement(totalBalance).Text;
        }

        public void ClickFirstAccountDetails()
        {
            _driver.FindElement(firstAccountNumberLink).Click();
        }
    }
}