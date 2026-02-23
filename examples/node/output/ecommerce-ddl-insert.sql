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
INSERT INTO categories (id, name, description) VALUES (1, 'Dell Kuhn', 'Delicate tenus cernuus corona aestas deserunt varietas cedo aliquam totus.');
INSERT INTO categories (id, name, description) VALUES (2, 'Alejandro Simonis', 'Temperantia sufficio a ocer inventore admiratio depulso carpo creo.');
INSERT INTO categories (id, name, description) VALUES (3, 'Adalberto Yost', 'Magni est alienus apostolus recusandae cornu cado spargo utrimque quibusdam.');
INSERT INTO categories (id, name, description) VALUES (4, 'Holly Boyle', 'Claudeo blandior suadeo adeo ancilla ascit tremo.');
INSERT INTO categories (id, name, description) VALUES (5, 'Winifred Wuckert', 'Conforto aperiam eius solutio infit ventus vomica dolore.');

-- Table: customers
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (1, 'Leta99@gmail.com', 'Jeffrey', 'Anderson', '(929) 904-4662', '2026-02-22T14:51:10.585Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (2, 'Isabel.Prosacco42@hotmail.com', 'Cesar', 'Hegmann', '(426) 272-6287', '2026-02-22T09:56:37.593Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (3, 'Leticia.Kerluke60@yahoo.com', 'Lois', 'MacGyver', '1-990-391-4857', '2026-02-22T18:05:13.680Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (4, 'Alicia_Considine@gmail.com', 'Alfonso', 'Konopelski', '483.305.0154 x582', '2026-02-22T16:53:09.767Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (5, 'Lula_Rosenbaum@gmail.com', 'Gerhard', 'Bode', '317.658.8899 x0732', '2026-02-23T03:42:41.440Z');

-- Table: products
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (1, 4, 'baseboard', 'Irving Klocko', '573.65', 5541);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (2, 3, 'apropos', 'Pat Mayer', '782.58', 6248);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (3, 5, 'overcook', 'Tressa Oberbrunner', '646.69', 2809);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (4, 3, 'rekindle', 'Marcelina Nicolas V', '709.55', 6165);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (5, 5, 'yippee', 'Louise Conroy', '48.19', 8656);

-- Table: orders
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (1, 4, '3953.53', 'quirkily', '2026-02-22T08:13:59.142Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (2, 5, '3368.60', 'clamp', '2026-02-22T20:17:56.737Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (3, 3, '3174.33', 'reproachfully', '2026-02-23T02:59:04.427Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (4, 3, '1511.68', 'duh', '2026-02-22T08:36:34.522Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (5, 5, '3277.42', 'gah', '2026-02-23T02:32:39.736Z');

-- Table: order_items
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 3, 2, 3320, 80.92);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (2, 5, 5, 4090, 27.94);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (3, 2, 3, 1762, 5.89);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (4, 2, 1, 16, 38.37);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (5, 1, 4, 9621, 93.67);
