TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE categories CASCADE;

-- Table: categories
INSERT INTO categories (id, name, description) VALUES (1, 'Jennifer Runolfsson', 'Timidus aggredior claudeo vulpes cruentus.');
INSERT INTO categories (id, name, description) VALUES (2, 'Florida Jenkins', 'Acies contra ait numquam totus admoveo administratio cunctatio titulus.');
INSERT INTO categories (id, name, description) VALUES (3, 'Gregg Koch', 'Quas ver adflicto porro sto thymum.');
INSERT INTO categories (id, name, description) VALUES (4, 'Lucie Mertz', 'Super tabgo quaerat.');

-- Table: customers
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (1, 'Vanessa.Gleichner32@hotmail.com', 'Brett', 'Schuppe', '(642) 674-3638 x58954', '2026-02-22T21:16:00.705Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (2, 'Elena_Sawayn13@gmail.com', 'Cathy', 'Swift', '393.824.0366 x869', '2026-02-23T03:28:01.288Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (3, 'Ray60@yahoo.com', 'Maggie', 'Ondricka', '(574) 715-2142', '2026-02-22T23:57:59.248Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (4, 'Cecelia_Halvorson-Mertz3@gmail.com', 'Jeremie', 'Beier', '(252) 374-4930 x1533', '2026-02-22T23:40:29.835Z');

-- Table: products
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (1, 4, 'forenenst', 'Mrs. Monique Strosin', '896.69', 9246);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (2, 3, 'finally', 'June Gleichner', '749.15', 3065);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (3, 2, 'whose', 'Bennie Wuckert', '29.15', 8139);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (4, 4, 'inasmuch', 'Mr. Ludie Osinski V', '720.25', 4126);

-- Table: orders
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (1, 2, '4561.73', 'greatly', '2026-02-22T06:36:19.680Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (2, 2, '380.88', 'frozen', '2026-02-22T16:25:21.439Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (3, 3, '4513.27', 'tankful', '2026-02-22T05:14:49.481Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (4, 3, '712.60', 'present', '2026-02-22T11:31:00.269Z');

-- Table: order_items
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 3, 4, 9433, 17.26);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (2, 3, 4, 9481, 51.05);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (3, 3, 4, 53, 28);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (4, 1, 3, 9486, 68.89);
