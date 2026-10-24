import { useEffect, useState } from 'react';
import type { RackProduct } from '../components/InteractiveClothingRack';
import { products as fallbackProducts } from '../data/products';
import { request } from '../api/client';

export type StorefrontState =
  | { status: 'loading' }
  | { status: 'ready'; products: readonly RackProduct[] }
  /** The API could not be reached, so the bundled demo products are shown. */
  | { status: 'offline'; products: readonly RackProduct[] };

/** Loads the published products. Falls back to the bundled demo data if the backend is down. */
export function useStorefrontProducts(): StorefrontState {
  const [state, setState] = useState<StorefrontState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    request<{ products: RackProduct[] }>('GET', '/api/products')
      .then(({ products }) => {
        if (!controller.signal.aborted) setState({ status: 'ready', products });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.warn('Could not load products from the API; showing demo products.', error);
        setState({ status: 'offline', products: fallbackProducts });
      });
    return () => controller.abort();
  }, []);

  return state;
}
