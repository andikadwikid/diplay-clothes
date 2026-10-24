import { InteractiveClothingRack } from './components/InteractiveClothingRack';
import { useStorefrontProducts } from './hooks/useStorefrontProducts';

export function App() {
  const catalog = useStorefrontProducts();

  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="/">
          Diplay Clothes
        </a>
      </header>

      <main>
        <section className="collection" aria-labelledby="collection-title">
          <h1 id="collection-title" className="eyebrow">
            <span>New Collection</span>
            <span>Premium Streetwear</span>
          </h1>

          {catalog.status === 'loading' && (
            <p className="collection__status" role="status">
              Loading the collection…
            </p>
          )}

          {catalog.status !== 'loading' && catalog.products.length === 0 && (
            <p className="collection__status">New pieces are on their way.</p>
          )}

          {catalog.status !== 'loading' && catalog.products.length > 0 && (
            <InteractiveClothingRack
              products={catalog.products}
              label="New collection"
              idleCaption="Crafted in heavyweight fleece. Cut oversized. Made to last."
            >
              <a className="pill-link" href="#/collection">
                Shop the Collection
              </a>
            </InteractiveClothingRack>
          )}
        </section>
      </main>
    </>
  );
}
