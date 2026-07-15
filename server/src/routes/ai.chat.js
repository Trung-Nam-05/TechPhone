import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { clearAiSession, getOrCreateAiSession, sendAiChatMessage } from '../services/aiChat.js';
import { isGeminiConfigured } from '../services/gemini.js';

const router = express.Router();

router.use(optionalAuth);

router.get('/session', async (req, res, next) => {
  try {
    if (!isGeminiConfigured()) {
      return res.status(503).json({ message: 'Gemini AI chưa được cấu hình.' });
    }
    const payload = await getOrCreateAiSession(req);
    return res.json({
      session: payload.session,
      messages: payload.messages,
    });
  } catch (error) {
    if (error.message === 'MISSING_SESSION') {
      return res.status(400).json({ message: 'Thiếu session id. Tải lại trang và thử lại.' });
    }
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (!isGeminiConfigured()) {
      return res.status(503).json({ message: 'Gemini AI chưa được cấu hình.' });
    }
    const result = await sendAiChatMessage(req, req.body?.message);
    return res.status(201).json(result);
  } catch (error) {
    if (error.message === 'MISSING_SESSION') {
      return res.status(400).json({ message: 'Thiếu session id. Tải lại trang và thử lại.' });
    }
    if (error.message === 'EMPTY_MESSAGE' || error.message === 'MESSAGE_TOO_LONG') {
      return res.status(400).json({ message: 'Tin nhắn không hợp lệ.' });
    }
    if (error.message === 'RATE_LIMIT') {
      return res.status(429).json({ message: 'Bạn gửi quá nhiều tin. Vui lòng đợi một chút.' });
    }
    if (error.message === 'GEMINI_NOT_CONFIGURED') {
      return res.status(503).json({ message: 'Gemini AI chưa được cấu hình.' });
    }
    console.error('[ai-chat]', error?.message || error);
    const msg = String(error.message || '');
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      return res.status(503).json({ message: 'API key Gemini không hợp lệ. Kiểm tra GEMINI_API_KEY trong .env.' });
    }
    if (error.message === 'GEMINI_ALL_MODELS_FAILED' || (msg.includes('429') && msg.includes('quota'))) {
      return res.status(429).json({
        message: 'Đã hết quota Gemini free tier. Đổi GEMINI_MODEL hoặc tạo API key mới trên Google AI Studio.',
      });
    }
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource_exhausted')) {
      return res.status(429).json({
        message: 'AI tạm quá tải. Thử lại sau hoặc chuyển sang Nhân viên.',
      });
    }
    if (msg.toLowerCase().includes('text') || msg.toLowerCase().includes('candidate')) {
      return res.status(503).json({
        message: 'AI chưa trả lời được câu hỏi này. Vui lòng thử lại hoặc chuyển sang Nhân viên.',
      });
    }
    return res.status(503).json({
      message: 'AI tạm thời gặp sự cố. Vui lòng thử lại sau hoặc chuyển sang Nhân viên.',
    });
  }
});

router.delete('/session', async (req, res, next) => {
  try {
    await clearAiSession(req);
    return res.status(204).send();
  } catch (error) {
    if (error.message === 'MISSING_SESSION') {
      return res.status(400).json({ message: 'Thiếu session id.' });
    }
    return next(error);
  }
});

export default router;
