-- Table: categories
INSERT INTO categories (id, name, description) VALUES (1, 'Shelly Monahan', 'Assumenda depromo bis virgo derelinquo quas pel aspernatur temeritas acies.');
INSERT INTO categories (id, name, description) VALUES (2, 'Aurelia Lind', 'Veniam cattus armarium dedecor credo universe asporto.');
INSERT INTO categories (id, name, description) VALUES (3, 'Nora Herman', 'Commemoro currus solvo cognatus celebrer.');

-- Table: customers
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (1, 'Christina.Bernier95@hotmail.com', 'Lorenza', 'Zulauf', '790.290.2553 x759', '2026-02-22T22:05:57.738Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (2, 'Kate_Aufderhar38@gmail.com', 'Tonya', 'Prohaska', '1-218-411-2495', '2026-02-22T08:42:48.677Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (3, 'Yvonne_Mueller63@yahoo.com', 'Meggie', 'Boyer', '771-729-0474', '2026-02-22T10:56:27.579Z');

-- Table: products
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (1, 2, 'above', 'Adell Franecki', '334.92', 2313);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (2, 2, 'mid', 'May Langworth', '997.29', 2171);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (3, 3, 'gown', 'Mya Armstrong', '807.09', 5544);

-- Table: orders
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (1, 1, '3656.83', 'posh', '2026-02-22T15:18:57.567Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (2, 2, '458.69', 'joshingly', '2026-02-22T20:10:02.063Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (3, 3, '2294.73', 'jumbo', '2026-02-23T04:53:08.726Z');

-- Table: order_items
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 3, 2, 4962, 64.97);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (2, 1, 1, 272, 48.4);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (3, 2, 3, 3149, 25.14);
