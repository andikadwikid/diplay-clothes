import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import { InteractiveClothingRack } from '../components/InteractiveClothingRack';
import type { RackProduct } from '../components/InteractiveClothingRack';
import { adminApi } from './adminApi';
import { ConfirmDialog } from './ConfirmDialog';
import { ImageSlot } from './ImageSlot';
import type { ShownImage } from './ImageSlot';
import { isSupported, measure } from './imageFile';
import { describeError, describeField } from './messages';
import { Link, navigate } from './router';
import { VIEWS } from './types';
import type { AdminImage, AdminProduct, ProductInput, View, Warning } from './types';

interface Pending {
  file: File;
  url: string;
  width: number;
  height: number;
  warnings: Warning[];
}

interface SlotState {
  existing: AdminImage | null;
  pending: Pending | null;
  removed: boolean;
}

type Slots = Record<View, SlotState>;

const emptyFields: ProductInput = { name: '', meta: '', href: '', badgeLabel: '', badgeTone: 'dark', published: false };
const emptySlots = (): Slots => ({
  hanging: { existing: null, pending: null, removed: false },
  front: { existing: null, pending: null, removed: false },
});

const slotsFrom = (p: AdminProduct): Slots => ({
  hanging: { existing: p.images.hanging, pending: null, removed: false },
  front: { existing: p.images.front, pending: null, removed: false },
});

const fieldsFrom = (p: AdminProduct): ProductInput => ({
  name: p.name, meta: p.meta, href: p.href,
  badgeLabel: p.badgeLabel, badgeTone: p.badgeTone, published: p.published,
});

const slotCopy: Record<View, { title: string; hint: string }> = {
  hanging: { title: 'Tampak samping (menggantung)', hint: 'Pose awal di rak. PNG/WebP transparan, rasio 4:5.' },
  front: { title: 'Tampak depan (saat hover)', hint: 'Muncul saat diarahkan kursor / diketuk. Kanvas sama dengan gambar samping.' },
};

