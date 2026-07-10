# Test data JSON (từ `TestReport (1).csv`)

## Cách tạo lại

```bash
node test/scripts/csv-to-json.mjs
```

## Chia 3 file — **Khánh (F1–F3)**, **Hùng (F4–F6)**, **Phú (F7–F10)**

| File | Module trong mã TC | Gợi nhớ |
|------|---------------------|--------|
| **Khanh.json** | `TC_F1.*`, `TC_F2.*`, `TC_F3.*` | f123 |
| **Hung.json** | `TC_F4.*`, `TC_F5.*`, `TC_F6.*` | f456 |
| **Phu.json** | `TC_F7.*` … `TC_F10.*` | f78910 |

Quy tắc lấy số sau `TC_F`: ví dụ `TC_F7.01` → nhóm **7** → thuộc **Phú**.

## File CSV

- **`TestReport (1).csv`**: case F7–F10 (và có thể thêm F1–F6 nếu không dùng file riêng) → **Phu.json** (và Khánh/Hùng nếu không có CSV riêng).
- **`Khanh_TestCases.csv`**: **F1–F3** → **Khanh.json** (nếu file tồn tại thì ưu tiên; không thì Khánh lấy từ TestReport).
- **`Hung_TestCases.csv`**: **F4–F6** → **Hung.json** (tương tự).

Đồng bộ JSON → CSV sau khi sửa tay: `node test/scripts/khanh-json-to-csv.mjs` / `node test/scripts/hung-json-to-csv.mjs`.

## Cấu trúc mỗi object

`rowNo`, `testId`, `testObjective`, `stepAction`, `testData`, `expectedResult`, `actualResult`, `status`, `screenshot`
