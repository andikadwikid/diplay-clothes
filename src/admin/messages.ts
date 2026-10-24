import { ApiError } from '../api/client';
import type { Warning } from './types';

const errorText: Record<string, string> = {
  network: 'Tidak bisa menghubungi server. Pastikan backend sudah berjalan.',
  unauthorized: 'Sesi Anda berakhir. Silakan masuk lagi.',
  invalid_credentials: 'Username atau password salah.',
  rate_limited: 'Terlalu banyak percobaan masuk. Coba lagi dalam satu menit.',
  not_found: 'Data tidak ditemukan. Mungkin sudah dihapus.',
  file_too_large: 'Ukuran file melebihi batas unggahan.',
  unsupported_type: 'Format tidak didukung. Gunakan PNG, WebP, JPEG, atau SVG.',
  unsafe_svg: 'SVG berisi skrip atau konten tertanam, jadi ditolak.',
  bad_dimensions: 'Dimensi gambar harus antara 100 dan 8000 piksel per sisi.',
  corrupt_image: 'Gambar tidak bisa dibaca. Coba ekspor ulang filenya.',
  storage_error: 'Gagal menyimpan ke penyimpanan (MinIO). Periksa apakah MinIO berjalan.',
  validation: 'Beberapa isian belum benar. Periksa kolom yang ditandai.',
  bad_order: 'Urutan produk tidak valid. Muat ulang halaman.',
  internal: 'Terjadi kesalahan di server. Coba lagi.',
};

export function describeError(error: unknown): string {
  if (error instanceof ApiError) return errorText[error.code] ?? error.message;
  return 'Terjadi kesalahan yang tidak terduga.';
}

const fieldText: Record<string, string> = {
  required: 'Wajib diisi.',
  too_long: 'Terlalu panjang.',
  invalid_url: 'Gunakan alamat http(s)://… atau path yang diawali / atau #.',
  invalid_tone: 'Pilih gelap atau terang.',
  images_required: 'Unggah kedua gambar lebih dulu sebelum menerbitkan.',
};

export const describeField = (code: string) => fieldText[code] ?? code;

export function describeWarning(warning: Warning, width: number, height: number): string {
  switch (warning) {
    case 'ratio':
      return `Rasio ${width}×${height} bukan 4:5, jadi posisinya di gantungan bisa meleset.`;
    case 'small':
      return `Resolusi kecil (${width}px lebar), bisa terlihat buram.`;
    case 'opaque':
      return 'JPEG tidak transparan dan akan tampil sebagai kotak. Pakai PNG/WebP transparan.';
  }
}
