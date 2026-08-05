# Facade — AI Tools: Demo các bước áp dụng bằng code

## Bước 1 — Tạo file mặt tiền gom API cần dùng

```js
// server/src/services/aiChatTools.js
export {
  getMyOrders,
  getOrderTimeline,
  getProductDetail,
  getTopProducts,
  searchProducts,
} from '../patterns/commands/aiChatToolHandlers.js';

export {
  TOOL_DECLARATIONS,
  executeToolCommand as executeTool,
} from '../patterns/commands/AiToolCommandRegistry.js';
```

## Bước 2 — Consumer chỉ import facade

```js
// trước
import { searchProducts } from '../patterns/commands/aiChatToolHandlers.js';
import { TOOL_DECLARATIONS, executeToolCommand } from '../patterns/commands/AiToolCommandRegistry.js';

// sau
import { searchProducts, TOOL_DECLARATIONS, executeTool } from '../services/aiChatTools.js';
```

## Bước 3 — Đổi nội bộ Command/handlers mà không đổi chỗ gọi ngoài

```js
// gemini / ai service vẫn gọi:
await executeTool(toolName, args, context);
// dù bên trong registry có tách file thêm
```

## File thật trong project

`server/src/services/aiChatTools.js`
