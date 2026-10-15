# Demo glossary sources (fictional)

Seed material for the glossary-svc (M2). Deliberately uses in-house shorthand that does not match schema names, so the
proposer has to map business language onto types. All terms are invented for the demo.

- **Drop-ship** - an order line fulfilled directly by a supplier instead of a warehouse. Customer addresses with `kind: "dropship"` are the usual destination.
- **Bill-to / Ship-to** - the party invoiced vs the location goods are delivered to. They differ for roughly 40% of orders; the schema fields are `Order.billTo` and `Order.shipTo`, both `Address`.
- **Plus / Preferred** - customer loyalty tiers stored as free text in `Customer.tier`. "Preferred" customers get priority allocation.
- **Available-to-promise (ATP)** - stock we can commit: on-hand minus reserved, summed across warehouses. Exposed as `Product.totalAvailable`.
- **Pull-through** - repeat orders for the same SKU by the same customer within 30 days; used in sales reporting, not stored anywhere.
- **RMA hold** - orders with status `RETURNED` are held out of ATP calculations until inspection completes.
- **Lead time** - supplier days-to-deliver, `Supplier.leadTimeDays`.
