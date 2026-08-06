import express from 'express';
import User from '../models/User.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { writeAdminAuditLog } from '../utils/audit.js';
import {
  getMailEnvStatus,
  isMailConfigured,
  renderFlashSaleEmail,
  resetMailTransport,
  sendFlashSaleMarketingEmail,
  translateSmtpError,
  verifyMailConnection,
} from '../services/mail.js';
import { getDefaultFlashSaleVariables } from '../services/emailTemplates.js';
import { isDeliverableContactEmail, MSG } from '../utils/userMessages.js';

const router = express.Router();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

router.use(requireAuth, requireAdmin);

router.get('/status', async (_req, res, next) => {
  try {
    const users = await User.find({
      role: 'customer',
      isActive: true,
      contactEmailVerified: true,
    })
      .select('contactEmail')
      .lean();

    const eligibleRecipients = users.filter((user) => isDeliverableContactEmail(user.contactEmail)).length;
    const mailEnv = getMailEnvStatus();
    const mailCheck = isMailConfigured() ? await verifyMailConnection() : { ok: false, reason: 'not_configured', hint: 'Thiếu SMTP_HOST / SMTP_USER / SMTP_PASS.' };

    res.json({
      mailConfigured: mailEnv.configured,
      mailVerified: mailCheck.ok,
      mailVerifyReason: mailCheck.ok ? '' : translateSmtpError(mailCheck.reason),
      mailEnv,
      templates: ['flash-sale'],
      eligibleRecipients,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/preview', async (req, res, next) => {
  try {
    const html = await renderFlashSaleEmail(req.body?.variables || {});
    return res.json({ html });
  } catch (error) {
    return next(error);
  }
});

router.post('/send-test', async (req, res, next) => {
  try {
    if (!isMailConfigured()) {
      return res.status(503).json({ message: 'SMTP chưa cấu hình. Xem docs/bao-cao-mon-hoc/HUONG_DAN_CAU_HINH_SMTP.md' });
    }

    const to = String(req.body?.to || '').trim().toLowerCase();
    if (!to || !to.includes('@')) {
      return res.status(400).json({ message: 'Email nhận thử (to) không hợp lệ.' });
    }

    const variables = getDefaultFlashSaleVariables(req.body?.variables || {});
    const sendResult = await sendFlashSaleMarketingEmail({ to, variables });

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'marketing.send_test',
      entityType: 'email',
      entityId: 'flash-sale',
      metadata: { to, promoCode: variables.promoCode, messageId: sendResult.messageId },
    });

    return res.json({
      ok: true,
      message: `Đã gửi email thử tới ${to}. Kiểm tra hộp thư (cả Spam).`,
      messageId: sendResult.messageId,
      accepted: sendResult.accepted,
    });
  } catch (error) {
    if (error?.message === 'MAIL_NOT_CONFIGURED') {
      return res.status(503).json({ message: 'SMTP chưa cấu hình.' });
    }
    return next(error);
  }
});

router.post('/send-campaign', async (req, res, next) => {
  try {
    if (!isMailConfigured()) {
      return res.status(503).json({ message: 'SMTP chưa cấu hình. Xem docs/bao-cao-mon-hoc/HUONG_DAN_CAU_HINH_SMTP.md' });
    }

    const role = String(req.body?.role || 'customer').trim();
    const users = await User.find({
      role: role === 'admin' ? 'admin' : 'customer',
      isActive: true,
    })
      .select('_id name email contactEmail contactEmailVerified')
      .lean();

    const recipients = [];
    for (const user of users) {
      if (!user.contactEmailVerified || !user.contactEmail) continue;
      const email = String(user.contactEmail).trim().toLowerCase();
      if (!isDeliverableContactEmail(email)) continue;
      recipients.push({ userId: String(user._id), email, name: user.name });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ message: MSG.MARKETING_NO_RECIPIENTS });
    }

    const variables = getDefaultFlashSaleVariables(req.body?.variables || {});
    const results = { sent: 0, failed: [] };

    for (const recipient of recipients) {
      try {
        await sendFlashSaleMarketingEmail({
          to: recipient.email,
          variables: { ...variables, customerName: recipient.name || variables.customerName },
        });
        results.sent += 1;
        await sleep(1500);
      } catch (error) {
        resetMailTransport();
        results.failed.push({ email: recipient.email, message: error?.message || 'send_failed' });
        await sleep(500);
      }
    }

    await writeAdminAuditLog({
      actor: req.auth.userId,
      action: 'marketing.send_campaign',
      entityType: 'email',
      entityId: 'flash-sale',
      metadata: { role, sent: results.sent, failed: results.failed.length, promoCode: variables.promoCode },
    });

    if (results.sent === 0) {
      return res.status(502).json({
        ok: false,
        message: MSG.MARKETING_SEND_FAILED,
        ...results,
      });
    }

    const partialNote = results.failed.length
      ? ` (${results.failed.length} email lỗi — xem chi tiết bên dưới)`
      : '';

    return res.json({
      ok: true,
      message: `Đã gửi ${results.sent}/${recipients.length} email marketing.${partialNote} Kiểm tra hộp thư Spam nếu khách chưa thấy.`,
      ...results,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
