export type Product = {
  id: number;
  product_id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  retail_price: number;
  discount: number;
  stock: number;
  status: "active" | "inactive";
  images: string[];
  product_weight?: number;
  created_at: string;
  updated_at: string;
};

const STORAGE_KEY = "ga_products_v1";

function read(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw) as Product[];
  } catch (e) {
    return [];
  }
}

function write(items: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const productsApi = {
  list: async (): Promise<Product[]> => {
    return read();
  },
  get: async (id: number): Promise<Product | undefined> => {
    return read().find((p) => p.id === id);
  },
  create: async (
    payload: Omit<Product, "id" | "created_at" | "updated_at">,
  ) => {
    const items = read();
    const id = Math.max(0, ...items.map((i) => i.id)) + 1;
    const now = new Date().toISOString();
    const product: Product = {
      id,
      ...payload,
      created_at: now,
      updated_at: now,
    } as Product;
    items.unshift(product);
    write(items);
    return product;
  },
  update: async (id: number, payload: Partial<Product>) => {
    const items = read();
    const idx = items.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Not found");
    items[idx] = {
      ...items[idx],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    write(items);
    return items[idx];
  },
  remove: async (id: number) => {
    let items = read();
    items = items.filter((p) => p.id !== id);
    write(items);
    return true;
  },
};

export default productsApi;
