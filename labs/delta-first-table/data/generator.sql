-- Générateur déterministe de la table `orders` (données entièrement synthétiques, aucune donnée personnelle).
-- Rendu pour Spark SQL (notebook) et DuckDB (navigateur, CI) par src/domain/sql/generator-dialect.ts.
-- Uniquement de l'arithmétique entière sur `id` : les deux moteurs produisent exactement les mêmes lignes.
CREATE OR REPLACE TABLE {{TARGET}} AS
SELECT
  CAST(id AS BIGINT) AS order_id,
  CAST(id % 500 AS INT) + 1 AS customer_id,
  CASE CAST(id % 10 AS INT)
    WHEN 0 THEN 'cancelled'
    WHEN 1 THEN 'returned'
    WHEN 2 THEN 'pending'
    WHEN 3 THEN 'pending'
    ELSE 'delivered'
  END AS status,
  CASE CAST(id % 4 AS INT)
    WHEN 0 THEN 'FR'
    WHEN 1 THEN 'DE'
    WHEN 2 THEN 'ES'
    ELSE 'IT'
  END AS country,
  CAST((id * 37) % 9901 + 100 AS INT) AS amount_cents,
  {{DATE_ADD(DATE '2026-01-01', CAST((id * 7) % 180 AS INT))}} AS order_date
FROM {{IDS(ROWS)}} AS ids
