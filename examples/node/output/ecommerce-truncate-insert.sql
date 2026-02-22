TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE categories CASCADE;

-- Table: categories
INSERT INTO categories (id, name, description) VALUES (1, 'Mr. Alan Langworth', 'Aequitas sortitus vilicus atrocitas aggero crebro cubicularis.');
INSERT INTO categories (id, name, description) VALUES (2, 'Paris Marks', 'Viridis tardus tantillus alter crinis.');
INSERT INTO categories (id, name, description) VALUES (3, 'Robert Gislason', 'Saepe curto vestigium vito admiratio adhuc civitas terror adamo nulla.');
INSERT INTO categories (id, name, description) VALUES (4, 'Alden Lockman', 'Addo nostrum tutis amissio triumphus conatus aureus campana sonitus solium.');

-- Table: customers
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (1, 'Jeffry38@gmail.com', 'Anna', 'Waters', '(744) 431-0067 x880', '2026-02-22T19:58:08.464Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (2, 'Archie33@gmail.com', 'Allen', 'Hirthe', '1-652-828-8131 x95522', '2026-02-22T15:38:07.909Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (3, 'Roy59@yahoo.com', 'Elsa', 'Wehner', '633.422.1679 x12422', '2026-02-22T09:04:55.249Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (4, 'Jamison.McLaughlin-Dach@yahoo.com', 'Luther', 'Barton', '1-304-402-8785 x3247', '2026-02-22T12:17:30.130Z');

-- Table: products
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (1, 3, 'partially', 'Lucille Herzog', '362.39', 1343);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (2, 1, 'till', 'Peter Stokes', '17.00', 454);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (3, 1, 'geez', 'Mrs. Rebeka Larson', '386.27', 9517);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (4, 2, 'beneficial', 'Shirley Yost-Gleason', '205.85', 7513);

-- Table: orders
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (1, 4, '4908.18', 'merit', '2026-02-22T16:36:21.696Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (2, 2, '2043.92', 'overcoat', '2026-02-22T11:51:02.847Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (3, 1, '383.69', 'frizz', '2026-02-22T03:02:50.975Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (4, 2, '3714.46', 'why', '2026-02-22T06:49:23.718Z');

-- Table: order_items
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 1, 1, 9872, 72.43);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (2, 3, 2, 8289, 28);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (3, 3, 2, 3478, 66.79);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (4, 3, 2, 9266, 72.76);
