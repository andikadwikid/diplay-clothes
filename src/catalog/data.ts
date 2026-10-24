/**
 * Demo catalogue. Everything here is placeholder content (names, prices, ratings, brands)
 * with artwork drawn by scripts/generate-catalog-images.mjs; swap `catalog` for data from
 * your API (the shape is `CatalogProduct`) and the rest of the page keeps working.
 */

export type DepartmentId = 'fashion' | 'bags' | 'accessories' | 'home' | 'electronics' | 'grocery';
export type CategoryId = 'fashion' | 'watches' | 'bags' | 'electronic' | 'food' | 'home';
export type TypeId =
  | 'jeans' | 'trousers' | 'tshirt' | 'polo' | 'jackets' | 'shirts' | 'tops' | 'hoodie' | 'parka'
  | 'tote' | 'backpack' | 'watch' | 'headphones' | 'coffee' | 'candle' | 'lighting';
export type Gender = 'women' | 'men' | 'unisex';
export type ColorId = 'black' | 'white' | 'grey' | 'beige' | 'blue' | 'green' | 'pink' | 'brown';

export interface CatalogProduct {
  id: string;
  name: string;
  department: DepartmentId;
  category: CategoryId;
  type: TypeId;
  gender: Gender;
  color: ColorId;
  brand: string;
  /** Selling price in USD (already discounted when `sale` is set). */
  price: number;
  /** Discount in percent, shown as a "Sale 12%" badge. */
  sale?: number;
  rating: number;
  reviews: number;
  image: string;
  href?: string;
}

export const DEPARTMENTS: readonly { id: DepartmentId; label: string }[] = [
  { id: 'fashion', label: 'Apparel' },
  { id: 'bags', label: 'Bags' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'home', label: 'Home' },
  { id: 'electronics', label: 'Tech' },
  { id: 'grocery', label: 'Pantry' },
];

export const CATEGORIES: readonly { id: CategoryId; label: string }[] = [
  { id: 'fashion', label: 'Clothing' },
  { id: 'bags', label: 'Bags' },
  { id: 'watches', label: 'Watches' },
  { id: 'home', label: 'Home & Living' },
  { id: 'electronic', label: 'Tech & Audio' },
  { id: 'food', label: 'Pantry' },
];

/** Order here is the order of the type tabs. */
export const TYPES: readonly { id: TypeId; label: string }[] = [
  { id: 'jackets', label: 'Jackets' },
  { id: 'parka', label: 'Parkas' },
  { id: 'hoodie', label: 'Hoodies' },
  { id: 'tops', label: 'Sweatshirts' },
  { id: 'tshirt', label: 'Tees' },
  { id: 'polo', label: 'Polos' },
  { id: 'shirts', label: 'Shirts' },
  { id: 'jeans', label: 'Jeans' },
  { id: 'trousers', label: 'Trousers' },
  { id: 'tote', label: 'Totes' },
  { id: 'backpack', label: 'Backpacks' },
  { id: 'watch', label: 'Watches' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'candle', label: 'Candles' },
  { id: 'lighting', label: 'Lighting' },
];

export const GENDERS: readonly { id: Gender; label: string }[] = [
  { id: 'women', label: 'Women' },
  { id: 'men', label: 'Men' },
  { id: 'unisex', label: 'Unisex' },
];

export const COLORS: readonly { id: ColorId; label: string; swatch: string }[] = [
  { id: 'black', label: 'Black', swatch: '#151515' },
  { id: 'white', label: 'White', swatch: '#f4f1ea' },
  { id: 'grey', label: 'Grey', swatch: '#9b9da1' },
  { id: 'beige', label: 'Beige', swatch: '#d6bf93' },
  { id: 'blue', label: 'Blue', swatch: '#7fa3d1' },
  { id: 'green', label: 'Green', swatch: '#3f5a43' },
  { id: 'pink', label: 'Pink', swatch: '#b8777f' },
  { id: 'brown', label: 'Brown', swatch: '#6b4a33' },
];

const img = (slug: string) => `/images/catalog/${slug}.svg`;
/** Rack artwork that is reused for the hoodies, tees and crewnecks. */
const rack = (slug: string) => `/images/products/${slug}-front.svg`;

type Seed = Omit<CatalogProduct, 'id' | 'href'>;

