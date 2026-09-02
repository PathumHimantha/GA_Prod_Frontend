import { productsApi, Product } from "./productsApi";

export type StockHistory = {
  id: number;
  productId: number;
  type: "add" | "remove" | "set";
  quantity: number;
  previousStock: number;
  newStock: number;
  updatedBy: string;
  createdAt: string;
};

const HISTORY_KEY = "ga_stock_history_v1";

function readHistory(): StockHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writeHistory(items: StockHistory[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

export const stocksApi = {
  listHistory: async (productId?: number) => {
    const h = readHistory();
    return productId ? h.filter((r) => r.productId === productId) : h;
  },
  updateStock: async (
    productId: number,
    type: StockHistory["type"],
    qty: number,
    user = "admin",
  ) => {
    const product = await productsApi.get(productId);
    if (!product) throw new Error("Product not found");
    const prev = product.stock;
    let next = prev;
    if (type === "add") next = prev + qty;
    else if (type === "remove") next = Math.max(0, prev - qty);
    else next = qty;

    await productsApi.update(productId, { stock: next });

    const history = readHistory();
    const id = Math.max(0, ...history.map((h) => h.id)) + 1;
    const rec: StockHistory = {
      id,
      productId,
      type,
      quantity: qty,
      previousStock: prev,
      newStock: next,
      updatedBy: user,
      createdAt: new Date().toISOString(),
    };
    history.unshift(rec);
    writeHistory(history);
    return rec;
  },
};

export default stocksApi;
