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
INSERT INTO categories (id, name, description) VALUES (1, 'Emory Reilly', 'Uterque patior tendo aufero dolorum vorax spiritus causa cunabula.');
INSERT INTO categories (id, name, description) VALUES (2, 'Michelle Beahan Jr.', 'Umquam vesper dedecor vero sum conspergo cunabula pauci cohors conduco.');
INSERT INTO categories (id, name, description) VALUES (3, 'Bennie Fadel', 'Theca tibi comedo volubilis beatus antiquus tardus abutor.');
INSERT INTO categories (id, name, description) VALUES (4, 'Alicia Mayer', 'Accusantium suppono uredo tabesco cunae cohibeo vulticulus thymbra.');
INSERT INTO categories (id, name, description) VALUES (5, 'Miss Pam Christiansen', 'Succedo civitas accusantium cognatus repudiandae minima crapula.');

-- Table: customers
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (1, 'Danny58@yahoo.com', 'Mayra', 'Bode', '532.284.8072 x915', '2026-02-23T03:25:24.590Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (2, 'Edwina_Terry@yahoo.com', 'Lenna', 'Casper', '258-648-9922 x82799', '2026-02-22T06:05:49.363Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (3, 'Nakia.Von@yahoo.com', 'Nellie', 'O''Keefe', '635.852.2406 x729', '2026-02-22T14:18:15.420Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (4, 'Lucas.Prosacco@yahoo.com', 'Carol', 'Balistreri', '479-848-4969 x043', '2026-02-22T07:51:06.948Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (5, 'Lenny_Bode89@hotmail.com', 'Fay', 'Dickens', '370.341.5377 x76627', '2026-02-22T13:20:54.325Z');

-- Table: products
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (1, 4, 'duh', 'Cindy Durgan', '831.89', 5554);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (2, 4, 'bug', 'Jordan Fadel', '892.75', 4253);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (3, 4, 'lox', 'Devon Emmerich', '73.19', 3158);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (4, 4, 'vaguely', 'Gwen McLaughlin', '788.99', 9993);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (5, 4, 'ack', 'Nova Smith', '494.95', 8746);

-- Table: orders
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (1, 3, '56.79', 'below', '2026-02-22T10:59:22.721Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (2, 2, '4915.95', 'justly', '2026-02-22T06:48:36.568Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (3, 5, '2897.39', 'than', '2026-02-22T11:00:41.670Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (4, 5, '2350.36', 'obedient', '2026-02-22T18:04:35.358Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (5, 1, '1184.58', 'stable', '2026-02-22T23:17:40.776Z');

-- Table: order_items
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 3, 2, 9105, 15.82);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (2, 4, 5, 2492, 59.29);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (3, 2, 2, 9766, 77.48);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (4, 1, 1, 3461, 42.42);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (5, 1, 4, 7687, 79.16);
