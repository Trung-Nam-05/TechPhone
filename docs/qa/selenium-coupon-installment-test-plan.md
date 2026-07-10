# Selenium E2E Test Plan - Coupon Stacking + Installment MVP

## 1) Muc tieu
- Xac nhan coupon stacking hoat dong dung rule nghiep vu:
  - Toi da 2 ma.
  - 1 ma scope `product` + 1 ma scope `shipping`.
  - Khong cho 2 ma cung loai.
- Xac nhan luong tra gop MVP:
  - Tao don voi `paymentMethod=installment`.
  - Ho so vao `pending_review`.
  - Admin cap nhat duoc installment status va co timeline event.

## 2) Tien dieu kien
- Da seed du lieu co san pham ton kho > 0.
- Co tai khoan admin.
- Co 3 ma coupon test:
  - `PHONE10` (scope=`product`, percentage=10%).
  - `SHIP20K` (scope=`shipping`, fixed=20000).
  - `PHONE5` (scope=`product`, percentage=5%).

## 3) Danh sach test case

### CP-01: Ap 2 ma hop le (product + shipping)
1. Mo trang cart.
2. Nhap `PHONE10, SHIP20K` va ap dung.
3. Kiem tra breakdown: co discount product + shipping.
4. Chuyen checkout va dat hang.

Expected:
- Khong bao loi.
- Tong tien giam dung.
- Tao don thanh cong.

### CP-02: Ap 2 ma cung loai bi tu choi
1. Mo cart.
2. Nhap `PHONE10, PHONE5`.
3. Bam ap dung.

Expected:
- Bao loi conflict scope.
- Khong update discount.

### CP-03: Vuot usage limit
1. Dung ma da het usage limit.
2. Bam ap dung.

Expected:
- Bao loi usage limit reached.

### IN-01: Checkout voi tra gop pending_review
1. Mo checkout (cart co item).
2. Chon payment method = installment.
3. Chon provider, ky han, down payment.
4. Submit order.

Expected:
- Tao don thanh cong.
- Don co installment status `pending_review`.

### IN-02: Admin approve installment
1. Dang nhap admin vao trang `/admin/orders`.
2. Chon don tra gop vua tao.
3. Cap nhat installment status -> `approved`.

Expected:
- API thanh cong.
- UI hien status moi.
- Timeline co event installment_approved.

### IN-03: Idempotency khi submit nhieu lan
1. O checkout, click nhanh nut dat hang nhieu lan.

Expected:
- Chi tao 1 don.

## 4) Selenium script skeleton (Python)
```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 15)

driver.get("http://localhost:5173/cart")
coupon_input = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "input[placeholder*='PHONE10']")))
coupon_input.clear()
coupon_input.send_keys("PHONE10, SHIP20K")
driver.find_element(By.XPATH, "//button[contains(., 'Ap dung ma')]").click()

wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(., 'PHONE10')]")))
driver.find_element(By.XPATH, "//a[contains(., 'Tiến hành thanh toán')]").click()

wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(., 'Thanh toán')]")))
payment_select = driver.find_element(By.XPATH, "//select[option[contains(., 'Tra gop')]]")
payment_select.send_keys("Tra gop")

driver.find_element(By.XPATH, "//button[contains(., 'Hoàn tất đặt hàng')]").click()
wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(., 'Đặt hàng thành công')]")))

driver.quit()
```

## 5) Tieu chi dat
- 100% case tren pass.
- Khong tao don trung.
- Installment status chuyen dung theo thao tac admin.
