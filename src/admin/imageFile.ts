import type { Warning } from './types';

export const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg';
const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export const isSupported = (file: File) =>
  TYPES.includes(file.type) || (file.type === '' && /\.(png|jpe?g|webp|svg)$/i.test(file.name));

export interface MeasuredFile {
  url: string;
  width: number;
  height: number;
  warnings: Warning[];
}

/**
 * Reads a chosen file in the browser so it can be previewed and checked before
 * upload. The server repeats every check; this is only for fast feedback.
 */
export async function measure(file: File): Promise<MeasuredFile> {
  const url = URL.createObjectURL(file);
  try {
    const size = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error('unreadable'));
      img.src = url;
    });

    const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
    const warnings: Warning[] = [];
    if (!isSvg) {
      // (SVGs report a default size when they declare none, so they are not judged here.)
      if (Math.abs(size.w / size.h - 0.8) > 0.03) warnings.push('ratio');
      if (size.w < 600) warnings.push('small');
    }
    if (file.type === 'image/jpeg') warnings.push('opaque');
    return { url, width: size.w, height: size.h, warnings };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
