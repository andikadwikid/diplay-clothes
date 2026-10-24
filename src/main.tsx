import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// The admin panel and the catalog are separate chunks, so storefront visitors never download them.
const AdminApp = lazy(() => import('./admin/AdminApp'));
const CatalogPage = lazy(() => import('./catalog/CatalogPage'));

const isRoute = (base: string) =>
  window.location.pathname === base || window.location.pathname.startsWith(`${base}/`);

function Root() {
  if (isRoute('/admin')) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    );
  }
  if (isRoute('/catalog')) {
    return (
      <Suspense fallback={null}>
        <CatalogPage />
      </Suspense>
    );
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
