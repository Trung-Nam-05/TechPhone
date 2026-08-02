/**
 * Facade — re-export handlers + Command registry cho gemini.js và các consumer cũ.
 */
export {
  getMyOrders,
  getOrderTimeline,
  getProductDetail,
  getTopProducts,
  searchProducts,
} from '../patterns/commands/aiChatToolHandlers.js';

export { TOOL_DECLARATIONS, executeToolCommand as executeTool } from '../patterns/commands/AiToolCommandRegistry.js';
