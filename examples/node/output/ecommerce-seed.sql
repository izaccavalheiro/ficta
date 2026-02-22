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
INSERT INTO categories (id, name, description) VALUES (1, 'Nathen Bechtelar Jr.', 'Repellat ab aduro victoria solium bellum.');
INSERT INTO categories (id, name, description) VALUES (2, 'Carolyn Orn', 'Ustulo apud acceptus amicitia arcus vapulus vespillo conatus volubilis audacia.');
INSERT INTO categories (id, name, description) VALUES (3, 'Lemuel Hermann', 'Cotidie conicio volutabrum placeat utor defero umerus vigilo adnuo.');
INSERT INTO categories (id, name, description) VALUES (4, 'Ruben King', 'Thorax casso impedit bibo tamquam nulla comes confero eaque.');
INSERT INTO categories (id, name, description) VALUES (5, 'Nina Labadie', 'Strues talio utpote.');

-- Table: customers
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (1, 'Devin_Lang@hotmail.com', 'Santiago', 'Franey', '297-263-7064 x9463', '2026-02-22T19:44:56.595Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (2, 'Harriet29@gmail.com', 'Andy', 'Konopelski', '1-874-344-7107 x17948', '2026-02-21T22:09:18.780Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (3, 'Carlton.Parker@yahoo.com', 'Buddy', 'Schmidt', '342.997.7753 x3827', '2026-02-22T05:56:15.385Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (4, 'Al_Kautzer@hotmail.com', 'Kristin', 'Cummerata', '1-263-762-6809 x22473', '2026-02-22T12:17:08.817Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (5, 'Bobbie.Mayert@gmail.com', 'Andre', 'Trantow', '887.628.6658 x09389', '2026-02-22T12:16:02.494Z');

-- Table: products
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (1, 3, 'ha', 'Rebecca Hermann', '300.59', 9474);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (2, 3, 'through', 'Amelia O''Connell', '321.69', 1567);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (3, 4, 'avaricious', 'Ken Marvin', '254.19', 1125);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (4, 5, 'yum', 'Mrs. Kristen Cremin-Ankunding DVM', '224.49', 8673);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (5, 3, 'rag', 'Michel Ritchie', '558.60', 2654);

-- Table: orders
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (1, 1, '1920.70', 'yowza', '2026-02-21T23:39:18.358Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (2, 4, '4394.19', 'since', '2026-02-22T03:20:40.690Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (3, 3, '4496.25', 'fabricate', '2026-02-21T21:51:06.229Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (4, 2, '4153.48', 'spirit', '2026-02-22T08:18:33.172Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (5, 5, '413.80', 'limp', '2026-02-22T07:39:00.753Z');

-- Table: order_items
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (1, 5, 2, 4887, 78.6);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (2, 4, 5, 6981, 78.24);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (3, 5, 3, 8887, 94.15);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (4, 3, 5, 4157, 59.85);
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES (5, 2, 1, 9094, 54.45);
