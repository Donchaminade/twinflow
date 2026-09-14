-- Demo schema for the TwinFlow café. Every synced table has a watermark
-- column so the sidecar can pull incrementally instead of copying the
-- whole table on every tick.

CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    category    TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock (
    product_id  INTEGER PRIMARY KEY REFERENCES products(id),
    quantity    INTEGER NOT NULL CHECK (quantity >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
    id          SERIAL PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_updated_at_idx ON products (updated_at, id);
CREATE INDEX IF NOT EXISTS stock_updated_at_idx ON stock (updated_at, product_id);
CREATE INDEX IF NOT EXISTS orders_updated_at_idx ON orders (updated_at, id);

-- Older databases may already have duplicate café rows from non-idempotent
-- boots. Keep the earliest id per name so the unique index can be created.
DELETE FROM orders
WHERE product_id IN (
    SELECT p.id FROM products p
    WHERE p.id NOT IN (SELECT MIN(id) FROM products GROUP BY name)
);
DELETE FROM stock
WHERE product_id IN (
    SELECT p.id FROM products p
    WHERE p.id NOT IN (SELECT MIN(id) FROM products GROUP BY name)
);
DELETE FROM products
WHERE id NOT IN (SELECT MIN(id) FROM products GROUP BY name);

CREATE UNIQUE INDEX IF NOT EXISTS products_name_key ON products (name);

INSERT INTO products (name, category, price_cents) VALUES
    ('Espresso', 'coffee', 280),
    ('Cortado', 'coffee', 340),
    ('Oat latte', 'coffee', 420),
    ('Seasonal pour-over', 'coffee', 480),
    ('Butter croissant', 'bakery', 310),
    ('Almond cookie', 'bakery', 220)
ON CONFLICT (name) DO NOTHING;

INSERT INTO stock (product_id, quantity)
SELECT id, CASE category WHEN 'coffee' THEN 48 ELSE 18 END
FROM products
ON CONFLICT (product_id) DO NOTHING;
