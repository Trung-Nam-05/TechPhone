# Chuyen .doc (HTML) sang .docx bang Microsoft Word (can cai Word)
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $dir "KICH-BAN-TRINH-BAY-20PHUT.doc"
$dst = Join-Path $dir "KICH-BAN-TRINH-BAY-20PHUT-FINAL.docx"

if (-not (Test-Path $src)) {
  Write-Error "Khong tim thay file .doc. Chay: node _gen_word_doc.js"
  exit 1
}

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $doc = $word.Documents.Open($src, $false, $true)
  $format = 16
  $doc.SaveAs2($dst, $format)
  $doc.Close()
  $word.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
  Write-Host "OK: $dst"
} catch {
  Write-Host "Loi COM Word: $_"
  Write-Host "Hay mo truc tiep file .doc bang Word (double-click)."
  exit 1
}
