using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using System;
using System.Threading;

namespace ParabankAutoTests.Pages
{
    public class BillPayPage
    {
        private readonly IWebDriver _driver;

        public BillPayPage(IWebDriver driver)
        {
            _driver = driver;
        }

        // --- 1. KHO LOCATOR ---
        private By menuBillPay = By.LinkText("Bill Pay");

        // Form Inputs (Sử dụng Name - Ổn định nhất cho form này)
        private By txtPayeeName = By.Name("payee.name");
        private By txtStreet = By.Name("payee.address.street");
        private By txtCity = By.Name("payee.address.city");
        private By txtState = By.Name("payee.address.state");
        private By txtZipCode = By.Name("payee.address.zipCode");
        private By txtPhone = By.Name("payee.phoneNumber");
        private By txtAccount = By.Name("payee.accountNumber");
        private By txtVerifyAccount = By.Name("verifyAccount");
        private By txtAmount = By.Name("amount");

        // Dropdown và Button
        private By dropdownFromAccount = By.Name("fromAccountId");
        private By btnSendPayment = By.XPath("//input[@value='Send Payment']");

        // KẾT QUẢ TRẢ VỀ: Đã sửa lại chuẩn 100% theo log Selenium IDE (billpayResult)
        private By successTitle = By.XPath("//div[@id='billpayResult']//h1");
        private By successMessage = By.XPath("//div[@id='billpayResult']//p[1]"); // Lấy thêm đoạn text báo thành công
        private By errorMessages = By.XPath("//span[@class='error']");

        // --- 2. CÁC HÀNH ĐỘNG ---
        public void ClickMenuBillPay()
        {
            _driver.FindElement(menuBillPay).Click();
            Thread.Sleep(1500); // Đợi form load
        }

        public void FillBillPayForm(string name, string street, string city, string state,
                                    string zip, string phone, string account, string verifyAcc,
                                    string amount, int fromAccIndex = 0)
        {
            _driver.FindElement(txtPayeeName).Clear();
            _driver.FindElement(txtPayeeName).SendKeys(name);

            _driver.FindElement(txtStreet).Clear();
            _driver.FindElement(txtStreet).SendKeys(street);

            _driver.FindElement(txtCity).Clear();
            _driver.FindElement(txtCity).SendKeys(city);

            _driver.FindElement(txtState).Clear();
            _driver.FindElement(txtState).SendKeys(state);

            _driver.FindElement(txtZipCode).Clear();
            _driver.FindElement(txtZipCode).SendKeys(zip);

            _driver.FindElement(txtPhone).Clear();
            _driver.FindElement(txtPhone).SendKeys(phone);

            _driver.FindElement(txtAccount).Clear();
            _driver.FindElement(txtAccount).SendKeys(account);

            _driver.FindElement(txtVerifyAccount).Clear();
            _driver.FindElement(txtVerifyAccount).SendKeys(verifyAcc);

            _driver.FindElement(txtAmount).Clear();
            _driver.FindElement(txtAmount).SendKeys(amount);

            var select = new SelectElement(_driver.FindElement(dropdownFromAccount));
            if (select.Options.Count > fromAccIndex)
            {
                select.SelectByIndex(fromAccIndex);
            }
        }

        public void ClickSendPayment()
        {
            _driver.FindElement(btnSendPayment).Click();
            Thread.Sleep(2000);
        }

        // --- 3. HÀM KIỂM TRA KẾT QUẢ ---
        public string GetSuccessTitle()
        {
            try { return _driver.FindElement(successTitle).Text; }
            catch { return ""; }
        }

        public string GetSuccessMessage()
        {
            try { return _driver.FindElement(successMessage).Text; }
            catch { return ""; }
        }

        public bool HasValidationErrors()
        {
            try { return _driver.FindElements(errorMessages).Count > 0; }
            catch { return false; }
        }

        public string GetAllErrorText()
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
    }
}