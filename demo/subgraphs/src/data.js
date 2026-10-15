// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 TopherLabs LLC
// Deterministic seed data for the demo commerce graph. No dependencies; same seed => same dataset.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Ava', 'Noah', 'Mia', 'Liam', 'Zoe', 'Ethan', 'Ivy', 'Owen', 'Ruby', 'Leo', 'Nora', 'Eli', 'Maya', 'Finn', 'Cora', 'Jude', 'Tess', 'Omar', 'Lena', 'Hugo'];
const LAST = ['Reed', 'Patel', 'Nguyen', 'Garcia', 'Kim', 'Okafor', 'Silva', 'Muller', 'Haas', 'Lopez', 'Singh', 'Rossi', 'Cole', 'Ward', 'Frost', 'Brandt'];
const CITIES = [['Atlanta', 'GA'], ['Austin', 'TX'], ['Denver', 'CO'], ['Raleigh', 'NC'], ['Portland', 'OR'], ['Columbus', 'OH'], ['Tampa', 'FL'], ['Boise', 'ID']];
const SEGMENTS = ['retail', 'wholesale', 'partner', 'internal'];
const TIERS = ['standard', 'plus', 'preferred'];
const ADDRESS_KINDS = ['home', 'work', 'billing', 'dropship'];
const STATUSES = ['PLACED', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];
const TOP_CATEGORIES = ['Hardware', 'Electronics', 'Apparel', 'Garden'];
const SUB_CATEGORIES = ['Fasteners', 'Tools', 'Sensors', 'Cables', 'Outerwear', 'Footwear', 'Irrigation', 'Planters'];
const COUNTRIES = ['US', 'MX', 'DE', 'CN', 'CA'];
const WAREHOUSES = [['W-ATL', 'Atlanta DC', 'southeast'], ['W-DAL', 'Dallas DC', 'south-central'], ['W-DEN', 'Denver DC', 'mountain'], ['W-RNO', 'Reno DC', 'west'], ['W-CLE', 'Cleveland DC', 'midwest']];
const NOUNS = ['Bolt', 'Valve', 'Sensor', 'Cable', 'Jacket', 'Boot', 'Sprinkler', 'Planter', 'Drill', 'Gauge', 'Relay', 'Clamp'];
const ADJ = ['Heavy-duty', 'Compact', 'Weatherproof', 'Smart', 'Classic', 'Pro', 'Mini', 'Industrial'];

const pad = (n, w) => String(n).padStart(w, '0');
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {{seed?:number, customers?:number, products?:number, orders?:number}} opts
 */
