using System;

namespace ParabankAutoTests.Models
{
    public class TestCaseModel
    {
        public string TestID { get; set; }
        public string Module { get; set; }
        public string TestName { get; set; }
        public string Action { get; set; }
        public string ExpectedResult { get; set; }
    }
}