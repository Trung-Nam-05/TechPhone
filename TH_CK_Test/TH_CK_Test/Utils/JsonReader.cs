using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using NUnit.Framework;
using ParabankAutoTests.Models;

namespace ParabankAutoTests.Utils
{
    public class JsonReader
    {
        // Hàm này nhận tên file để đọc data động
        public static IEnumerable<TestCaseData> ReadTestData(string fileName)
        {
            // Giả sử bạn bỏ 9 file json vào thư mục "TestData" trong project
            string jsonFilePath = Path.Combine(TestContext.CurrentContext.TestDirectory, "TestData", fileName);
            string jsonContent = File.ReadAllText(jsonFilePath);

            var testCases = JsonConvert.DeserializeObject<List<TestCaseModel>>(jsonContent);

            foreach (var testCase in testCases)
            {
                // SetName giúp Test Explorer hiển thị tên Test Case cực đẹp
                yield return new TestCaseData(testCase).SetName($"{testCase.TestID} - {testCase.TestName}");
            }
        }
    }
}