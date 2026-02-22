-- Table: categories
INSERT INTO categories (id, name, description) VALUES (1, 'Dr. Boyd Batz', 'Id virgo versus eos subseco.');
INSERT INTO categories (id, name, description) VALUES (2, 'Danielle Mann', 'Coniuratio tersus arbor thymum administratio absconditus conscendo.');
INSERT INTO categories (id, name, description) VALUES (3, 'Terence Murphy', 'Vir apostolus comes victus dolorum.');

-- Table: customers
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (1, 'Marcella.Kozey@yahoo.com', 'Deanna', 'Schroeder', '507-555-0940', '2026-02-22T02:50:42.036Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (2, 'Adonis.Mertz58@gmail.com', 'Irma', 'Grimes', '1-562-298-7718 x5680', '2026-02-22T04:54:41.633Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (3, 'Spencer_Homenick@yahoo.com', 'Manuel', 'Dickens', '841.537.3151 x2140', '2026-02-22T08:35:44.813Z');

-- Table: products
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (1, 3, 'christen', 'Lynne Prohaska', '109.09', 9211);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (2, 2, 'verbally', 'Mr. Jim Lehner', '384.39', 8987);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (3, 2, 'revoke', 'Orlando Kuphal', '108.55', 6833);

-- Table: orders
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (1, 1, '2083.60', 'rule', '2026-02-22T17:19:27.447Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (2, 1, '1859.89', 'save', '2026-02-21T22:55:30.736Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (3, 3, '3586.98', 'skeleton', '2026-02-22T19:12:50.280Z');

-- Table: order_items
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 2, 3, 1480, 32.26);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (2, 3, 1, 7264, 53.76);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (3, 1, 1, 4523, 54.82);
