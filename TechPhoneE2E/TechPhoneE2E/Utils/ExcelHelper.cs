using ClosedXML.Excel;

namespace TechPhoneE2E.Utils;

/// <summary>Ghi kết quả vào TestReport.xlsx (sheet "TestCase") — giống mẫu TH_CK.</summary>
public static class ExcelHelper
{
    public static void UpdateTestResult(
        string testId,
        string status,
        string actualResult,
        string testerName,
        string screenshotPath)
    {
        var excelPath = RepoPaths.TestReportExcelPath;
        if (!File.Exists(excelPath))
        {
            Console.WriteLine($"ExcelHelper: bỏ qua — không có file {excelPath}");
            return;
        }

        try
        {
            using var workbook = new XLWorkbook(excelPath);
            var worksheet = workbook.Worksheet("TestCase");
            var rows = worksheet.RowsUsed();

            foreach (var row in rows)
            {
                var currentId = row.Cell(3).Value.ToString().Trim();
                if (currentId != testId)
                    continue;

                row.Cell(10).Value = actualResult;
                var resultCell = row.Cell(11);
                resultCell.Value = status;

                if (status.Equals("PASS", StringComparison.OrdinalIgnoreCase))
                {
                    resultCell.Style.Fill.BackgroundColor = XLColor.LightGreen;
                    resultCell.Style.Font.FontColor = XLColor.DarkGreen;
                }
                else if (status.Equals("FAIL", StringComparison.OrdinalIgnoreCase))
                {
                    resultCell.Style.Fill.BackgroundColor = XLColor.LightCoral;
                    resultCell.Style.Font.FontColor = XLColor.DarkRed;
                }

                row.Cell(12).Value = testerName;

                if (!string.IsNullOrEmpty(screenshotPath))
                {
                    row.Cell(13).Value = "Xem ảnh lỗi";
                    row.Cell(13).SetHyperlink(new XLHyperlink(screenshotPath));
                    row.Cell(13).Style.Font.FontColor = XLColor.Blue;
                    row.Cell(13).Style.Font.Underline = XLFontUnderlineValues.Single;
                }

                break;
            }

            workbook.Save();
        }
        catch (Exception ex)
        {
            Console.WriteLine("Lỗi ghi Excel: đã tắt file Excel chưa? " + ex.Message);
        }
    }
}
