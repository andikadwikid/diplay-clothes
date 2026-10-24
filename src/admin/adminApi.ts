import { request } from '../api/client';
import type { AdminProduct, ProductInput, View } from './types';

const base = '/api/admin/products';

export const adminApi = {
  me: () => request<{ username: string }>('GET', '/api/auth/me'),
  login: (username: string, password: string) =>
    request<{ username: string }>('POST', '/api/auth/login', { username, password }),
  logout: () => request<void>('POST', '/api/auth/logout'),

  list: () => request<{ products: AdminProduct[] }>('GET', base).then((r) => r.products),
  get: (id: string) => request<AdminProduct>('GET', `${base}/${id}`),
  create: (input: ProductInput) => request<AdminProduct>('POST', base, input),
  update: (id: string, input: ProductInput) => request<AdminProduct>('PUT', `${base}/${id}`, input),
  remove: (id: string) => request<void>('DELETE', `${base}/${id}`),
  reorder: (ids: string[]) =>
    request<{ products: AdminProduct[] }>('POST', `${base}/reorder`, { ids }).then((r) => r.products),

  putImage: (id: string, view: View, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<AdminProduct>('PUT', `${base}/${id}/images/${view}`, form);
  },
  deleteImage: (id: string, view: View) => request<AdminProduct>('DELETE', `${base}/${id}/images/${view}`),
};

export const toInput = (p: AdminProduct): ProductInput => ({
  name: p.name,
  meta: p.meta,
  href: p.href,
  badgeLabel: p.badgeLabel,
  badgeTone: p.badgeTone,
  published: p.published,
});
