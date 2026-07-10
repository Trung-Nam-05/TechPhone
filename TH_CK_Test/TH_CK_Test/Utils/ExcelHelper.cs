using ClosedXML.Excel;
using System;
using System.IO;

namespace ParabankAutoTests.Utils
{
    public class ExcelHelper
    {
        public static void UpdateTestResult(string testId, string status, string actualResult, string testerName, string screenshotPath)
        {
            // Đường dẫn tới file Excel Report của bạn
            string excelPath = @"D:\dambaochatluong\TH_CK_Test\TestReport.xlsx";

            try
            {
                using (var workbook = new XLWorkbook(excelPath))
                {
                    // 1. Chỉ định chính xác tên Sheet là "TestCase" như trong ảnh
                    var worksheet = workbook.Worksheet("TestCase");

                    var rows = worksheet.RowsUsed();

                    foreach (var row in rows)
                    {
                        // 2. Đọc giá trị TestID ở Cột C (Cột số 3)
                        string currentId = row.Cell(3).Value.ToString().Trim();

                        if (currentId == testId)
                        {
                            // Cột J (Cột 10): Ghi Actual Result (Note)
                            row.Cell(10).Value = actualResult;

                            // Cột K (Cột 11): Ghi Result (Pass/Fail) và tô màu nền
                            var resultCell = row.Cell(11);
                            resultCell.Value = status;

                            if (status.ToUpper() == "PASS")
                            {
                                resultCell.Style.Fill.BackgroundColor = XLColor.LightGreen;
                                resultCell.Style.Font.FontColor = XLColor.DarkGreen;
                            }
                            else if (status.ToUpper() == "FAIL")
                            {
                                resultCell.Style.Fill.BackgroundColor = XLColor.LightCoral;
                                resultCell.Style.Font.FontColor = XLColor.DarkRed;
                            }

                            // Cột L (Cột 12): Ghi tên người Test (By tester)
                            row.Cell(12).Value = testerName;

                            // Cột M (Cột 13): Ghi Link ảnh Screenshot nếu Fail
                            if (!string.IsNullOrEmpty(screenshotPath))
                            {
                                row.Cell(13).Value = "Xem ảnh lỗi";
                                row.Cell(13).SetHyperlink(new XLHyperlink(screenshotPath));
                                // Trang trí cho giống cái link click được
                                row.Cell(13).Style.Font.FontColor = XLColor.Blue;
                                row.Cell(13).Style.Font.Underline = XLFontUnderlineValues.Single;
                            }

                            break; // Tìm thấy và update xong thì thoát vòng lặp cho nhẹ máy
                        }
                    }
                    workbook.Save();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Lỗi ghi Excel: Vui lòng kiểm tra đã tắt file Excel chưa! Chi tiết: " + ex.Message);
            }
        }
    }
}