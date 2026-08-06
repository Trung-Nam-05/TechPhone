import { Navigate, useSearchParams } from 'react-router-dom';

/** Giữ route cũ — chuyển về /forgot-password?token=... */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  if (!token) {
    return <Navigate to="/forgot-password" replace />;
  }
  return <Navigate to={`/forgot-password?token=${encodeURIComponent(token)}`} replace />;
}
