import { useId, useState } from 'react';
import type { DragEvent } from 'react';
import { describeWarning } from './messages';
import { ACCEPT } from './imageFile';
import type { Warning } from './types';

export interface ShownImage {
  url: string;
  width: number;
  height: number;
  warnings: Warning[];
  /** True while the file is chosen but not uploaded yet. */
  pending: boolean;
}

interface Props {
  title: string;
  hint: string;
  image: ShownImage | null;
  disabled: boolean;
  error?: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}

/** One pose of a product: a drop target with a checkerboard preview in the rack's 4:5 frame. */
export function ImageSlot({ title, hint, image, disabled, error, onPick, onRemove }: Props) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onPick(file);
  };

  return (
    <div className="slot">
      <label htmlFor={inputId} className="slot__title">
        {title}
      </label>

      <div
        className={`slot__drop${dragging ? ' is-dragging' : ''}${image ? ' has-image' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {image ? (
          <img src={image.url} alt={`${title}: pratinjau`} className="slot__img" />
        ) : (
          <span className="slot__empty">
            Tarik gambar ke sini
            <small>atau klik untuk memilih file</small>
          </span>
        )}
        <input
          id={inputId}
          className="slot__input"
          type="file"
          accept={ACCEPT}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPick(file);
            event.target.value = ''; // allow choosing the same file again
          }}
        />
      </div>

      <p className="slot__hint">{hint}</p>

      {image && (
        <p className="slot__meta">
          {image.width > 0 ? `${image.width} × ${image.height} px` : 'Ukuran tidak diketahui'}
          {image.pending && <span className="chip chip--info">Belum diunggah</span>}
        </p>
      )}
      {image?.warnings.map((warning) => (
        <p key={warning} className="slot__warning" role="note">
          {describeWarning(warning, image.width, image.height)}
        </p>
      ))}
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      {image && (
        <button type="button" className="btn btn--ghost btn--small" onClick={onRemove} disabled={disabled}>
          Hapus gambar
        </button>
      )}
    </div>
  );
}
