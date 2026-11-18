import { API_BASE_URL as CONFIGURED_API_BASE } from '@/services/api';
import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode, useEffect, useState } from 'react';

const api = (import.meta.env.VITE_API_URL || CONFIGURED_API_BASE).replace(/\/$/, '');

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid' | 'error'>('checking');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { setStatus('invalid'); return; }
    const controller = new AbortController();
    setStatus('checking');
    fetch(`${api}/admin/session.php`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      .then(response => {
        if (response.status === 401) {
          localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); setStatus('invalid');
        } else setStatus(response.ok ? 'valid' : 'error');
      })
      .catch(error => { if (error.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, [retry]);
  if (status === 'invalid') return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  if (status === 'checking') return <div className="p-8">Memeriksa sesi admin...</div>;
  if (status === 'error') return <div className="p-8">Sesi admin tidak dapat diperiksa. Pastikan server aktif. <button className="underline" onClick={() => setRetry(value => value + 1)}>Coba lagi</button></div>;
  return <>{children}</>;
};
