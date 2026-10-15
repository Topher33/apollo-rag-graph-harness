import * as customers from './subgraphs/customers.js';
import * as orders from './subgraphs/orders.js';
import * as catalog from './subgraphs/catalog.js';
import * as inventory from './subgraphs/inventory.js';

/** name -> { name, port, sdl, createResolvers(data) }. Dependency-free so tests/tools can import it cheaply. */
export const SUBGRAPHS = { customers, orders, catalog, inventory };
export { buildDataset, countEntities } from './data.js';