const seeds: Seed[] = [
  // ---- Clothing
  { name: 'Indigo Trucker Jacket', department: 'fashion', category: 'fashion', type: 'jackets', gender: 'women', color: 'blue', brand: 'Nordlane', price: 98, sale: 15, rating: 4.7, reviews: 86, image: img('denim-jacket') },
  { name: 'Slate Fleece-Collar Coat', department: 'fashion', category: 'fashion', type: 'jackets', gender: 'women', color: 'grey', brand: 'Atelier 9', price: 119, sale: 10, rating: 4.6, reviews: 64, image: img('wool-coat') },
  { name: 'Dune Shearling Jacket', department: 'fashion', category: 'fashion', type: 'jackets', gender: 'women', color: 'beige', brand: 'Oakhaus', price: 134, sale: 25, rating: 4.8, reviews: 52, image: img('sherpa-jacket') },
  { name: 'Harbor Colorblock Bomber', department: 'fashion', category: 'fashion', type: 'jackets', gender: 'men', color: 'blue', brand: 'Nordlane', price: 91, sale: 30, rating: 4.4, reviews: 47, image: img('denim-bomber') },
  { name: 'Cloud Quilted Jacket', department: 'fashion', category: 'fashion', type: 'jackets', gender: 'unisex', color: 'white', brand: 'Oakhaus', price: 108, sale: 12, rating: 4.8, reviews: 203, image: img('puffer-jacket') },
  { name: 'Midnight Zip Hoodie', department: 'fashion', category: 'fashion', type: 'hoodie', gender: 'unisex', color: 'blue', brand: 'Kobo', price: 76, rating: 4.6, reviews: 131, image: rack('navy-zip-hoodie') },
  { name: 'Storm Pullover Hoodie', department: 'fashion', category: 'fashion', type: 'hoodie', gender: 'men', color: 'grey', brand: 'Kobo', price: 66, sale: 10, rating: 4.5, reviews: 77, image: rack('ash-grey-hoodie') },
  { name: 'Pine Heavyweight Hoodie', department: 'fashion', category: 'fashion', type: 'hoodie', gender: 'unisex', color: 'green', brand: 'Kobo', price: 82, sale: 18, rating: 4.9, reviews: 176, image: rack('forest-green-hoodie') },
  { name: 'Noir Boxy Tee', department: 'fashion', category: 'fashion', type: 'tshirt', gender: 'unisex', color: 'black', brand: 'Fieldwork', price: 32, rating: 4.6, reviews: 358, image: rack('jet-black-tee') },
  { name: 'Bone Pocket Tee', department: 'fashion', category: 'fashion', type: 'tshirt', gender: 'men', color: 'white', brand: 'Fieldwork', price: 36, sale: 15, rating: 4.3, reviews: 69, image: rack('bone-boxy-tee') },
  { name: 'Oat Crewneck Sweatshirt', department: 'fashion', category: 'fashion', type: 'tops', gender: 'women', color: 'beige', brand: 'Maison Rue', price: 58, rating: 4.7, reviews: 142, image: rack('cream-crewneck') },
  { name: 'Dusty Rose Crewneck', department: 'fashion', category: 'fashion', type: 'tops', gender: 'women', color: 'pink', brand: 'Maison Rue', price: 62, sale: 20, rating: 4.5, reviews: 58, image: rack('rosewood-crewneck') },
  { name: 'Raw Indigo Straight Jeans', department: 'fashion', category: 'fashion', type: 'jeans', gender: 'men', color: 'blue', brand: 'Nordlane', price: 78, sale: 12, rating: 4.5, reviews: 219, image: img('straight-jeans') },
  { name: 'Sand Pleated Trousers', department: 'fashion', category: 'fashion', type: 'trousers', gender: 'men', color: 'beige', brand: 'Atelier 9', price: 92, rating: 4.6, reviews: 118, image: img('wool-trousers') },
  { name: 'Chambray Work Shirt', department: 'fashion', category: 'fashion', type: 'shirts', gender: 'men', color: 'blue', brand: 'Maison Rue', price: 54, rating: 4.4, reviews: 88, image: img('oxford-shirt') },
  { name: 'Piqué Court Polo', department: 'fashion', category: 'fashion', type: 'polo', gender: 'men', color: 'green', brand: 'Studio Lune', price: 48, sale: 22, rating: 4.3, reviews: 54, image: img('pique-polo') },
  { name: 'Ridge Field Parka', department: 'fashion', category: 'fashion', type: 'parka', gender: 'unisex', color: 'green', brand: 'Fieldwork', price: 158, sale: 10, rating: 4.8, reviews: 91, image: img('expedition-parka') },
  // ---- Bags
  { name: 'Everyday Canvas Tote', department: 'bags', category: 'bags', type: 'tote', gender: 'unisex', color: 'beige', brand: 'Studio Lune', price: 29, rating: 4.7, reviews: 388, image: img('market-tote') },
  { name: 'Trailhead Daypack', department: 'bags', category: 'bags', type: 'backpack', gender: 'unisex', color: 'green', brand: 'Fieldwork', price: 112, sale: 15, rating: 4.6, reviews: 126, image: img('weekender-backpack') },
  // ---- Watches
  { name: 'Field Chronograph Watch', department: 'accessories', category: 'watches', type: 'watch', gender: 'men', color: 'brown', brand: 'Maison Rue', price: 176, sale: 10, rating: 4.7, reviews: 69, image: img('steel-watch') },
  // ---- Tech & Audio
  { name: 'Wireless Over-Ear Headphones', department: 'electronics', category: 'electronic', type: 'headphones', gender: 'unisex', color: 'black', brand: 'Kobo', price: 139, sale: 25, rating: 4.5, reviews: 440, image: img('studio-headphones') },
  // ---- Pantry
  { name: 'Ethiopia Light Roast 250 g', department: 'grocery', category: 'food', type: 'coffee', gender: 'unisex', color: 'brown', brand: 'Oakhaus', price: 16, rating: 4.8, reviews: 695, image: img('single-origin-coffee') },
  // ---- Home & Living
  { name: 'Amber Soy Candle', department: 'home', category: 'home', type: 'candle', gender: 'unisex', color: 'white', brand: 'Studio Lune', price: 24, rating: 4.7, reviews: 189, image: img('soy-candle') },
  { name: 'Curve Floor Lamp', department: 'home', category: 'home', type: 'lighting', gender: 'unisex', color: 'white', brand: 'Studio Lune', price: 129, rating: 4.4, reviews: 51, image: img('arc-floor-lamp') },
];

export const catalog: readonly CatalogProduct[] = seeds.map((seed, index) => ({
  ...seed,
  id: `p${String(index + 1).padStart(2, '0')}`,
  // Placeholder links: there is no product page yet.
  href: `#/products/p${String(index + 1).padStart(2, '0')}`,
}));
