import {
  getMyOrders,
  getOrderTimeline,
  getProductDetail,
  getTopProducts,
  searchProducts,
} from './aiChatToolHandlers.js';

/**
 * Command Pattern — AI tool registry
 * Mỗi tool là một command object: execute() + declaration cho Gemini.
 *
 * @see docs/design-patterns/HUONG-DAN-TRINH-BAY.md — mục 6 (Command — AI Chat)
 */
export class AiToolCommand {
  /**
   * @param {string} name
   * @param {string} description
   * @param {object} parameters JSON schema
   * @param {(args: object, context: object) => Promise<object>} handler
   */
  constructor(name, description, parameters, handler) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.handler = handler;
  }

  get declaration() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    };
  }

  async execute(args, context) {
    return this.handler(args || {}, context);
  }
}

const COMMANDS = [
  new AiToolCommand(
    'searchProducts',
    'Tìm sản phẩm theo tên, hãng, danh mục hoặc giá tối đa. Trả về tối đa 3 kết quả.',
    {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Từ khóa tìm kiếm, ví dụ iPhone 15' },
        category: { type: 'string', description: 'Mã danh mục, ví dụ dien-thoai' },
        brand: { type: 'string', description: 'Thương hiệu, ví dụ Apple, Samsung' },
        maxPrice: { type: 'number', description: 'Giá tối đa VND' },
        limit: { type: 'number', description: 'Số kết quả (mặc định 3)' },
      },
    },
    (args) => searchProducts(args),
  ),
  new AiToolCommand(
    'getTopProducts',
    'Lấy sản phẩm đắt nhất hoặc rẻ nhất theo giá. Dùng khi hỏi mắc nhất/rẻ nhất/đắt nhất. category: dien-thoai, laptop, phu-kien, dien-may.',
    {
      type: 'object',
      properties: {
        sort: { type: 'string', description: 'price_desc (đắt nhất) hoặc price_asc (rẻ nhất)' },
        category: { type: 'string', description: 'Mã danh mục, ví dụ dien-thoai' },
        limit: { type: 'number', description: 'Số kết quả (mặc định 3)' },
      },
    },
    (args) => getTopProducts(args),
  ),
  new AiToolCommand(
    'getProductDetail',
    'Lấy chi tiết một sản phẩm theo slug hoặc id.',
    {
      type: 'object',
      properties: {
        slugOrId: { type: 'string', description: 'Slug hoặc MongoDB id sản phẩm' },
      },
      required: ['slugOrId'],
    },
    (args) => getProductDetail(args),
  ),
  new AiToolCommand(
    'getMyOrders',
    'Lấy danh sách đơn hàng gần nhất của khách đang đăng nhập. Chỉ dùng khi user đã login.',
    { type: 'object', properties: {} },
    (_args, context) => getMyOrders({ userId: context.userId }),
  ),
  new AiToolCommand(
    'getOrderTimeline',
    'Tra cứu trạng thái đơn hàng theo mã đơn (ví dụ LAN7EW). Chỉ đơn của user đang login.',
    {
      type: 'object',
      properties: {
        orderCode: { type: 'string', description: 'Mã đơn hàng TechPhone' },
      },
      required: ['orderCode'],
    },
    (args, context) => getOrderTimeline({ userId: context.userId, orderCode: args?.orderCode }),
  ),
];

const COMMAND_MAP = new Map(COMMANDS.map((command) => [command.name, command]));

export const TOOL_DECLARATIONS = COMMANDS.map((command) => command.declaration);

export async function executeToolCommand(name, args, context = {}) {
  const command = COMMAND_MAP.get(name);
  if (!command) return { error: 'unknown_tool' };
  return command.execute(args, context);
}

export { COMMANDS };
