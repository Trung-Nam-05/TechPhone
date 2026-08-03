/**
 * Generate HUONG-DAN-VAN-DAP-PATTERN.docx using only Node built-ins.
 * Run: node docs/design-patterns/_gen_docx.js
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function p(text, opts = {}) {
  const { bold = false, heading = false } = opts;
  const sz = heading ? '32' : '24';
  const rPr = bold ? '<w:rPr><w:b/><w:sz w:val="' + sz + '"/></w:rPr>' : '<w:rPr><w:sz w:val="' + sz + '"/></w:rPr>';
  const lines = String(text).split('\n');
  return lines
    .map((line) => {
      if (line === '') return '<w:p/>';
      return `<w:p><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`;
    })
    .join('');
}

const sections = [
  ['HUONG DAN VAN DAP DESIGN PATTERN — TECHPHONE', { heading: true }],
  ['Du an: TechPhone (React + Node.js/Express + MongoDB)', {}],
  ['Tai lieu tong hop pattern tu viet + pattern tu thu vien', {}],
  ['', {}],
  ['PHAN 0 — GIAI THICH FOLDER patterns/', { heading: true, bold: true }],
  ['Folder server/src/patterns/ CHI CHUA cac pattern em tu viet ro rang (Strategy, State, Adapter, Singleton, Command).', {}],
  ['Cac pattern KHAC (Chain of Responsibility, Observer, Composite, Facade, Template Method, Repository...) nam RAI RAC trong middleware, services, React components — day la BINH THUONG trong project thuc te.', {}],
  ['Ly do: Khong phai pattern nao cung can folder rieng. Express middleware = Chain san co; React component tree = Composite tu nhien. Chi nen tao folder patterns/ khi co nhieu class/interface can gom lai.', {}],
  ['Ket luan trinh bay: DU DAY DU cho giao vien — 8 pattern core trong patterns/ + 6 pattern phu/tu thu vien (xem bang tong hop cuoi tai lieu).', {}],
  ['', {}],
  ['PHAN 1 — MAP THUAT NGU DE THI (De 8) SANG TECHPHONE', { heading: true, bold: true }],
  ['De thi giao vien dung 4 pattern: Decorator, Template Method, Adapter, Composite+Strategy.', {}],
  ['', {}],
  ['1. DECORATOR (De thi Cau 1 — BHYT)', { bold: true }],
  ['Thuat ngu: Component, ConcreteComponent, Decorator, ConcreteDecorator, wrapped object.', {}],
  ['TechPhone: CHUA co Decorator tu viet ro. Gan nhat: pricing.js stack nhieu buoc (coupon, flash sale) nhung dang if/else — chi noi neu giao vien hoi mo rong.', {}],
  ['', {}],
  ['2. TEMPLATE METHOD (De thi Cau 2 — TraiCay)', { bold: true }],
  ['Thuat ngu: AbstractClass, Template Method (khuon thuat toan), Primitive Operation (buoc con override), Hook (buoc tuy chon).', {}],
  ['TechPhone map:', {}],
  ['  - AbstractClass / Template Method: buildTrackingSteps() trong orderStateMachine.js', {}],
  ['  - Primitive Operation: STATUS_TO_STEP, labels tu ORDER_STATE_REGISTRY', {}],
  ['  - Concrete subclasses: moi order.status la mot "trang thai cu the" — khong tach class rieng nhung y nghia giong de thi', {}],
  ['File: server/src/services/orderStateMachine.js (dong 105-126)', {}],
  ['UI: Order Detail stepper doc buildTrackingSteps tu API', {}],
  ['', {}],
  ['3. ADAPTER (De thi Cau 3 — Nhan vien giang day -> van phong)', { bold: true }],
  ['Thuat ngu: Target (interface mong muon), Adaptee (he thong cu/ngoai), Adapter (chuyen doi), Client (goi Target).', {}],
  ['TechPhone map:', {}],
  ['  - Target: CarrierStatusAdapter.toOrderStatus() — interface order.status noi bo', {}],
  ['  - Adaptee: GHN API status (ready_to_pick, transporting...)', {}],
  ['  - Adapter: GhnStatusAdapter extends CarrierStatusAdapter', {}],
  ['  - Client: ghnShipment.js, ghnSync.js, shipping.ghn.js', {}],
  ['Folder: server/src/patterns/adapters/', {}],
  ['', {}],
  ['4. COMPOSITE + STRATEGY (De thi Cau 4 — Co cau truong)', { bold: true }],
  ['Thuat ngu Composite: Component, Leaf, Composite, Client — cay phan cap, goi operation() tren ca node va leaf.', {}],
  ['Thuat ngu Strategy: Context, Strategy (interface), ConcreteStrategy, Client chon strategy.', {}],
  ['TechPhone map Strategy:', {}],
  ['  - Strategy interface: PaymentStrategy, DiscountStrategy', {}],
  ['  - ConcreteStrategy: CodPaymentStrategy, VnpayPaymentStrategy, PercentageDiscountStrategy...', {}],
  ['  - Context/Client: orders.js goi resolvePaymentStrategy(); pricing.js goi getDiscountStrategy()', {}],
  ['  - Registry: paymentStrategyRegistry.js, discountStrategyRegistry.js', {}],
  ['TechPhone map Composite:', {}],
  ['  - React component tree: App.jsx > Layout > Header/Footer/Outlet > Page components', {}],
  ['  - Leaf: Button, ProductCard; Composite: StoreLayout, AdminLayout', {}],
  ['', {}],
  ['PHAN 2 — CAC LOAI FILE TRONG 1 PATTERN (Registry vs Service vs Interface)', { heading: true, bold: true }],
  ['Vi du State Pattern (don hang) co nhieu file — vai tro tung loai:', {}],
  ['', {}],
  ['A. Interface / Abstract Class (Hop dong)', { bold: true }],
  ['  PaymentStrategy.js, DiscountStrategy.js, CarrierStatusAdapter.js', {}],
  ['  -> Dinh nghia method bat buoc. Tuong duong interface IPaymentStrategy trong C#.', {}],
  ['', {}],
  ['B. Concrete Class (Implementation)', { bold: true }],
  ['  CodPaymentStrategy.js, GhnStatusAdapter.js, PercentageDiscountStrategy.js', {}],
  ['  -> Class cu the implement interface. Moi thuat toan / trang thai mot class.', {}],
  ['', {}],
  ['C. Registry (Bang tra cuu / Factory nhe)', { bold: true }],
  ['  paymentStrategyRegistry.js, orderTransitionRegistry.js, AiToolCommandRegistry.js', {}],
  ['  -> Map key -> object. resolvePaymentStrategy("cod") tra ve CodPaymentStrategy.', {}],
  ['  -> KHONG chua logic nghiep vu lon — chi dang ky va tra ve dung instance.', {}],
  ['', {}],
  ['D. Service (Orchestrator / Context)', { bold: true }],
  ['  orderTransitionService.js — DIEM VAO DUY NHAT doi order.status', {}],
  ['  -> Goi validate (orderStateMachine) -> doi status -> ghi OrderEvent -> save DB', {}],
  ['  -> Day la "Context" trong State Pattern — noi pattern thuc su chay.', {}],
  ['', {}],
  ['E. Validator / Helper (Ho tro, khong phai pattern rieng)', { bold: true }],
  ['  orderStateMachine.js: validateSystemTransition, validateAdminStatusChange', {}],
  ['  constants/orderStatus.js: shouldTransitionOrderStatus, rank trang thai', {}],
  ['', {}],
  ['F. Facade (Re-export cho code cu)', { bold: true }],
  ['  orderSanitize.js -> re-export OrderCustomerProxy', {}],
  ['  aiChatTools.js -> re-export executeToolCommand', {}],
  ['  productGuards.js -> guard xoa san pham (business rules thuong)', {}],
  ['  -> Giup route cu khong phai doi import path.', {}],
  ['', {}],
  ['PHAN 3 — BANG TONG HOP PATTERN TRONG PROJECT', { heading: true, bold: true }],
  ['Pattern tu viet (trong patterns/ hoac module ro):', {}],
  ['1. State (don hang) — patterns/state/ + orderStateMachine.js — 10 diem goi', {}],
  ['2. State (flash sale) — patterns/state/flashSaleStateRegistry.js', {}],
  ['3. Strategy (thanh toan) — patterns/payment/ + src/patterns/paymentUiStrategies.js', {}],
  ['4. Strategy (giam gia) — patterns/discount/ + pricing.js', {}],
  ['5. Adapter (GHN) — patterns/adapters/', {}],
  ['6. Proxy (order khach) — patterns/proxy/OrderCustomerProxy.js', {}],
  ['7. Command (AI tools) — patterns/commands/', {}],
  ['8. Template Method — buildTrackingSteps()', {}],
  ['9. Template Method — buildTrackingSteps() trong orderStateMachine.js', {}],
  ['', {}],
  ['Pattern rai rac / tu thu vien:', {}],
  ['10. Chain of Responsibility — middleware/auth.js (optionalAuth, requireAuth, requireAdmin)', {}],
  ['11. Observer — socket.js + SupportChatContext.jsx', {}],
  ['12. Composite — React component tree (src/)', {}],
  ['13. Facade — api.js, vnpay.js, orderTimeline.js', {}],
  ['14. Repository + Active Record — Mongoose models/', {}],
  ['15. Front Controller — React Router App.jsx', {}],
  ['', {}],
  ['PHAN 4 — LUONG XU LY CHINH (de tra loi van dap)', { heading: true, bold: true }],
  ['Checkout:', {}],
  ['  Checkout.jsx -> resolvePaymentUiStrategy (Strategy UI)', {}],
  ['  -> POST /orders -> resolvePaymentStrategy (Strategy backend)', {}],
  ['  -> calculatePricing -> getDiscountStrategy (Strategy giam gia)', {}],
  ['  -> paymentStrategy.getInitialOrderStatus() (State khoi tao)', {}],
  ['', {}],
  ['VNPAY thanh cong:', {}],
  ['  payments.vnpay.js -> VnpayPaymentStrategy.applyPaymentSuccess()', {}],
  ['  -> orderTransitionService.applyVnpayPaymentSuccess() (State)', {}],
  ['', {}],
  ['GHN cap nhat:', {}],
  ['  webhook/poll -> GhnStatusAdapter.toOrderStatus() (Adapter)', {}],
  ['  -> applySystemOrderTransition() (State)', {}],
  ['', {}],
  ['Khach xem don:', {}],
  ['  GET /orders/:id -> createCustomerOrderView() (Proxy)', {}],
  ['  -> buildTrackingSteps() (Template Method) -> UI stepper', {}],
  ['', {}],
  ['PHAN 5 — CAU TRA LOI MAU CHO GIAO VIEN', { heading: true, bold: true }],
  ['Hoi: Pattern X nam o dau?', {}],
  ['Tra: Em gom core vao server/src/patterns/<ten>/, con route/service goi vao do. Chi tiet trong PATTERN-MAP.md.', {}],
  ['', {}],
  ['Hoi: Tai sao State co nhieu file?', {}],
  ['Tra: Registry luu metadata; Service la diem vao duy nhat; Validator kiem tra chuyen trang thai; Constants dinh nghia rank — tach file de Single Responsibility.', {}],
  ['', {}],
  ['Hoi: Strategy khac State?', {}],
  ['Tra: Strategy chon THUAT TOAN (COD vs VNPAY). State quan ly TRANG THAI (pending -> confirmed -> shipping). Checkout dung ca hai.', {}],
  ['', {}],
  ['Hoi: Adapter khac Facade?', {}],
  ['Tra: Adapter CHUYEN DOI interface hai he thong (GHN status -> order status). Facade DON GIAN HOA goi nhieu service (api.js che HTTP phuc tap).', {}],
  ['', {}],
  ['Tai lieu lien quan trong repo:', {}],
  ['  docs/design-patterns/PATTERN-MAP.md — bang day du vi tri ap dung', {}],
  ['  docs/design-patterns/HUONG-DAN-TRINH-BAY.md — huong dan demo live', {}],
];

const body = sections.map(([text, opts]) => p(text, opts)).join('');

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
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
const centralOffset = offset;
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(0, 4);
end.writeUInt16LE(0, 6);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralDir.length, 12);
end.writeUInt32LE(centralOffset, 16);
end.writeUInt16LE(0, 20);

const outPath = path.join(__dirname, 'HUONG-DAN-VAN-DAP-PATTERN.docx');
fs.writeFileSync(outPath, Buffer.concat([...parts, centralDir, end]));
console.log('Created:', outPath);
