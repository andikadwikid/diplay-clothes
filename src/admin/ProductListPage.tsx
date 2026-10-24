import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { adminApi, toInput } from './adminApi';
import { ConfirmDialog } from './ConfirmDialog';
import { describeError } from './messages';
import { Link } from './router';
import type { AdminProduct } from './types';

export function ProductListPage({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) return onUnauthorized();
      setError(describeError(e));
    },
    [onUnauthorized],
  );

  const load = useCallback(async () => {
    try {
      setProducts(await adminApi.list());
    } catch (e) {
      fail(e);
    }
  }, [fail]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Runs a mutation while locking the controls, reporting any failure. */
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      fail(e);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, direction: -1 | 1) =>
    run(async () => {
      if (!products) return;
      const next = [...products];
      const target = index + direction;
      [next[index], next[target]] = [next[target], next[index]];
      setProducts(next); // optimistic
      setProducts(await adminApi.reorder(next.map((p) => p.id)));
    });

  const togglePublished = (product: AdminProduct) =>
    run(async () => {
      const saved = await adminApi.update(product.id, { ...toInput(product), published: !product.published });
      setProducts((list) => list?.map((p) => (p.id === saved.id ? saved : p)) ?? null);
    });

  const confirmDelete = () =>
    run(async () => {
      if (!toDelete) return;
      await adminApi.remove(toDelete.id);
      setProducts((list) => list?.filter((p) => p.id !== toDelete.id) ?? null);
      setToDelete(null);
    });

  return (
    <section aria-labelledby="products-title">
      <div className="page-head">
        <div>
          <h1 id="products-title" className="page-title">Produk</h1>
          <p className="page-sub">
            Urutan di sini sama dengan urutan di rak. Hanya produk berstatus <strong>Terbit</strong> yang tampil di toko.
          </p>
        </div>
        <Link href="/admin/products/new" className="btn btn--primary">
          + Produk baru
        </Link>
      </div>

      <p className="banner banner--error" role="alert" hidden={!error}>
        {error}
      </p>

      {products === null && !error && <p className="muted">Memuat…</p>}

      {products?.length === 0 && (
        <div className="empty">
          <p>Belum ada produk.</p>
          <Link href="/admin/products/new" className="btn btn--primary">
            Tambah produk pertama
          </Link>
        </div>
      )}

      {products && products.length > 0 && (
        <ul className="rows">
          {products.map((product, index) => {
            const complete = product.images.hanging && product.images.front;
            return (
              <li key={product.id} className="row">
                <div className="row__thumbs" aria-hidden="true">
                  {(['hanging', 'front'] as const).map((view) => (
                    <span key={view} className="thumb">
                      {product.images[view] && <img src={product.images[view]!.url} alt="" loading="lazy" />}
                    </span>
                  ))}
                </div>

                <div className="row__main">
                  <Link href={`/admin/products/${product.id}`} className="row__name">
                    {product.name}
                  </Link>
                  {product.meta && <p className="row__meta">{product.meta}</p>}
                  <p className="row__chips">
                    {product.published ? (
                      <span className="chip chip--ok">Terbit</span>
                    ) : complete ? (
                      <span className="chip">Draf</span>
                    ) : (
                      <span className="chip chip--warn">Gambar belum lengkap</span>
                    )}
                    {product.badgeLabel && <span className="chip">Tag: {product.badgeLabel}</span>}
                  </p>
                </div>

                <div className="row__actions">
                  <div className="row__order" role="group" aria-label={`Urutan ${product.name}`}>
                    <button
                      type="button"
                      className="btn btn--icon"
                      aria-label={`Naikkan ${product.name}`}
                      disabled={busy || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn--icon"
                      aria-label={`Turunkan ${product.name}`}
                      disabled={busy || index === products.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn--small"
                    disabled={busy || (!product.published && !complete)}
                    title={!product.published && !complete ? 'Unggah kedua gambar lebih dulu' : undefined}
                    onClick={() => togglePublished(product)}
                  >
                    {product.published ? 'Sembunyikan' : 'Terbitkan'}
                  </button>
                  <Link href={`/admin/products/${product.id}`} className="btn btn--small">
                    Edit
                  </Link>
                  <button type="button" className="btn btn--small btn--danger-ghost" disabled={busy} onClick={() => setToDelete(product)}>
                    Hapus
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Hapus produk?"
        message={`“${toDelete?.name ?? ''}” beserta kedua gambarnya akan dihapus permanen.`}
        confirmLabel="Hapus"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
