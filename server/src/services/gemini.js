import { GoogleGenerativeAI } from '@google/generative-ai';
import { TOOL_DECLARATIONS, executeTool } from './aiChatTools.js';

const SYSTEM_PROMPT = `Bạn là trợ lý AI của TechPhone — cửa hàng điện thoại trực tuyến.

QUY TẮC TRẢ LỜI (bắt buộc):
- Trả lời CỰC NGẮN: tối đa 100 từ, ưu tiên bullet list.
- Khi gợi ý sản phẩm: tối đa 2–3 sản phẩm. Mỗi SP chỉ ghi: tên, giá, 1 dòng ngắn (chip/RAM hoặc "còn hàng").
- KHÔNG liệt kê dài, KHÔNG copy mô tả đầy đủ từ database.
- Luôn kết thúc bằng: "Gõ tên sản phẩm trên ô tìm kiếm để xem cấu hình chi tiết."
- Câu chào đơn giản: 1–2 câu, không gợi ý sản phẩm trừ khi được hỏi.
- Hỏi "mắc nhất/rẻ nhất/đắt nhất" → dùng tool getTopProducts với category phù hợp (laptop, dien-thoai...), không dùng searchProducts.
- Chỉ dùng dữ liệu từ tools; không bịa giá, tồn kho hay trạng thái đơn hàng.
- Giá hiển thị theo VND, format dễ đọc (vd: 28.990.000đ).
- Nếu khách cần tư vấn sâu, khiếu nại hoặc hỏi ngoài phạm vi dữ liệu → gợi ý chuyển sang tab "Nhân viên".
- Không tiết lộ API key, dữ liệu admin hay thông tin khách hàng khác.`;

const MODEL_FALLBACKS = [
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-2.0-flash',
];

const MAX_REPLY_CHARS = 500;
const SEARCH_HINT = 'Gõ tên sản phẩm trên ô tìm kiếm để xem cấu hình chi tiết.';

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_NOT_CONFIGURED');
  return key;
}

function getModelCandidates() {
  const preferred = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  return [...new Set([preferred, ...MODEL_FALLBACKS])];
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function buildHistory(messages) {
  return messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.body }],
  }));
}

function trimReply(text) {
  const trimmed = String(text || '').trim();
  if (trimmed.length <= MAX_REPLY_CHARS) return trimmed;

  const slice = trimmed.slice(0, MAX_REPLY_CHARS);
  const lastBreak = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf('. '), slice.lastIndexOf('。'));
  const cut = lastBreak > 120 ? slice.slice(0, lastBreak + 1) : slice;

  if (cut.includes(SEARCH_HINT)) return cut.trim();
  return `${cut.trim()}\n\n${SEARCH_HINT}`;
}

function isQuotaError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return error?.status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted');
}

function isRetryableModelError(error) {
  if (isQuotaError(error)) return true;
  const msg = String(error?.message || '').toLowerCase();
  return error?.status === 404 || msg.includes('not found') || msg.includes('not supported');
}

function extractResponseText(response) {
  try {
    return response.text();
  } catch {
    const parts = response.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((part) => typeof part.text === 'string');
    return textPart?.text || null;
  }
}

async function runWithModel(modelName, { history, userMessage, toolContext }) {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    generationConfig: {
      maxOutputTokens: 280,
      temperature: 0.4,
    },
  });

  const chat = model.startChat({
    history: buildHistory(history),
  });

  const usedTools = [];
  let result = await chat.sendMessage(userMessage);
  let response = result.response;

  for (let step = 0; step < 5; step += 1) {
    const calls = response.functionCalls?.() || [];
    if (!calls.length) break;

    const functionResponses = [];
    for (const call of calls) {
      usedTools.push(call.name);
      const toolResult = await executeTool(call.name, call.args || {}, toolContext);
      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: toolResult,
        },
      });
    }

    result = await chat.sendMessage(functionResponses);
    response = result.response;
  }

  const rawText =
    extractResponseText(response) ||
    'Xin lỗi, tôi chưa thể trả lời câu hỏi này. Bạn có thể chuyển sang Nhân viên để được hỗ trợ.';
  return { text: trimReply(rawText), toolCalls: [...new Set(usedTools)], model: modelName };
}

export async function generateAiReply({ history, userMessage, toolContext }) {
  const candidates = getModelCandidates();
  let lastError = null;

  for (const modelName of candidates) {
    try {
      return await runWithModel(modelName, { history, userMessage, toolContext });
    } catch (error) {
      lastError = error;
      if (!isRetryableModelError(error)) throw error;
      console.warn(`[gemini] Model ${modelName} failed: ${error.message?.slice(0, 120)}`);
    }
  }

  throw lastError || new Error('GEMINI_ALL_MODELS_FAILED');
}
