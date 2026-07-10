using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using System;
using System.Threading;

namespace ParabankAutoTests.Pages
{
    public class FindTransactionsPage
    {
        private readonly IWebDriver _driver;

        public FindTransactionsPage(IWebDriver driver)
        {
            _driver = driver;
        }

        // --- 1. LOCATORS (Chuẩn 100% theo Selenium IDE của bạn) ---
        private By AccountDropdown => By.Id("accountId");

        // Tìm theo ID
        private By TransactionIdInput => By.Id("transactionId");
        private By FindByIdBtn => By.Id("findById");

        // Tìm theo Ngày
        private By DateInput => By.Id("transactionDate");
        private By FindByDateBtn => By.Id("findByDate");

        // Tìm theo Khoảng ngày
        private By DateRangeFromInput => By.Id("fromDate");
        private By DateRangeToInput => By.Id("toDate");
        private By FindByDateRangeBtn => By.Id("findByDateRange");

        // Tìm theo Số tiền
        private By AmountInput => By.Id("amount");
        private By FindByAmountBtn => By.Id("findByAmount");

        // ĐÃ SỬA: Bổ sung các ID báo lỗi cụ thể (transactionIdError, transactionDateError, amountError) 
        // dựa trên dữ liệu record thực tế của bạn
        private By ResultMessage => By.XPath("//*[@id='transactionIdError' or @id='transactionDateError' or @id='amountError' or @class='error' or @class='title']");

        private By TransactionTableRows => By.XPath("//table[@id='transactionTable']/tbody/tr");

        // --- 2. ACTIONS ---
        public void SelectAccountByIndex(int index = 0)
        {
            Thread.Sleep(1500); // Chờ dropdown load dữ liệu tài khoản
            var select = new SelectElement(_driver.FindElement(AccountDropdown));
            if (select.Options.Count > index)
            {
                select.SelectByIndex(index);
            }
        }

        public void FindByTransactionId(string id)
        {
            _driver.FindElement(TransactionIdInput).Clear();
            _driver.FindElement(TransactionIdInput).SendKeys(id);
            _driver.FindElement(FindByIdBtn).Click();
            Thread.Sleep(1500); // Bắt buộc chờ để bảng kết quả kịp xuất hiện
        }

        public void FindByDate(string date)
        {
            _driver.FindElement(DateInput).Clear();
            _driver.FindElement(DateInput).SendKeys(date);
            _driver.FindElement(FindByDateBtn).Click();
            Thread.Sleep(1500);
        }

        public void FindByDateRange(string fromDate, string toDate)
        {
            _driver.FindElement(DateRangeFromInput).Clear();
            _driver.FindElement(DateRangeFromInput).SendKeys(fromDate);
            _driver.FindElement(DateRangeToInput).Clear();
            _driver.FindElement(DateRangeToInput).SendKeys(toDate);
            _driver.FindElement(FindByDateRangeBtn).Click();
            Thread.Sleep(1500);
        }

        public void FindByAmount(string amount)
        {
            _driver.FindElement(AmountInput).Clear();
            _driver.FindElement(AmountInput).SendKeys(amount);
            _driver.FindElement(FindByAmountBtn).Click();
            Thread.Sleep(1500);
        }

        // --- 3. VERIFICATIONS ---
        public string GetResultMessage()
        {
            try { return _driver.FindElement(ResultMessage).Text; }
            catch { return ""; }
        }

        public int GetTransactionResultsCount()
        {
            try { return _driver.FindElements(TransactionTableRows).Count; }
            catch { return 0; }
        }
    }
}