using OpenQA.Selenium;
using System.Threading;

namespace ParabankAutoTests.Pages
{
    public class LoginPage
    {
        private readonly IWebDriver _driver;

        public LoginPage(IWebDriver driver)
        {
            _driver = driver;
        }

        // --- 1. LOCATORS ---
        // Login Form
        private By txtUsername = By.Name("username");
        private By txtPassword = By.Name("password");
        private By btnLogin = By.XPath("//input[@value='Log In']");
        private By errorMsg = By.XPath("//p[@class='error']");

        // Logout
        private By linkLogout = By.LinkText("Log Out");

        // Forgot Login Info Form
        private By linkForgotInfo = By.PartialLinkText("Forgot login info");
        private By txtFirstName = By.Id("firstName");
        private By txtLastName = By.Id("lastName");
        private By txtStreet = By.Id("address.street");
        private By txtCity = By.Id("address.city");
        private By txtState = By.Id("address.state");
        private By txtZipCode = By.Id("address.zipCode");
        private By txtSsn = By.Id("ssn");
        private By btnFindInfo = By.XPath("//input[@value='Find My Login Info']");
        private By forgotInfoResult = By.XPath("//div[@id='rightPanel']/p[1]"); // Lấy đoạn text báo thành công

        // Element để check sau khi login thành công
        private By accountsOverviewTitle = By.XPath("//h1[@class='title' and contains(text(), 'Accounts Overview')]");
        // --- 2. ACTIONS ---
        public void Login(string username, string password)
        {
            _driver.FindElement(txtUsername).Clear();
            _driver.FindElement(txtUsername).SendKeys(username);

            _driver.FindElement(txtPassword).Clear();
            _driver.FindElement(txtPassword).SendKeys(password);

            _driver.FindElement(btnLogin).Click();
            Thread.Sleep(1500); // Chờ web phản hồi
        }

        public void ClickLogout()
        {
            _driver.FindElement(linkLogout).Click();
            Thread.Sleep(1500);
        }

        public void ClickForgotLoginInfo()
        {
            _driver.FindElement(linkForgotInfo).Click();
            Thread.Sleep(1000);
        }

        public void FillForgotInfoForm(string fName, string lName, string street, string city, string state, string zip, string ssn)
        {
            _driver.FindElement(txtFirstName).SendKeys(fName);
            _driver.FindElement(txtLastName).SendKeys(lName);
            _driver.FindElement(txtStreet).SendKeys(street);
            _driver.FindElement(txtCity).SendKeys(city);
            _driver.FindElement(txtState).SendKeys(state);
            _driver.FindElement(txtZipCode).SendKeys(zip);
            _driver.FindElement(txtSsn).SendKeys(ssn);
            _driver.FindElement(btnFindInfo).Click();
            Thread.Sleep(1500);
        }

        // --- 3. VERIFICATIONS ---
        public string GetErrorMessage()
        {
            try { return _driver.FindElement(errorMsg).Text; }
            catch { return ""; }
        }

        public bool IsAccountsOverviewDisplayed()
        {
            try { return _driver.FindElement(accountsOverviewTitle).Displayed; }
            catch { return false; }
        }

        public bool IsLoginFormDisplayed()
        {
            try { return _driver.FindElement(btnLogin).Displayed; }
            catch { return false; }
        }

        public string GetForgotInfoResultMessage()
        {
            try { return _driver.FindElement(forgotInfoResult).Text; }
            catch { return ""; }
        }
    }
}