export type View = 'hanging' | 'front';
export type Tone = 'dark' | 'light';
export type Warning = 'ratio' | 'small' | 'opaque';

export interface AdminImage {
  url: string;
  contentType: string;
  width: number;
  height: number;
  warnings: Warning[];
}

export interface AdminProduct {
  id: string;
  name: string;
  meta: string;
  href: string;
  badgeLabel: string;
  badgeTone: Tone;
  published: boolean;
  position: number;
  images: { hanging: AdminImage | null; front: AdminImage | null };
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  meta: string;
  href: string;
  badgeLabel: string;
  badgeTone: Tone;
  published: boolean;
}

export const VIEWS: readonly View[] = ['hanging', 'front'];
