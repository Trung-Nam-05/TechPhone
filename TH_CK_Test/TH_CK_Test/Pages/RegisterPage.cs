using OpenQA.Selenium;
using System.Threading;

namespace ParabankAutoTests.Pages
{
    public class RegisterPage
    {
        private readonly IWebDriver _driver;

        public RegisterPage(IWebDriver driver)
        {
            _driver = driver;
        }

        // --- 1. KHO LOCATOR ---
        private By menuRegister = By.LinkText("Register");

        // Form Inputs (Sử dụng chuẩn ID từ Katalon)
        private By txtFirstName = By.Id("customer.firstName");
        private By txtLastName = By.Id("customer.lastName");
        private By txtStreet = By.Id("customer.address.street");
        private By txtCity = By.Id("customer.address.city");
        private By txtState = By.Id("customer.address.state");
        private By txtZipCode = By.Id("customer.address.zipCode");
        private By txtPhone = By.Id("customer.phoneNumber");
        private By txtSsn = By.Id("customer.ssn");
        private By txtUsername = By.Id("customer.username");
        private By txtPassword = By.Id("customer.password");
        private By txtConfirmPassword = By.Id("repeatedPassword");

        private By btnRegister = By.XPath("//input[@value='Register']");

        // Element thông báo
        private By welcomeTitle = By.XPath("//div[@id='rightPanel']//h1[@class='title']");
        private By errorMessages = By.XPath("//span[@class='error']");

        // Các lỗi cụ thể thường gặp (ID error của Parabank)
        private By errRepeatedPassword = By.Id("repeatedPassword.errors");
        private By errUsername = By.Id("customer.username.errors");

        // --- 2. CÁC HÀNH ĐỘNG ---
        public void ClickMenuRegister()
        {
            _driver.FindElement(menuRegister).Click();
            Thread.Sleep(1000); // Chờ trang load
        }

        public void FillRegistrationForm(string fName, string lName, string street, string city,
                                         string state, string zip, string phone, string ssn,
                                         string user, string pass, string confirmPass)
        {
            _driver.FindElement(txtFirstName).SendKeys(fName);
            _driver.FindElement(txtLastName).SendKeys(lName);
            _driver.FindElement(txtStreet).SendKeys(street);
            _driver.FindElement(txtCity).SendKeys(city);
            _driver.FindElement(txtState).SendKeys(state);
            _driver.FindElement(txtZipCode).SendKeys(zip);
            _driver.FindElement(txtPhone).SendKeys(phone);
            _driver.FindElement(txtSsn).SendKeys(ssn);
            _driver.FindElement(txtUsername).SendKeys(user);
            _driver.FindElement(txtPassword).SendKeys(pass);
            _driver.FindElement(txtConfirmPassword).SendKeys(confirmPass);
        }

        public void ClickSubmit()
        {
            _driver.FindElement(btnRegister).Click();
            Thread.Sleep(2000); // Chờ server xử lý thông tin đăng ký
        }

        // --- 3. KIỂM TRA KẾT QUẢ ---
        public string GetWelcomeTitle()
        {
            try { return _driver.FindElement(welcomeTitle).Text; }
            catch { return ""; }
        }

        public string GetAllValidationErrors()
        {
            try
            {
                var errors = _driver.FindElements(errorMessages);
                string fullError = "";
                foreach (var err in errors)
                {
                    if (!string.IsNullOrEmpty(err.Text)) fullError += err.Text + " | ";
                }
                return fullError.TrimEnd(' ', '|');
            }
            catch { return ""; }
        }

        public string GetPasswordMismatchError()
        {
            try { return _driver.FindElement(errRepeatedPassword).Text; }
            catch { return ""; }
        }

        public string GetUsernameExistsError()
        {
            try { return _driver.FindElement(errUsername).Text; }
            catch { return ""; }
        }
    }
}