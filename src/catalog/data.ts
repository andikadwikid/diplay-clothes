/**
 * Demo catalogue. Everything here is placeholder content (names, prices, ratings, brands)
 * with artwork drawn by scripts/generate-catalog-images.mjs; swap `catalog` for data from
 * your API (the shape is `CatalogProduct`) and the rest of the page keeps working.
 */

export type DepartmentId = 'electronics' | 'self-care' | 'fashion' | 'grocery' | 'bags' | 'accessories';
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
  { id: 'electronics', label: 'Electronics' },
  { id: 'self-care', label: 'Self Care' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'grocery', label: 'Grocery' },
  { id: 'bags', label: 'Bags' },
  { id: 'accessories', label: 'Accessories' },
];

export const CATEGORIES: readonly { id: CategoryId; label: string }[] = [
  { id: 'fashion', label: 'Fashion & Clothing' },
  { id: 'watches', label: 'Watches & Jewelry' },
  { id: 'bags', label: 'Bags & Accessories' },
  { id: 'electronic', label: 'Electronic Products' },
  { id: 'food', label: 'Food & Grocery' },
  { id: 'home', label: 'Home & Furniture' },
];

/** Order here is the order of the type tabs. */
export const TYPES: readonly { id: TypeId; label: string }[] = [
  { id: 'jeans', label: 'Jeans Pants' },
  { id: 'trousers', label: 'Trousers' },
  { id: 'tshirt', label: 'T-shirt' },
  { id: 'polo', label: 'Polo shirt' },
  { id: 'jackets', label: 'Jackets' },
  { id: 'shirts', label: 'Shirts' },
  { id: 'tops', label: 'Tops' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'parka', label: 'Parka' },
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
  // ---- Fashion & Clothing
  { name: 'Frost Denim Jacket', department: 'fashion', category: 'fashion', type: 'jackets', gender: 'women', color: 'blue', brand: 'Nordlane', price: 89, sale: 12, rating: 4.9, reviews: 124, image: img('denim-jacket') },
  { name: 'Arctic Wool Coat', department: 'fashion', category: 'fashion', type: 'jackets', gender: 'women', color: 'grey', brand: 'Atelier 9', price: 95, sale: 18, rating: 4.9, reviews: 156, image: img('wool-coat') },
  { name: 'Ivory Sherpa Jacket', department: 'fashion', category: 'fashion', type: 'jackets', gender: 'women', color: 'beige', brand: 'Oakhaus', price: 92, sale: 15, rating: 4.9, reviews: 156, image: img('sherpa-jacket') },
  { name: 'Vintage Denim Bomber', department: 'fashion', category: 'fashion', type: 'jackets', gender: 'men', color: 'blue', brand: 'Nordlane', price: 85, sale: 22, rating: 4.7, reviews: 112, image: img('denim-bomber') },
  { name: 'Polar Puffer Jacket', department: 'fashion', category: 'fashion', type: 'jackets', gender: 'unisex', color: 'white', brand: 'Oakhaus', price: 99, sale: 12, rating: 4.9, reviews: 187, image: img('puffer-jacket') },
  { name: 'Urban Zip Hoodie', department: 'fashion', category: 'fashion', type: 'hoodie', gender: 'unisex', color: 'blue', brand: 'Kobo', price: 79, sale: 18, rating: 4.8, reviews: 143, image: rack('navy-zip-hoodie') },
  { name: 'Ash Grey Hoodie', department: 'fashion', category: 'fashion', type: 'hoodie', gender: 'men', color: 'grey', brand: 'Kobo', price: 69, rating: 4.6, reviews: 98, image: rack('ash-grey-hoodie') },
  { name: 'Forest Green Hoodie', department: 'fashion', category: 'fashion', type: 'hoodie', gender: 'unisex', color: 'green', brand: 'Kobo', price: 75, sale: 10, rating: 4.8, reviews: 210, image: rack('forest-green-hoodie') },
  { name: 'Jet Black Tee', department: 'fashion', category: 'fashion', type: 'tshirt', gender: 'unisex', color: 'black', brand: 'Fieldwork', price: 35, rating: 4.7, reviews: 321, image: rack('jet-black-tee') },
  { name: 'Outdoor Graphic Tee', department: 'fashion', category: 'fashion', type: 'tshirt', gender: 'men', color: 'white', brand: 'Fieldwork', price: 39, sale: 20, rating: 4.5, reviews: 87, image: rack('bone-boxy-tee') },
  { name: 'Classic Cream Crewneck', department: 'fashion', category: 'fashion', type: 'tops', gender: 'women', color: 'beige', brand: 'Maison Rue', price: 64, rating: 4.8, reviews: 164, image: rack('cream-crewneck') },
  { name: 'Rosewood Crewneck', department: 'fashion', category: 'fashion', type: 'tops', gender: 'women', color: 'pink', brand: 'Maison Rue', price: 68, sale: 15, rating: 4.7, reviews: 76, image: rack('rosewood-crewneck') },
  { name: 'Straight Fit Jeans', department: 'fashion', category: 'fashion', type: 'jeans', gender: 'men', color: 'blue', brand: 'Nordlane', price: 72, sale: 10, rating: 4.6, reviews: 245, image: img('straight-jeans') },
  { name: 'Pleated Wool Trousers', department: 'fashion', category: 'fashion', type: 'trousers', gender: 'men', color: 'beige', brand: 'Atelier 9', price: 88, rating: 4.7, reviews: 133, image: img('wool-trousers') },
  { name: 'Oxford Button-Down', department: 'fashion', category: 'fashion', type: 'shirts', gender: 'men', color: 'blue', brand: 'Maison Rue', price: 58, rating: 4.6, reviews: 92, image: img('oxford-shirt') },
  { name: 'Piqué Polo', department: 'fashion', category: 'fashion', type: 'polo', gender: 'men', color: 'green', brand: 'Studio Lune', price: 52, sale: 25, rating: 4.5, reviews: 61, image: img('pique-polo') },
  { name: 'Expedition Parka', department: 'fashion', category: 'fashion', type: 'parka', gender: 'unisex', color: 'green', brand: 'Fieldwork', price: 149, sale: 12, rating: 4.9, reviews: 98, image: img('expedition-parka') },
  // ---- Bags & Accessories
  { name: 'Market Canvas Tote', department: 'bags', category: 'bags', type: 'tote', gender: 'unisex', color: 'beige', brand: 'Studio Lune', price: 34, rating: 4.8, reviews: 410, image: img('market-tote') },
  { name: 'Weekender Backpack', department: 'bags', category: 'bags', type: 'backpack', gender: 'unisex', color: 'green', brand: 'Fieldwork', price: 119, sale: 18, rating: 4.7, reviews: 143, image: img('weekender-backpack') },
  // ---- Watches & Jewelry
  { name: 'Steel Chronograph', department: 'accessories', category: 'watches', type: 'watch', gender: 'men', color: 'brown', brand: 'Maison Rue', price: 189, sale: 15, rating: 4.8, reviews: 76, image: img('steel-watch') },
  // ---- Electronic Products
  { name: 'Studio Headphones', department: 'electronics', category: 'electronic', type: 'headphones', gender: 'unisex', color: 'black', brand: 'Kobo', price: 159, sale: 20, rating: 4.6, reviews: 512, image: img('studio-headphones') },
  // ---- Food & Grocery
  { name: 'Single-Origin Coffee 250 g', department: 'grocery', category: 'food', type: 'coffee', gender: 'unisex', color: 'brown', brand: 'Oakhaus', price: 18, rating: 4.9, reviews: 804, image: img('single-origin-coffee') },
  // ---- Home & Furniture
  { name: 'Cedar & Fig Candle', department: 'self-care', category: 'home', type: 'candle', gender: 'unisex', color: 'white', brand: 'Studio Lune', price: 28, sale: 10, rating: 4.8, reviews: 233, image: img('soy-candle') },
  { name: 'Arc Floor Lamp', department: 'self-care', category: 'home', type: 'lighting', gender: 'unisex', color: 'white', brand: 'Studio Lune', price: 139, rating: 4.5, reviews: 58, image: img('arc-floor-lamp') },
];

export const catalog: readonly CatalogProduct[] = seeds.map((seed, index) => ({
  ...seed,
  id: `p${String(index + 1).padStart(2, '0')}`,
  // Placeholder links: there is no product page yet.
  href: `#/products/p${String(index + 1).padStart(2, '0')}`,
}));
