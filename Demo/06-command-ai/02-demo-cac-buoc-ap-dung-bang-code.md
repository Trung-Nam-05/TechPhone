# Command — AI Tools: Demo các bước áp dụng bằng code

## Bước 1 — Đóng gói mỗi tool thành Command

```js
export class AiToolCommand {
  constructor(name, description, parameters, handler) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.handler = handler;
  }

  get declaration() {
    return { name: this.name, description: this.description, parameters: this.parameters };
  }

  async execute(args, context) {
    return this.handler(args || {}, context);
  }
}
```

## Bước 2 — Đăng ký danh sách command

```js
const COMMANDS = [
  new AiToolCommand('searchProducts', 'Tìm sản phẩm...', { type: 'object', properties: {...} }, searchProducts),
  new AiToolCommand('getMyOrders', 'Lấy đơn của tôi...', { type: 'object', properties: {...} }, getMyOrders),
  // ...
];

const COMMAND_BY_NAME = new Map(COMMANDS.map((c) => [c.name, c]));
export const TOOL_DECLARATIONS = COMMANDS.map((c) => c.declaration);
```

## Bước 3 — Thực thi theo tên, bỏ switch

```js
// trước: if (toolName === 'searchProducts') ...
// sau:
export async function executeToolCommand(name, args, context) {
  const command = COMMAND_BY_NAME.get(name);
  if (!command) throw new Error(`Unknown tool: ${name}`);
  return command.execute(args, context);
}
```

## File thật trong project

`server/src/patterns/commands/AiToolCommandRegistry.js`, `aiChatToolHandlers.js`
