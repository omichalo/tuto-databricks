-- Déroulé de référence du TP, exécuté par la CI dans DuckDB sur les données du générateur.
-- Il produit data/expected-stats.json, que la cellule de vérification du notebook compare au résultat réel.
-- Marqueurs : @query (résultat tabulaire), @scalar (une valeur entière), @exec (instruction sans résultat).

-- @scalar rows
SELECT COUNT(*) FROM orders

-- @query byStatusBeforeUpdate
SELECT status, COUNT(*) AS orders, SUM(amount_cents) AS revenue_cents
FROM orders
GROUP BY status
ORDER BY revenue_cents DESC, status

-- @exec createOrdersByCountry
CREATE OR REPLACE TABLE orders_by_country AS
SELECT country, COUNT(*) AS delivered_orders, SUM(amount_cents) AS delivered_revenue_cents
FROM orders
WHERE status = 'delivered'
GROUP BY country

-- @query byCountryDelivered
SELECT country, delivered_orders, delivered_revenue_cents
FROM orders_by_country
ORDER BY delivered_revenue_cents DESC, country

-- @scalar countries
SELECT COUNT(*) FROM orders_by_country

-- @scalar deliveredRevenueCents
SELECT SUM(delivered_revenue_cents) FROM orders_by_country

-- @scalar pendingBeforeUpdate
SELECT COUNT(*) FROM orders WHERE status = 'pending'

-- @scalar cancelledBeforeUpdate
SELECT COUNT(*) FROM orders WHERE status = 'cancelled'

-- @scalar updatedRows
SELECT COUNT(*) FROM orders WHERE status = 'pending' AND order_date < DATE '2026-03-01'

-- @exec cancelOldPending
UPDATE orders SET status = 'cancelled' WHERE status = 'pending' AND order_date < DATE '2026-03-01'

-- @scalar pendingAfterUpdate
SELECT COUNT(*) FROM orders WHERE status = 'pending'

-- @scalar cancelledAfterUpdate
SELECT COUNT(*) FROM orders WHERE status = 'cancelled'
