import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Mail, Send, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AdminPageHeader from '../components/admin/AdminPageHeader';
import './AdminMarketing.css';

const DEFAULT_VARIABLES = {
  customerName: 'bạn',
  discountPercent: '10',
  promoCode: 'SALE10',
  expiresAt: '',
  preheaderText: 'Flash Sale TechPhone — giảm đến 10%, trả góp 0%, giao nhanh toàn quốc',
};

function defaultExpiresAt() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString('vi-VN');
}

export default function AdminMarketing() {
  const { authFetch, user } = useAuth();
  const [mailConfigured, setMailConfigured] = useState(false);
  const [mailVerified, setMailVerified] = useState(false);
  const [mailVerifyHint, setMailVerifyHint] = useState('');
  const [mailProvider, setMailProvider] = useState('');
  const [mailEnvKeys, setMailEnvKeys] = useState(null);
  const [eligibleRecipients, setEligibleRecipients] = useState(0);
  const [campaignFailures, setCampaignFailures] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [variables, setVariables] = useState({ ...DEFAULT_VARIABLES, expiresAt: defaultExpiresAt() });
  const [testEmail, setTestEmail] = useState(user?.email || '');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const payloadVariables = useMemo(
    () => ({
      customerName: variables.customerName.trim() || 'bạn',
      discountPercent: String(variables.discountPercent || '10').trim(),
      promoCode: variables.promoCode.trim().toUpperCase() || 'SALE10',
      expiresAt: variables.expiresAt.trim() || defaultExpiresAt(),
      preheaderText: variables.preheaderText.trim(),
    }),
    [variables],
  );

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const payload = await authFetch('/api/admin/marketing/status');
      setMailConfigured(Boolean(payload.mailConfigured));
      setMailVerified(Boolean(payload.mailVerified));
      setMailVerifyHint(payload.mailVerifyReason || '');
      setMailProvider(payload.mailProvider || payload.mailEnv?.provider || '');
      setMailEnvKeys(payload.mailEnv?.keys || null);
      setEligibleRecipients(Number(payload.eligibleRecipients) || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStatus(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handlePreview = async () => {
    setPreviewLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = await authFetch('/api/admin/marketing/preview', {
        method: 'POST',
        body: JSON.stringify({ variables: payloadVariables }),
      });
      setPreviewHtml(payload.html || '');
      setSuccess('Đã tải preview email.');
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendTest = async () => {
    const to = testEmail.trim();
    if (!to || !to.includes('@')) {
      setError('Email nhận thử không hợp lệ.');
      return;
    }
    setSendingTest(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = await authFetch('/api/admin/marketing/send-test', {
        method: 'POST',
        body: JSON.stringify({ to, variables: payloadVariables }),
      });
      setSuccess(payload.message || `Đã gửi email thử tới ${to}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendCampaign = async () => {
    const confirmed = window.confirm(
      `Gửi email Flash Sale tới ${eligibleRecipients} khách có email liên kết đã xác minh? Hãy chắc chắn đã xem preview trước.`,
    );
    if (!confirmed) return;

    setSendingCampaign(true);
    setError(null);
    setSuccess(null);
    setCampaignFailures([]);
    try {
      const payload = await authFetch('/api/admin/marketing/send-campaign', {
        method: 'POST',
        body: JSON.stringify({ role: 'customer', variables: payloadVariables }),
      });
      setSuccess(payload.message || 'Đã gửi campaign.');
      if (payload.failed?.length) {
        setCampaignFailures(payload.failed);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingCampaign(false);
    }
  };

  return (
    <div className="admin-page admin-marketing-page">
      <AdminPageHeader
        title="Email marketing"
        subtitle="Gửi email Flash Sale tới khách đã liên kết và xác minh email thật (Bảo mật tài khoản)."
        actions={(
          <span className={`admin-marketing-status ${mailConfigured && mailVerified ? 'is-ready' : 'is-pending'}`}>
            {loadingStatus
              ? 'Đang kiểm tra email...'
              : mailConfigured && mailVerified
                ? 'Email sẵn sàng'
                : mailConfigured
                  ? 'Email chưa kết nối được'
                  : 'Email chưa cấu hình'}
          </span>
        )}
      />

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}
      {campaignFailures.length > 0 && (
        <div className="admin-alert admin-alert-error">
          <strong>Email gửi lỗi:</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {campaignFailures.map((item) => (
              <li key={item.email}>{item.email}: {item.message}</li>
            ))}
          </ul>
        </div>
      )}

      {!loadingStatus && mailConfigured && !mailVerified && (
        <div className="admin-alert admin-alert-error">
          <strong>Email đã khai báo nhưng chưa kết nối được{mailProvider ? ` (${mailProvider})` : ''}.</strong>
          <p style={{ margin: '8px 0 0' }}>{mailVerifyHint || 'Kiểm tra cấu hình email trên Render.'}</p>
          {mailProvider === 'smtp' && (
            <p style={{ margin: '8px 0 0' }}>
              <strong>Render free chặn Gmail SMTP.</strong> Đăng ký miễn phí tại{' '}
              <a href="https://www.brevo.com" target="_blank" rel="noreferrer">brevo.com</a>
              {' '}→ lấy API key → thêm <code>BREVO_API_KEY</code> và <code>MAIL_FROM</code> trên Render → redeploy.
            </p>
          )}
          {mailEnvKeys && !mailEnvKeys.MAIL_FROM && (
            <p style={{ margin: '8px 0 0' }}>Gợi ý: thêm biến <code>MAIL_FROM=TechPhone &lt;shoptechphone99@gmail.com&gt;</code></p>
          )}
        </div>
      )}

      {!loadingStatus && !mailConfigured && (
        <div className="admin-alert admin-alert-error">
          Email chưa cấu hình trên server. Trên Render free: thêm <code>BREVO_API_KEY</code> + <code>MAIL_FROM</code>.
          Local dev: dùng <code>SMTP_HOST</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>.
        </div>
      )}

      <div className="admin-marketing-layout">
        <div className="admin-panel admin-marketing-form">
          <h2 className="admin-panel-title">Nội dung email</h2>
          <p className="admin-marketing-note">Template: Flash Sale (`server/templates/email/flash-sale.html`)</p>

          <div className="admin-form-group">
            <label>Tên khách (mẫu)</label>
            <input
              className="input"
              value={variables.customerName}
              onChange={(e) => setVariables((prev) => ({ ...prev, customerName: e.target.value }))}
              placeholder="VD: Nam"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">% giảm giá</label>
              <input
                className="input"
                value={variables.discountPercent}
                onChange={(e) => setVariables((prev) => ({ ...prev, discountPercent: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mã coupon</label>
              <input
                className="input"
                value={variables.promoCode}
                onChange={(e) => setVariables((prev) => ({ ...prev, promoCode: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label>Hạn mã ưu đãi</label>
            <input
              className="input"
              value={variables.expiresAt}
              onChange={(e) => setVariables((prev) => ({ ...prev, expiresAt: e.target.value }))}
              placeholder="VD: 10/08/2026"
            />
          </div>

          <div className="admin-form-group">
            <label>Preheader (dòng xem trước trong inbox)</label>
            <input
              className="input"
              value={variables.preheaderText}
              onChange={(e) => setVariables((prev) => ({ ...prev, preheaderText: e.target.value }))}
            />
          </div>

          <div className="admin-marketing-actions">
            <button type="button" className="btn btn-outline" onClick={handlePreview} disabled={previewLoading}>
              <Eye size={16} />
              {previewLoading ? 'Đang tải...' : 'Xem preview'}
            </button>
          </div>

          <hr className="admin-marketing-divider" />

          <h3 className="admin-marketing-subtitle">Gửi thử</h3>
          <div className="admin-form-group">
            <label>Email nhận thử</label>
            <input
              className="input"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="ban@gmail.com"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSendTest}
            disabled={!mailConfigured || sendingTest}
          >
            <Send size={16} />
            {sendingTest ? 'Đang gửi...' : 'Gửi email thử'}
          </button>

          <hr className="admin-marketing-divider" />

          <h3 className="admin-marketing-subtitle">Gửi campaign</h3>
          <p className="admin-marketing-note">
            Chỉ gửi tới khách đã liên kết và xác minh email thật. Hiện có {eligibleRecipients} người nhận.
          </p>
          <button
            type="button"
            className="btn btn-outline admin-marketing-campaign-btn"
            onClick={handleSendCampaign}
            disabled={!mailConfigured || sendingCampaign || eligibleRecipients === 0}
          >
            <Users size={16} />
            {sendingCampaign ? 'Đang gửi campaign...' : `Gửi tới ${eligibleRecipients} khách`}
          </button>
        </div>

        <div className="admin-panel admin-marketing-preview">
          <h2 className="admin-panel-title">Preview</h2>
          {!previewHtml && <p className="text-muted">Bấm &quot;Xem preview&quot; để hiển thị email.</p>}
          {previewHtml && (
            <iframe
              title="Email preview"
              className="admin-marketing-preview-frame"
              srcDoc={previewHtml}
              sandbox=""
            />
          )}
        </div>
      </div>
    </div>
  );
}
