/**
 * Kịch bản trình bày ~20 phút — TechPhone Design Patterns
 * Run: node docs/design-patterns/_gen_kich_ban_trinh_bay.js
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function escapeXml(s) {
  return String(s)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function block(text, opts = {}) {
  const { bold = false, heading = false, mono = false } = opts;
  const sz = heading ? '32' : '22';
  let rPr = `<w:rPr><w:sz w:val="${sz}"/>`;
  if (bold || heading) rPr += '<w:b/>';
  if (mono) rPr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>';
  rPr += '</w:rPr>';
  return String(text)
    .split('\n')
    .map((line) => {
      if (line === '') return '<w:p/>';
      return `<w:p><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
    })
    .join('');
}

const L = [];
const mdLines = [];

function title(t) { L.push(block(t, { heading: true })); L.push(block('')); mdLines.push(`# ${t}`, ''); }
function h(t) { L.push(block(t, { bold: true })); mdLines.push(`## ${t}`, ''); }
function t(...lines) { lines.forEach((line) => { L.push(block(line)); mdLines.push(line); }); L.push(block('')); mdLines.push(''); }

title('KỊCH BẢN TRÌNH BÀY ~20 PHÚT — TECHPHONE & DESIGN PATTERN');
t(
  'Sinh viên: ___________________    Lớp: ___________________',
  'Môn: Mẫu Thiết Kế Phần Mềm',
  'Thời lượng mục tiêu: 18–20 phút (+ 1–2 phút dự phòng)',
  '',
  'Cách dùng file này khi quay clip:',
  '• Mỗi mục có [THỜI GIAN] — bám sát để đủ ~20 phút.',
  '• [MÀN HÌNH] — mở đúng file/ trang web khi nói.',
  '• [LỜI NÓI] — gợi ý, có thể nói tự nhiên, không cần đọc nguyên văn.',
  '• [CODE CHỈ] — dòng code cần zoom/chỉ chuột khi quay.',
);

title('BẢNG THỜI GIAN TỔNG (20 PHÚT)');
t(
  '0:00 – 3:30   Phần 1: Giới thiệu đồ án TechPhone',
  '3:30 – 4:30   Phần 2: Tổng quan pattern trong project',
  '4:30 – 5:30   Singleton — kết nối database',
  '5:30 – 8:00   Strategy — thanh toán & giảm giá',
  '8:00 – 10:30  State — vòng đời đơn hàng',
  '10:30 – 12:00 Adapter — GHN vận chuyển',
  '12:00 – 13:30 Command — AI chat tools',
  '13:30 – 15:30 Chain of Responsibility — middleware auth',
  '15:30 – 17:30 Observer — chat real-time',
  '17:30 – 18:30 Template Method + Facade (ngắn)',
  '18:30 – 20:00 Pattern thư viện khác + Kết luận',
);

// ===== PHẦN 1 =====
title('PHẦN 1 — GIỚI THIỆU ĐỒ ÁN (3–4 PHÚT)');

h('[0:00 – 1:00] Mở đầu');
t(
  '[MÀN HÌNH] Trang chủ TechPhone đang chạy (localhost:5173) — scroll qua sản phẩm.',
  '[LỜI NÓI] Xin chào thầy/cô. Em trình bày đồ án TechPhone — website thương mại điện tử bán điện thoại, laptop, phụ kiện. Đây là sản phẩm em xây dựng cho môn [tên môn đồ án], hôm nay em tập trung vào phần áp dụng Design Pattern trong source code.',
);

h('[1:00 – 2:00] Kiến trúc & công nghệ');
t(
  '[MÀN HÌNH] Mở VS Code — cấu trúc thư mục project (TechPhone-main/).',
  '[LỜI NÓI] Project chia 2 phần: Frontend React + Vite trong thư mục src/, Backend Node.js Express + MongoDB trong server/. Giao tiếp qua REST API /api/... và Socket.io cho chat real-time.',
  '[CODE CHỈ] package.json (root) và server/package.json — liệt kê react, express, mongoose, socket.io.',
);

h('[2:00 – 3:00] Chức năng chính');
t(
  '[MÀN HÌNH] Demo nhanh trên web (không cần chi tiết):',
  '  1. Xem sản phẩm → thêm giỏ → Checkout',
  '  2. (Tuỳ chọn) Flash sale / coupon',
  '  3. Admin /admin — quản lý đơn, sản phẩm',
  '  4. Chat hỗ trợ góc phải',
  '[LỜI NÓI] Luồng nghiệp vụ chính: khách duyệt SP, đặt hàng COD hoặc VNPAY, theo dõi trạng thái đơn qua stepper; admin quản lý kho, giá, đơn hàng; chat hỗ trợ real-time. Các pattern em áp dụng nằm rải trong luồng này.',
);

h('[3:00 – 3:30] Chuyển sang Pattern');
t(
  '[MÀN HÌNH] Mở docs/design-patterns/PATTERN-MAP.md hoặc folder server/src/patterns/',
  '[LỜI NÓI] Em có 7 pattern tự viết trong folder patterns/ và thêm pattern từ thư viện Express, React, Socket.io. Phần tiếp theo em trình bày từng pattern — nói vấn đề gì, code ở đâu, demo thế nào.',
);

// ===== PHẦN 2 TỔNG QUAN =====
title('PHẦN 2 — TỔNG QUAN PATTERN (1 PHÚT)');

h('[3:30 – 4:30]');
t(
  '[MÀN HÌNH] PATTERN-MAP.md — bảng master 15 pattern.',
  '[LỜI NÓI] Em phân 2 nhóm: 🏠 Tự viết — class/interface rõ trong patterns/; 📦 Thư viện — Express middleware, React, Mongoose đã implement sẵn, em cấu hình và sử dụng.',
  '[MÀN HÌNH] server/src/patterns/ — liệt kê: payment, discount, adapters, state, commands, singleton.',
  '[LỜI NÓI] Không phải pattern nào cũng cần folder riêng. Chỉ gom pattern có nhiều class cần trình bày rõ với giảng viên.',
);

// ===== SINGLETON =====
title('PATTERN 1 — SINGLETON (🏠) ~1 PHÚT');

h('[4:30 – 5:30]');
t(
  'Vấn đề: Mỗi request API không được tạo connection MongoDB mới — tốn tài nguyên, dễ lỗi.',
  'Pattern: Singleton — chỉ một instance DatabaseConnection cho cả server.',
  '',
  '[MÀN HÌNH] server/src/patterns/singleton/DatabaseConnection.js',
  '[CODE CHỈ]',
  '  • static getInstance() — dòng getInstance',
  '  • constructor throw nếu gọi new lần 2',
  '  • async connect() — mongoose.connect một lần',
  '',
  '[MÀN HÌNH] server/src/config/db.js → connectDatabase()',
  '[MÀN HÌNH] server/src/index.js → await connectDatabase() khi start',
  '',
  '[LỜI NÓI] Khi server khởi động, connectDatabase gọi getInstance().connect() một lần. Mọi Model Order, Product dùng chung connection pool Mongoose.',
  '[DEMO] Chạy npm run dev server — log listening; mở DatabaseConnection.js chỉ getInstance.',
  '',
  'Thuật ngữ GoF: Singleton, getInstance(), Client = index.js',
);

// ===== STRATEGY =====
title('PATTERN 2 & 3 — STRATEGY (🏠) ~2.5 PHÚT');

h('[5:30 – 6:45] Strategy — Thanh toán');
t(
  'Vấn đề: COD, VNPAY, trả góp có logic khác nhau (initial status, validate, URL thanh toán). if/else dài khó mở rộng.',
  'Pattern: Strategy — mỗi phương thức là class implement cùng interface.',
  '',
  '[MÀN HÌNH] server/src/patterns/payment/PaymentStrategy.js — class cơ sở',
  '[CODE CHỈ] getInitialOrderStatus(), validateCheckout(), buildPostCreatePayload()',
  '',
  '[MÀN HÌNH] CodPaymentStrategy.js — getInitialOrderStatus return confirmed',
  '[MÀN HÌNH] VnpayPaymentStrategy.js — return pending + applyPaymentSuccess',
  '[MÀN HÌNH] paymentStrategyRegistry.js — resolvePaymentStrategy(method)',
  '',
  '[MÀN HÌNH] server/src/routes/orders.js',
  '[CODE CHỈ] resolvePaymentStrategy(rawPaymentMethod) — dòng checkout',
  '',
  '[MÀN HÌNH WEB] /checkout — đổi COD ↔ VNPAY',
  '[LỜI NÓI] Client checkout chỉ gọi interface. Thêm MoMo chỉ cần class mới + đăng ký registry — Open/Closed Principle.',
  '',
  'Thuật ngữ: Strategy (interface), ConcreteStrategy, Context = orders.js, Registry',
);

h('[6:45 – 8:00] Strategy — Giảm giá coupon');
t(
  'Vấn đề: Coupon giảm % và giảm cố định VND — công thức khác nhau.',
  '',
  '[MÀN HÌNH] patterns/discount/DiscountStrategy.js',
  '[MÀN HÌNH] PercentageDiscountStrategy.js + FixedDiscountStrategy.js',
  '[MÀN HÌNH] discountStrategyRegistry.js — getDiscountStrategy(type)',
  '[MÀN HÌNH] server/src/services/pricing.js — calculatePricing()',
  '',
  '[MÀN HÌNH WEB] /checkout — nhập mã coupon, thấy dòng giảm giá',
  '[LỜI NÓI] Pricing service không biết công thức cụ thể — delegate theo discountType.',
);

// ===== STATE =====
title('PATTERN 4 — STATE ĐƠN HÀNG (🏠) ~2.5 PHÚT');

h('[8:00 – 10:30]');
t(
  'Vấn đề: Đơn hàng có nhiều trạng thái (pending, confirmed, shipping…). GHN, VNPAY, admin đều có thể đổi status — cần một cổng validate thống nhất.',
  'Pattern: State — mọi chuyển trạng thái qua service trung tâm.',
  '',
  '[MÀN HÌNH] server/src/patterns/state/orderTransitionService.js',
  '[CODE CHỈ]',
  '  • applySystemOrderTransition() — GHN, VNPAY, demo',
  '  • applyAdminOrderTransition() — admin override',
  '  • applyOrderCancellation() — hủy đơn',
  '',
  '[MÀN HÌNH] server/src/services/orderStateMachine.js',
  '[CODE CHỈ] validateSystemTransition() — kiểm tra from → to hợp lệ',
  '',
  '[MÀN HÌNH] constants/orderStatus.js — shouldTransitionOrderStatus()',
  '',
  'Luồng nói nhanh:',
  '  COD checkout → confirmed (PaymentStrategy)',
  '  VNPAY → pending → IPN → confirmed (VnpayPaymentStrategy + transition service)',
  '  GHN → Adapter đổi status → applySystemOrderTransition',
  '',
  '[MÀN HÌNH WEB] /account/orders/:id — stepper 6 bước',
  '[DEMO] Đặt đơn COD → mở Order Detail → chỉ stepper',
  '',
  'Thuật ngữ: Context = orderTransitionService, State transitions, validate trước khi save',
);

// ===== ADAPTER =====
title('PATTERN 5 — ADAPTER GHN (🏠) ~1.5 PHÚT');

h('[10:30 – 12:00]');
t(
  'Vấn đề: GHN API dùng mã status riêng (transporting, ready_to_pick). Web TechPhone dùng mã nội bộ (shipping, await_pickup).',
  'Pattern: Adapter — chuyển đổi interface hai hệ thống.',
  '',
  '[MÀN HÌNH] patterns/adapters/CarrierStatusAdapter.js — Target interface',
  '[MÀN HÌNH] patterns/adapters/GhnStatusAdapter.js',
  '[CODE CHỈ] toOrderStatus(ghnStatus) — ví dụ transporting → shipping',
  '',
  '[MÀN HÌNH] server/src/services/ghnShipment.js — gọi adapter rồi State',
  '',
  '[LỜI NÓI] Adapter chỉ DỊCH mã. State Pattern mới quyết định được phép lưu status hay không. Sau này tích hợp GHTK chỉ thêm GhtkStatusAdapter.',
  '',
  'Thuật ngữ: Adaptee = GHN API, Target = CarrierStatusAdapter, Adapter = GhnStatusAdapter, Client = ghnShipment.js',
  '[DEMO] Mở file map status; hoặc đơn có GHN trên Admin Orders',
);

// ===== COMMAND =====
title('PATTERN 6 — COMMAND AI (🏠) ~1.5 PHÚT');

h('[12:00 – 13:30]');
t(
  'Vấn đề: Chatbox AI cần nhiều tool (tìm SP, xem đơn…). Switch/case rải rác khó thêm tool.',
  'Pattern: Command — mỗi tool là object có execute() + declaration cho Gemini.',
  '',
  '[MÀN HÌNH] patterns/commands/AiToolCommandRegistry.js',
  '[CODE CHỈ]',
  '  • class AiToolCommand — execute(), declaration',
  '  • COMMANDS array — 5 tools: searchProducts, getTopProducts, getMyOrders…',
  '',
  '[MÀN HÌNH] aiChatToolHandlers.js — logic MongoDB',
  '[MÀN HÌNH] server/src/services/gemini.js — gọi executeToolCommand()',
  '',
  '[MÀN HÌNH WEB] Chat widget → tab AI',
  '[DEMO] Hỏi: "iPhone rẻ nhất?" hoặc "đơn hàng của tôi"',
  '',
  'Thuật ngữ: Command, ConcreteCommand, Invoker = gemini.js, Receiver = handlers',
);

// ===== CHAIN =====
title('PATTERN 7 — CHAIN OF RESPONSIBILITY (📦 Express) ~2 PHÚT');

h('[13:30 – 15:30]');
t(
  'Vấn đề: Request API cần kiểm tra auth theo tầng — guest, user, admin.',
  'Pattern: Chain of Responsibility — Express middleware, mỗi handler xử lý hoặc chuyển next().',
  '',
  '[MÀN HÌNH] server/src/middleware/auth.js',
  '[CODE CHỈ]',
  '  • optionalAuth — không token vẫn next() (guest checkout)',
  '  • requireAuth — thiếu token → 401 STOP',
  '  • requireAdmin — không phải admin → 403 STOP',
  '',
  '[MÀN HÌNH] server/src/index.js — app.use(optionalAuth) trước cart/orders',
  '[MÀN HÌNH] admin.orders.js — router.use(requireAuth, requireAdmin)',
  '',
  '[MÀN HÌNH] src/components/ProtectedRoute.jsx — frontend tương tự',
  '',
  '[DEMO]',
  '  1. Gọi /api/admin/orders không token → 401 (Network tab)',
  '  2. Vào /admin chưa login → redirect login',
  '',
  'Thuật ngữ: Handler, next(), Client = Express app',
  '[LỜI NÓI] Đây là pattern từ thư viện Express — em cấu hình pipeline, không tự viết framework.',
);

// ===== OBSERVER =====
title('PATTERN 8 — OBSERVER (📦 Socket.io + React) ~2 PHÚT');

h('[15:30 – 17:30]');
t(
  'Vấn đề: Chat hỗ trợ cần cập nhật tin nhắn real-time không refresh trang.',
  'Pattern: Observer / Pub-Sub — Subject emit event, Observer đăng ký socket.on.',
  '',
  '[MÀN HÌNH] server/src/socket.js',
  '[CODE CHỈ] io.to(room).emit("message:new", payload) — sau sendMessage',
  '',
  '[MÀN HÌNH] src/context/SupportChatContext.jsx',
  '[CODE CHỈ] socket.on("message:new", handler) — cập nhật setState',
  '',
  '[LỜI NÓI] KHÔNG phải user abstract báo user con. Server là Subject phát event; client subscribe qua socket.on. Room conversation:id và admin:support là nhóm observer.',
  '',
  '[DEMO QUAN TRỌNG — quay 2 tab]',
  '  Tab 1: khách — gửi tin chat',
  '  Tab 2: admin /admin/support — thấy tin ngay',
  '',
  'Thuật ngữ: Subject, Observer, Attach = socket.on, Notify = emit, Update = setState',
);

// ===== TEMPLATE + FACADE =====
title('PATTERN 9 & 10 — TEMPLATE METHOD + FACADE (🏠) ~1 PHÚT');

h('[17:30 – 18:30]');
t(
  'Template Method — khung stepper cố định:',
  '[MÀN HÌNH] orderStateMachine.js — buildTrackingSteps() dòng 105–126',
  '[CODE CHỈ] TRACKING_STEP_KEYS.map — 6 bước, điền done/active/error theo status',
  '[MÀN HÌNH WEB] Order Detail stepper',
  '',
  'Facade — che API phức tạp:',
  '[MÀN HÌNH] src/config/api.js — authFetch()',
  '[MÀN HÌNH] server/src/services/vnpay.js — HMAC + URL',
  '[LỜI NÓI] Frontend gọi authFetch thay vì tự ghép header JWT. VNPAY facade che chi tiết HMAC.',
  '',
  'Thuật ngữ Template: Template Method = buildTrackingSteps, Primitive Operation = STATUS_TO_STEP',
);

// ===== LIBRARY + KET =====
title('PHẦN 3 — PATTERN THƯ VIỆN & KẾT LUẬN (1.5–2 PHÚT)');

h('[18:30 – 19:15] Pattern từ thư viện (nhắc nhanh)');
t(
  'Composite (📦 React): App.jsx → Layout → Page — cây component. Demo: React DevTools.',
  'Repository (📦 Mongoose): models/Order.js, Product.js — truy cập DB.',
  'Front Controller (📦 React Router): App.jsx route map.',
  'Unit of Work (📦 MongoDB): orders.js checkout transaction — rollback nếu lỗi.',
  'State flash sale (🏠): flashSaleStateRegistry.js — resolveFlashSaleState()',
);

h('[19:15 – 20:00] Kết luận');
t(
  '[LỜI NÓI] Tóm lại em áp dụng 7 pattern tự viết trong patterns/ và nhiều pattern từ Express, React, Socket.io. Pattern giúp tách nghiệp vụ, dễ mở rộng — Strategy thêm payment, Adapter thêm carrier, State gom đổi status đơn hàng.',
  '[MÀN HÌNH] Quay lại folder patterns/ — panorama cuối clip.',
  'Em xin cảm ơn thầy/cô. Em sẵn sàng trả lời câu hỏi.',
);

title('PHỤ LỤC — CHECKLIST TRƯỚC KHI QUAY');
t(
  '☐ Server + MongoDB + Frontend đang chạy',
  '☐ Có tài khoản admin + customer để demo',
  '☐ VS Code zoom font 14–16, theme dễ đọc khi quay',
  '☐ Thu nhỏ tab thừa — chỉ IDE + Browser',
  '☐ Thử mic + thời gian 1 lần (hẹn giờ 20 phút)',
  '☐ Clip demo Observer: mở sẵn 2 tab trước khi quay',
  '☐ File tham chiếu: PATTERN-MAP.md, HUONG-DAN-TRINH-BAY.md',
);

title('PHỤ LỤC — MAP FILE NHANH KHI GIẢNG VIÊN HỎI');
t(
  'Singleton     → patterns/singleton/DatabaseConnection.js',
  'Strategy pay  → patterns/payment/ + orders.js checkout',
  'Strategy disc → patterns/discount/ + pricing.js',
  'State order   → patterns/state/orderTransitionService.js',
  'Adapter       → patterns/adapters/GhnStatusAdapter.js',
  'Command       → patterns/commands/AiToolCommandRegistry.js',
  'Chain         → middleware/auth.js + index.js',
  'Observer      → socket.js + SupportChatContext.jsx',
  'Template      → orderStateMachine.buildTrackingSteps()',
  'Facade        → src/config/api.js',
);

const body = L.join('');
const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${body}<w:sectPr>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
  </w:sectPr></w:body>
</w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="vi-VN"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>`;

const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Kich ban trinh bay TechPhone Design Pattern</dc:title>
  <dc:creator>TechPhone</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-08-03T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-08-03T00:00:00Z</dcterms:modified>
</cp:coreProperties>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function zipLocalFile(name, data) {
  const nameBuf = Buffer.from(name, 'utf8');
  const comp = zlib.deflateRawSync(data);
  const localHeader = Buffer.alloc(30 + nameBuf.length);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(8, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt32LE(crc32(data), 14);
  localHeader.writeUInt32LE(comp.length, 18);
  localHeader.writeUInt32LE(data.length, 22);
  localHeader.writeUInt16LE(nameBuf.length, 26);
  localHeader.writeUInt16LE(0, 28);
  nameBuf.copy(localHeader, 30);
  const central = Buffer.alloc(46 + nameBuf.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt32LE(crc32(data), 16);
  central.writeUInt32LE(comp.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42);
  nameBuf.copy(central, 46);
  return { localHeader, comp, central, offsetSize: localHeader.length + comp.length };
}

const files = [
  ['[Content_Types].xml', contentTypes],
  ['_rels/.rels', rels],
  ['docProps/core.xml', coreXml],
  ['word/_rels/document.xml.rels', documentRels],
  ['word/styles.xml', stylesXml],
  ['word/document.xml', documentXml],
];

let offset = 0;
const parts = [];
const centralParts = [];
for (const [name, content] of files) {
  const data = Buffer.from(content, 'utf8');
  const z = zipLocalFile(name, data);
  parts.push(z.localHeader, z.comp);
  centralParts.push({ central: z.central, offset });
  offset += z.offsetSize;
}

const centralDir = Buffer.concat(centralParts.map((x) => x.central));
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDir.length, 12);
end.writeUInt32LE(offset, 16);
end.writeUInt16LE(0, 20);

const outPath = path.join(__dirname, 'KICH-BAN-TRINH-BAY-20PHUT-v2.docx');
const mdPath = path.join(__dirname, 'KICH-BAN-TRINH-BAY-20PHUT.md');
fs.writeFileSync(outPath, Buffer.concat([...parts, centralDir, end]));
fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf8');
console.log('Created:', outPath);
console.log('Created:', mdPath);