export function buildDataset({ seed = 42, customers: nCustomers = 500, products: nProducts = 300, orders: nOrders = 1500 } = {}) {
  const rand = mulberry32(seed);
  const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = (arr) => arr[int(0, arr.length - 1)];

  const categories = [];
  TOP_CATEGORIES.forEach((name, i) => categories.push({ id: `CAT-${pad(i + 1, 2)}`, name, parentId: null }));
  SUB_CATEGORIES.forEach((name, i) => categories.push({ id: `CAT-${pad(i + 1 + TOP_CATEGORIES.length, 2)}`, name, parentId: categories[i % TOP_CATEGORIES.length].id }));

  const suppliers = Array.from({ length: 25 }, (_, i) => ({
    id: `SUP-${pad(i + 1, 3)}`,
    name: `${pick(LAST)} ${pick(['Supply', 'Industrial', 'Works', 'Trading'])} ${i + 1}`,
    country: pick(COUNTRIES),
    leadTimeDays: int(2, 45),
  }));

  const warehouses = WAREHOUSES.map(([id, name, region]) => ({ id, name, region }));

  const productRows = Array.from({ length: nProducts }, (_, i) => {
    const cat = pick(categories.slice(TOP_CATEGORIES.length));
    return {
      sku: `SKU-${pad(i + 1, 5)}`,
      name: `${pick(ADJ)} ${pick(NOUNS)} ${pad(i + 1, 3)}`,
      description: `${pick(ADJ)} ${pick(NOUNS).toLowerCase()} for ${pick(['field', 'shop', 'home', 'warehouse'])} use.`,
      categoryId: cat.id,
      supplierId: pick(suppliers).id,
      price: round2(2 + rand() * 198),
    };
  });

  const stockLevels = [];
  for (const p of productRows) {
    const count = int(2, warehouses.length);
    const ws = [...warehouses].sort(() => rand() - 0.5).slice(0, count);
    for (const w of ws) {
      const quantity = int(0, 500);
      stockLevels.push({ id: `STK-${p.sku}-${w.id}`, sku: p.sku, warehouseId: w.id, quantity, reserved: int(0, Math.min(quantity, 40)) });
    }
  }

  const customerRows = [];
  const addresses = [];
  for (let i = 0; i < nCustomers; i++) {
    const id = `C-${pad(i + 1, 5)}`;
    const first = pick(FIRST);
    const last = pick(LAST);
    const addressIds = [];
    for (let k = 0; k < int(1, 3); k++) {
      const [city, state] = pick(CITIES);
      const aid = `A-${pad(addresses.length + 1, 6)}`;
      addresses.push({ id: aid, customerId: id, line1: `${int(10, 9999)} ${pick(LAST)} St`, city, state, postalCode: String(int(10000, 99999)), kind: pick(ADDRESS_KINDS) });
      addressIds.push(aid);
    }
    customerRows.push({ id, name: `${first} ${last}`, email: `${first}.${last}${i + 1}@example.test`.toLowerCase(), segment: pick(SEGMENTS), tier: pick(TIERS), addressIds });
  }
  const addressById = new Map(addresses.map((a) => [a.id, a]));

  const orders = [];
  const orderLines = [];
  const base = Date.UTC(2026, 0, 1);
  for (let i = 0; i < nOrders; i++) {
    const customer = pick(customerRows);
    const id = `O-${pad(i + 1, 6)}`;
    const shipToId = pick(customer.addressIds);
    const billToId = rand() < 0.6 ? shipToId : pick(customer.addressIds);
    let total = 0;
    for (let k = 0; k < int(1, 6); k++) {
      const product = pick(productRows);
      const quantity = int(1, 8);
      const unitPrice = round2(product.price * (0.9 + rand() * 0.2));
      total += quantity * unitPrice;
      orderLines.push({ id: `${id}-L${k + 1}`, orderId: id, sku: product.sku, quantity, unitPrice });
    }
    orders.push({ id, customerId: customer.id, placedAt: new Date(base + int(0, 280) * 86400000).toISOString(), status: pick(STATUSES), shipToId, billToId, total: round2(total) });
  }

  const group = (rows, key) => {
    const m = new Map();
    for (const r of rows) (m.get(r[key]) ?? m.set(r[key], []).get(r[key])).push(r);
    return m;
  };

  return {
    seed,
    customers: customerRows,
    addresses,
    categories,
    suppliers,
    warehouses,
    products: productRows,
    stockLevels,
    orders,
    orderLines,
    customerById: new Map(customerRows.map((c) => [c.id, c])),
    addressById,
    categoryById: new Map(categories.map((c) => [c.id, c])),
    supplierById: new Map(suppliers.map((s) => [s.id, s])),
    warehouseById: new Map(warehouses.map((w) => [w.id, w])),
    productBySku: new Map(productRows.map((p) => [p.sku, p])),
    orderById: new Map(orders.map((o) => [o.id, o])),
    linesByOrder: group(orderLines, 'orderId'),
    ordersByCustomer: group(orders, 'customerId'),
    stockBySku: group(stockLevels, 'sku'),
  };
}

/** Total entity count across all node-like collections. */
export function countEntities(d) {
  return d.customers.length + d.addresses.length + d.categories.length + d.suppliers.length + d.warehouses.length + d.products.length + d.stockLevels.length + d.orders.length + d.orderLines.length;
}
