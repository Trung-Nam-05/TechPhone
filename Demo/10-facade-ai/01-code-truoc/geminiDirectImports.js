/**
 * =====================================================================
 * CODE TRƯỚC KHI ÁP DỤNG — Facade (AI Tools)
 * =====================================================================
 * Vấn đề: service AI import nhiều module nội bộ, bị gắn chặt cấu trúc thư mục
 * =====================================================================
 */

// Minh họa import "xuyên tầng" trước khi có facade:
// import { searchProducts, getTopProducts, getProductDetail, getMyOrders, getOrderTimeline }
//   from '../patterns/commands/aiChatToolHandlers.js';
// import { TOOL_DECLARATIONS, executeToolCommand }
//   from '../patterns/commands/AiToolCommandRegistry.js';

export function createGeminiServiceBeforePattern(deps) {
  const {
    searchProducts,
    getTopProducts,
    getProductDetail,
    getMyOrders,
    getOrderTimeline,
    TOOL_DECLARATIONS,
    executeToolCommand,
  } = deps;

  return {
    getToolDeclarations() {
      return TOOL_DECLARATIONS;
    },

    async answerWithTools(userMessage, history, context) {
      // Giả lập model quyết định gọi tool
      const maybeTool = detectToolFromMessage(userMessage);

      if (maybeTool) {
        // Consumer phải biết đúng hàm execute của registry
        const toolResult = await executeToolCommand(maybeTool.name, maybeTool.args, context);
        return {
          role: 'assistant',
          body: `Đã gọi ${maybeTool.name}`,
          toolResult,
        };
      }

      // Đôi khi gọi thẳng handler — càng gắn chặt hơn
      if (userMessage.includes('top')) {
        const items = await getTopProducts({ sort: 'price_desc', limit: 3 });
        return { role: 'assistant', body: 'Top sản phẩm', items };
      }

      return {
        role: 'assistant',
        body: 'Xin chào, tôi có thể tìm sản phẩm hoặc tra đơn hàng.',
        availableDirectHandlers: {
          searchProducts: typeof searchProducts,
          getProductDetail: typeof getProductDetail,
          getMyOrders: typeof getMyOrders,
          getOrderTimeline: typeof getOrderTimeline,
        },
      };
    },
  };
}

function detectToolFromMessage(message = '') {
  const text = message.toLowerCase();
  if (text.includes('tìm') || text.includes('search')) {
    return { name: 'searchProducts', args: { search: message } };
  }
  if (text.includes('đơn')) {
    return { name: 'getMyOrders', args: {} };
  }
  return null;
}
