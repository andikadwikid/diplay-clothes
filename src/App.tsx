import { InteractiveClothingRack } from './components/InteractiveClothingRack';
import { products } from './data/products';

export function App() {
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

          <InteractiveClothingRack
            products={products}
            label="New collection"
            idleCaption="Crafted in heavyweight fleece. Cut oversized. Made to last."
          >
            <a className="pill-link" href="#/collection">
              Shop the Collection
            </a>
          </InteractiveClothingRack>
        </section>
      </main>
    </>
  );
}
