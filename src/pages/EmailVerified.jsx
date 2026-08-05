import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';

const VERIFY_CHANNEL = 'techphone-auth';
const VERIFY_STORAGE_KEY = 'techphone-email-verified';

function notifyOtherTabsVerified() {
  localStorage.setItem(VERIFY_STORAGE_KEY, String(Date.now()));
  try {
    const channel = new BroadcastChannel(VERIFY_CHANNEL);
    channel.postMessage({ type: 'email-verified' });
    channel.close();
  } catch {
    // BroadcastChannel not supported — storage event still works across tabs.
  }
}

export default function EmailVerified() {
  const [params] = useSearchParams();
  const status = params.get('status') || 'success';
  const success = status === 'success';

  useEffect(() => {
    if (success) {
      notifyOtherTabsVerified();
    }
  }, [success]);

  return (
    <div className="container" style={{ maxWidth: 480, padding: '48px 16px', textAlign: 'center' }}>
      {success ? (
        <CheckCircle2 size={64} color="#16a34a" style={{ marginBottom: 16 }} />
      ) : (
        <XCircle size={64} color="#dc2626" style={{ marginBottom: 16 }} />
      )}
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>
        {success ? 'Liên kết email thành công' : 'Không thể xác minh email'}
      </h1>
      {success ? (
        <>
          <p className="text-muted" style={{ marginBottom: 20, lineHeight: 1.6 }}>
            Email của bạn đã được xác minh. Tab TechPhone đang mở sẽ tự cập nhật — bạn có thể quay lại tab đó
            hoặc đóng trang này.
          </p>
          <Link className="btn btn-primary" to="/account/security">
            Mở trang bảo mật
          </Link>
        </>
      ) : (
        <>
          <p className="text-muted" style={{ marginBottom: 20, lineHeight: 1.6 }}>
            {status === 'invalid'
              ? 'Liên kết xác minh không hợp lệ hoặc đã hết hạn (24 giờ).'
              : 'Thiếu mã xác minh trong liên kết.'}
          </p>
          <Link className="btn btn-outline" to="/account/security">
            Quay lại và gửi lại email
          </Link>
        </>
      )}
    </div>
  );
}

export { VERIFY_CHANNEL, VERIFY_STORAGE_KEY };
