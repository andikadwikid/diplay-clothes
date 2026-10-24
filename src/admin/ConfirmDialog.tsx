import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal confirmation built on <dialog>, which handles focus trapping and Esc for us. */
export function ConfirmDialog({ open, title, message, confirmLabel, busy, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
      <h2 className="dialog__title">{title}</h2>
      <p>{message}</p>
      <div className="dialog__actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          Batal
        </button>
        <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Menghapus…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
