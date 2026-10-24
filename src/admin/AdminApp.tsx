import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { adminApi } from './adminApi';
import { LoginPage } from './LoginPage';
import { describeError } from './messages';
import { ProductFormPage } from './ProductFormPage';
import { ProductListPage } from './ProductListPage';
import { Link, usePath } from './router';
import './admin.css';

type Session =
  | { kind: 'checking' }
  | { kind: 'out'; notice?: string }
  | { kind: 'in'; user: string }
  | { kind: 'error'; message: string };

export default function AdminApp() {
  const [session, setSession] = useState<Session>({ kind: 'checking' });

  const check = useCallback(() => {
    setSession({ kind: 'checking' });
    adminApi
      .me()
      .then(({ username }) => setSession({ kind: 'in', user: username }))
      .catch((e) =>
        setSession(e instanceof ApiError && e.status === 401 ? { kind: 'out' } : { kind: 'error', message: describeError(e) }),
      );
  }, []);

  useEffect(check, [check]);

  const expire = useCallback(
    () => setSession({ kind: 'out', notice: 'Sesi Anda berakhir. Silakan masuk lagi.' }),
    [],
  );

  const logout = async () => {
    await adminApi.logout().catch(() => undefined);
    setSession({ kind: 'out' });
  };

  if (session.kind === 'checking') return <p className="muted admin-boot">Memuat…</p>;
  if (session.kind === 'error') {
    return (
      <main className="login">
        <div className="login__card">
          <p className="banner banner--error" role="alert">{session.message}</p>
          <button className="btn" onClick={check}>Coba lagi</button>
        </div>
      </main>
    );
  }
  if (session.kind === 'out') {
    return <LoginPage notice={session.notice} onLoggedIn={(user) => setSession({ kind: 'in', user })} />;
  }

  return (
    <div className="admin">
      <header className="admin__bar">
        <Link href="/admin" className="admin__brand">Diplay Clothes <span>Admin</span></Link>
        <nav className="admin__nav" aria-label="Admin">
          <a href="/" target="_blank" rel="noreferrer">Lihat toko ↗</a>
          <span className="admin__user">{session.user}</span>
          <button type="button" className="btn btn--small" onClick={logout}>Keluar</button>
        </nav>
      </header>
      <main className="admin__main">
        <Routes onUnauthorized={expire} />
      </main>
    </div>
  );
}

function Routes({ onUnauthorized }: { onUnauthorized: () => void }) {
  const path = usePath();

  if (path === '/admin') return <ProductListPage onUnauthorized={onUnauthorized} />;
  if (path === '/admin/products/new') return <ProductFormPage key="new" onUnauthorized={onUnauthorized} />;

  const edit = path.match(/^\/admin\/products\/([A-Za-z0-9]+)$/);
  if (edit) return <ProductFormPage key={edit[1]} id={edit[1]} onUnauthorized={onUnauthorized} />;

  return (
    <div className="empty">
      <p>Halaman tidak ditemukan.</p>
      <Link href="/admin" className="btn">Ke daftar produk</Link>
    </div>
  );
}
