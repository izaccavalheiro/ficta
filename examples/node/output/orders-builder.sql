CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_ref VARCHAR(255),
  tracking VARCHAR(255),
  customer_id INT,
  currency ENUM('USD', 'EUR', 'GBP', 'JPY'),
  total DECIMAL(10,2),
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
  env VARCHAR(255),
  placed_at DATE
);

INSERT INTO orders (id, order_ref, tracking, customer_id, currency, total, status, env, placed_at) VALUES (1, 'ORD-815331', 'TRK-1', 40, 'USD', '137.89', 'delivered', 'production', '2026-02-02');
INSERT INTO orders (id, order_ref, tracking, customer_id, currency, total, status, env, placed_at) VALUES (2, 'ORD-933129', 'TRK-2', 11, 'JPY', '547.55', 'pending', 'production', '2026-01-25');
INSERT INTO orders (id, order_ref, tracking, customer_id, currency, total, status, env, placed_at) VALUES (3, 'ORD-971891', 'TRK-3', 64, 'USD', '86.19', 'pending', 'production', '2026-02-14');
INSERT INTO orders (id, order_ref, tracking, customer_id, currency, total, status, env, placed_at) VALUES (4, 'ORD-159866', 'TRK-4', 96, 'EUR', '981.49', 'processing', 'production', '2026-02-11');
INSERT INTO orders (id, order_ref, tracking, customer_id, currency, total, status, env, placed_at) VALUES (5, 'ORD-481085', 'TRK-5', 45, 'USD', '602.89', 'cancelled', 'production', '2026-02-06');
INSERT INTO orders (id, order_ref, tracking, customer_id, currency, total, status, env, placed_at) VALUES (6, 'ORD-333901', 'TRK-6', 33, 'GBP', '329.09', 'shipped', 'production', '2026-01-30');
INSERT INTO orders (id, order_ref, tracking, customer_id, currency, total, status, env, placed_at) VALUES (7, 'ORD-132763', 'TRK-7', 6, 'GBP', '366.10', 'delivered', 'production', '2026-02-11');
INSERT INTO orders (id, order_ref, tracking, customer_id, currency, total, status, env, placed_at) VALUES (8, 'ORD-986960', 'TRK-8', 80, 'USD', '462.75', 'delivered', 'production', '2026-01-30');