CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  phone VARCHAR(30),
  created_at TIMESTAMP
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2),
  stock INT DEFAULT '0'
,
  CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  total DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  placed_at TIMESTAMP
,
  CONSTRAINT fk_orders_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
,
  CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_product_id FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Table: categories
INSERT INTO categories (id, name, description) VALUES (1, 'Mr. Cory Ratke', 'Rem maiores denego socius atque sonitus cerno caritas.');
INSERT INTO categories (id, name, description) VALUES (2, 'Taya Schowalter', 'Tepesco casso tantum sonitus vilis demoror uberrime.');
INSERT INTO categories (id, name, description) VALUES (3, 'Rudy Nienow', 'Laudantium commodo cunae vesica confero conqueror arceo.');
INSERT INTO categories (id, name, description) VALUES (4, 'Miss Emelia Dicki', 'Utilis teres civis denego cursus adhuc amplus.');
INSERT INTO categories (id, name, description) VALUES (5, 'Lillie Hudson', 'Eum pecco asporto unde.');

-- Table: customers
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (1, 'Cedric5@gmail.com', 'Karl', 'D''Amore', '1-894-342-3768', '2026-02-22T13:06:08.766Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (2, 'Janie.Rippin7@yahoo.com', 'Richard', 'Corwin', '444.448.7281 x8222', '2026-02-22T20:10:55.080Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (3, 'Alison7@hotmail.com', 'Lucas', 'Ratke', '511.848.1427 x216', '2026-02-22T15:31:36.304Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (4, 'Justus14@gmail.com', 'Garth', 'Koelpin', '1-876-906-1733 x926', '2026-02-22T01:09:45.604Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (5, 'Jerrod46@hotmail.com', 'Joyce', 'Bogan', '1-586-885-4589 x4394', '2026-02-22T01:27:19.292Z');

-- Table: products
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (1, 5, 'sneaky', 'Casey Welch Sr.', '384.89', 7784);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (2, 4, 'yellow', 'Ms. Cecilia Stoltenberg', '980.75', 2377);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (3, 5, 'where', 'Raquel Gislason IV', '509.89', 9464);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (4, 2, 'next', 'Ernest Harris', '993.55', 2101);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (5, 5, 'hm', 'Raheem Koelpin', '27.25', 2571);

-- Table: orders
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (1, 1, '3074.25', 'exotic', '2026-02-22T10:43:07.092Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (2, 1, '2174.74', 'tarragon', '2026-02-21T23:14:32.526Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (3, 4, '2333.75', 'than', '2026-02-22T00:08:30.902Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (4, 5, '4882.31', 'for', '2026-02-22T06:32:47.341Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (5, 5, '997.59', 'geez', '2026-02-22T15:07:12.451Z');

-- Table: order_items
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 4, 4, 808, 16.34);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (2, 4, 5, 4811, 1.24);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (3, 2, 3, 79, 72.32);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (4, 2, 4, 8605, 83.73);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (5, 2, 3, 6350, 88);
