using OpenQA.Selenium;
using TechPhoneE2E.Models;

namespace TechPhoneE2E.Scenarios;

public interface IScenarioHandler
{
    void Run(IWebDriver driver, ExportTestCase testCase);
}