export function ProductFormPage({ id, onUnauthorized }: { id?: string; onUnauthorized: () => void }) {
  const [productId, setProductId] = useState(id);
  const [fields, setFields] = useState<ProductInput>(emptyFields);
  const [slots, setSlots] = useState<Slots>(emptySlots);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [slotErrors, setSlotErrors] = useState<Partial<Record<View, string>>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Blob URLs for chosen files must be released; track the live ones in a ref.
  const blobUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = blobUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const releasePending = (pending: Pending | null) => {
    if (!pending) return;
    URL.revokeObjectURL(pending.url);
    blobUrls.current.delete(pending.url);
  };

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) return onUnauthorized();
      if (e instanceof ApiError && e.code === 'validation') setFieldErrors(e.fields);
      setError(describeError(e));
    },
    [onUnauthorized],
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    adminApi
      .get(id)
      .then((product) => {
        if (cancelled) return;
        setFields(fieldsFrom(product));
        setSlots(slotsFrom(product));
      })
      .catch((e) => !cancelled && fail(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, fail]);

  const shown = (view: View): ShownImage | null => {
    const slot = slots[view];
    if (slot.pending) return { ...slot.pending, pending: true };
    if (slot.existing && !slot.removed) return { ...slot.existing, pending: false };
    return null;
  };
  const hanging = shown('hanging');
  const front = shown('front');
  const bothImages = Boolean(hanging && front);

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setError(''); // an old failure message no longer applies once the user edits
    setFieldErrors((errors) => {
      const { [key]: _removed, ...rest } = errors;
      return rest;
    });
  };

  const pick = async (view: View, file: File) => {
    setSlotErrors((e) => ({ ...e, [view]: undefined }));
    setSaved(false);
    if (!isSupported(file)) {
      setSlotErrors((e) => ({ ...e, [view]: describeError(new ApiError(415, 'unsupported_type', '')) }));
      return;
    }
    try {
      const measured = await measure(file);
      blobUrls.current.add(measured.url);
      setSlots((s) => {
        releasePending(s[view].pending);
        return { ...s, [view]: { ...s[view], pending: { file, ...measured }, removed: false } };
      });
    } catch {
      setSlotErrors((e) => ({ ...e, [view]: describeError(new ApiError(422, 'corrupt_image', '')) }));
    }
  };

  const remove = (view: View) => {
    setSaved(false);
    setSlotErrors((e) => ({ ...e, [view]: undefined }));
    setSlots((s) => {
      releasePending(s[view].pending);
      return { ...s, [view]: { ...s[view], pending: null, removed: s[view].existing !== null } };
    });
    // A product missing a pose cannot be on the rack.
    setFields((f) => ({ ...f, published: false }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSaved(false);
    setFieldErrors({});
    setSlotErrors({});

    let currentId = productId;
    try {
      // 1. Make sure the product exists (always as a draft; publishing comes last).
      if (!currentId) {
        const created = await adminApi.create({ ...fields, published: false });
        currentId = created.id;
        setProductId(created.id);
        window.history.replaceState(null, '', `/admin/products/${created.id}`);
      }

      // 2. Apply image changes. Failures are reported per slot, and stop the save
      //    so the product is not published with a half-uploaded set.
      for (const view of VIEWS) {
        const slot = slots[view];
        try {
          let updated: AdminProduct | null = null;
          if (slot.pending) updated = await adminApi.putImage(currentId, view, slot.pending.file);
          else if (slot.removed && slot.existing) updated = await adminApi.deleteImage(currentId, view);
          if (updated) {
            // Reflect it right away so a later failure doesn't re-upload this one.
            const done = updated;
            releasePending(slot.pending);
            setSlots((s) => ({ ...s, [view]: { existing: done.images[view], pending: null, removed: false } }));
          }
        } catch (e) {
          if (e instanceof ApiError && e.status !== 401) {
            setSlotErrors({ [view]: describeError(e) });
            setError('Gambar gagal diunggah. Data produk belum disimpan sepenuhnya.');
            return;
          }
          throw e;
        }
      }

      // 3. Save the fields (and publish state) now that images are in place.
      const product = await adminApi.update(currentId, fields);
      setFields(fieldsFrom(product));
      setSlots(slotsFrom(product));
      setSaved(true);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!productId) return;
    setBusy(true);
    try {
      await adminApi.remove(productId);
      navigate('/admin');
    } catch (e) {
      setConfirmDelete(false);
      fail(e);
      setBusy(false);
    }
  };

  const preview: RackProduct | null = useMemo(() => {
    if (!hanging || !front) return null;
    return {
      id: 'preview',
      name: fields.name.trim() || 'Nama produk',
      meta: fields.meta.trim() || undefined,
      hangingImage: { src: hanging.url },
      frontImage: { src: front.url },
      badge: fields.badgeLabel.trim() ? { label: fields.badgeLabel.trim(), tone: fields.badgeTone } : undefined,
    };
  }, [hanging, front, fields.name, fields.meta, fields.badgeLabel, fields.badgeTone]);

  if (loading) return <p className="muted">Memuat…</p>;
  const isNew = !productId;

  return (
    <section aria-labelledby="form-title">
      <p className="crumbs">
        <Link href="/admin">← Semua produk</Link>
      </p>
      <h1 id="form-title" className="page-title">{isNew ? 'Produk baru' : 'Edit produk'}</h1>

      <div className="form-grid">
        <form className="form" onSubmit={submit} noValidate>
          <p className="banner banner--error" role="alert" hidden={!error}>{error}</p>
          <p className="banner banner--ok" role="status" hidden={!saved}>
            Tersimpan. <Link href="/admin">Kembali ke daftar</Link>
          </p>

          <Field label="Nama produk" error={fieldErrors.name} required>
            <input
              className="input"
              value={fields.name}
              maxLength={120}
              required
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>

          <Field label="Deskripsi singkat" hint="Tampil di bawah nama saat produk dipilih, mis. “Oversized fit · Bottle green”." error={fieldErrors.meta}>
            <input className="input" value={fields.meta} maxLength={200} onChange={(e) => set('meta', e.target.value)} />
          </Field>

          <Field label="Link produk" hint="Opsional. Kosongkan jika produk tidak perlu bisa diklik. Contoh: /products/forest-green-hoodie" error={fieldErrors.href}>
            <input
              className="input"
              value={fields.href}
              inputMode="url"
              placeholder="/products/nama-produk"
              aria-invalid={Boolean(fieldErrors.href)}
              onChange={(e) => set('href', e.target.value)}
            />
          </Field>

          <div className="field-row">
            <Field label="Tag gantung" hint="Mis. NEW, -20%, ONLY 3 LEFT. Maks. 24 karakter." error={fieldErrors.badgeLabel}>
              <input className="input" value={fields.badgeLabel} maxLength={24} onChange={(e) => set('badgeLabel', e.target.value)} />
            </Field>
            <Field label="Warna tag" error={fieldErrors.badgeTone}>
              <select className="input" value={fields.badgeTone} onChange={(e) => set('badgeTone', e.target.value as ProductInput['badgeTone'])}>
                <option value="dark">Gelap</option>
                <option value="light">Terang</option>
              </select>
            </Field>
          </div>

          <div className="slots">
            {VIEWS.map((view) => (
              <ImageSlot
                key={view}
                {...slotCopy[view]}
                image={shown(view)}
                disabled={busy}
                error={slotErrors[view]}
                onPick={(file) => pick(view, file)}
                onRemove={() => remove(view)}
              />
            ))}
          </div>

          <div className="field">
            <label className="check">
              <input
                type="checkbox"
                checked={fields.published}
                disabled={!bothImages}
                onChange={(e) => set('published', e.target.checked)}
              />
              <span>Terbitkan di toko</span>
            </label>
            <p className="field__hint">
              {bothImages ? 'Produk yang diterbitkan langsung tampil di rak.' : 'Unggah kedua gambar lebih dulu untuk bisa menerbitkan.'}
            </p>
            {fieldErrors.published && <p className="field__error" role="alert">{describeField(fieldErrors.published)}</p>}
          </div>

          <div className="form__actions">
            <button className="btn btn--primary" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
            <Link href="/admin" className="btn">Batal</Link>
            {!isNew && (
              <button type="button" className="btn btn--danger-ghost form__delete" disabled={busy} onClick={() => setConfirmDelete(true)}>
                Hapus produk
              </button>
            )}
          </div>
        </form>

        <aside className="preview" aria-label="Pratinjau">
          <h2 className="preview__title">Pratinjau di rak</h2>
          {preview ? (
            <div className="preview__rack">
              <InteractiveClothingRack
                products={[preview]}
                label="Pratinjau produk"
                idleCaption="Arahkan kursor, ketuk, atau tekan Tab pada baju untuk melihat tampak depan."
              />
            </div>
          ) : (
            <p className="muted">Pratinjau muncul setelah kedua gambar dipilih.</p>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus produk?"
        message={`“${fields.name}” beserta kedua gambarnya akan dihapus permanen.`}
        confirmLabel="Hapus"
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}

function Field({ label, hint, error, required, children }: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error" role="alert">{describeField(error)}</span>}
    </label>
  );
}
