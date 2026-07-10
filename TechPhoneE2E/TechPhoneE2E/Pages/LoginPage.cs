using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace TechPhoneE2E.Pages;

public class LoginPage
{
    private readonly IWebDriver _driver;

    private static readonly By Email = By.CssSelector("[data-testid='login-email']");
    private static readonly By Password = By.CssSelector("[data-testid='login-password']");
    private static readonly By Submit = By.CssSelector("[data-testid='login-submit']");
    private static readonly By Error = By.CssSelector("[data-testid='login-error']");
    private static readonly By LogoutBtn = By.CssSelector("[data-testid='header-logout']");
    private static readonly By LoginLink = By.CssSelector("a[href='/login']");

    public LoginPage(IWebDriver driver)
    {
        _driver = driver;
    }

    public void GoToLogin(string baseUrl)
    {
        _driver.Navigate().GoToUrl($"{baseUrl}/login");
    }

    public void Login(string email, string password)
    {
        _driver.FindElement(Email).Clear();
        _driver.FindElement(Email).SendKeys(email ?? "");
        _driver.FindElement(Password).Clear();
        _driver.FindElement(Password).SendKeys(password ?? "");
        _driver.FindElement(Submit).Click();
    }

    /// <summary>Bỏ validation HTML5 để gửi form trống — backend trả 400 + message.</summary>
    public void SubmitEmptyCredentials()
    {
        var emailEl = _driver.FindElement(Email);
        var passEl = _driver.FindElement(Password);
        ((IJavaScriptExecutor)_driver).ExecuteScript(
            "arguments[0].removeAttribute('required'); arguments[1].removeAttribute('required');",
            emailEl,
            passEl);
        emailEl.Clear();
        passEl.Clear();
        _driver.FindElement(Submit).Click();
    }

    public string? GetErrorMessage()
    {
        try
        {
            var el = _driver.FindElement(Error);
            return el.Displayed ? el.Text : null;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>Chờ banner lỗi sau submit (polling).</summary>
    public string RequireErrorMessage()
    {
        var wait = new WebDriverWait(_driver, TimeSpan.FromSeconds(15));
        var msg = wait.Until(driver =>
        {
            try
            {
                var el = driver.FindElement(Error);
                var t = el.Text;
                return string.IsNullOrWhiteSpace(t) ? null : t;
            }
            catch (StaleElementReferenceException)
            {
                return null;
            }
            catch (NoSuchElementException)
            {
                return null;
            }
        });
        Assert.That(msg, Is.Not.Null.And.Not.Empty);
        return msg!;
    }

    public bool IsOnLoginPage()
    {
        try
        {
            return _driver.Url.Contains("/login", StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    public bool IsLogoutVisible()
    {
        try
        {
            return _driver.FindElement(LogoutBtn).Displayed;
        }
        catch
        {
            return false;
        }
    }

    public void ClickLogout()
    {
        _driver.FindElement(LogoutBtn).Click();
    }

    public bool IsLoginEntryVisible()
    {
        try
        {
            return _driver.FindElement(LoginLink).Displayed;
        }
        catch
        {
            return false;
        }
    }
}
