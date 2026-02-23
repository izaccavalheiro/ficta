CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description VARCHAR(255)
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(255),
  created_at TIMESTAMP
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL,
  sku VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price VARCHAR(255) NOT NULL,
  stock INTEGER DEFAULT '0',
  active BOOLEAN DEFAULT 'true',
  created_at TIMESTAMP
,
  CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  total VARCHAR(255) NOT NULL,
  status VARCHAR(255) DEFAULT 'pending',
  placed_at TIMESTAMP
,
  CONSTRAINT fk_orders_customer_id FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Table: categories
INSERT INTO categories (id, name, slug, description) VALUES (1, 'Kyle Streich DDS', 'correctly', 'Antea accusamus aspicio ars beneficium.');
INSERT INTO categories (id, name, slug, description) VALUES (2, 'Jenny Johnson', 'fathom', 'Vilitas surculus despecto tricesimus defendo deprecator.');
INSERT INTO categories (id, name, slug, description) VALUES (3, 'Juwan Rau Sr.', 'woot', 'Amicitia esse deporto paens surgo spes vesco natus uxor.');
INSERT INTO categories (id, name, slug, description) VALUES (4, 'Rosemary D''Amore', 'bah', 'Votum alter vigor temperantia color adstringo coniuratio delibero torrens.');

-- Table: customers
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (1, 'Kelsi73@gmail.com', 'Alberto', 'Huels', '584.784.9737 x664', '2026-02-22T16:47:55.745Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (2, 'Beth31@gmail.com', 'Elyse', 'Kassulke', '646-608-9184', '2026-02-22T06:49:01.028Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (3, 'Mack_Bednar0@yahoo.com', 'Dianna', 'Schaden', '489.829.9831', '2026-02-22T19:53:17.457Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (4, 'Marcia.Schimmel34@hotmail.com', 'Immanuel', 'Rippin', '1-618-426-9660', '2026-02-22T05:29:08.460Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (5, 'Sonja.Dickinson@yahoo.com', 'Francis', 'Ziemann', '471-257-1309 x8715', '2026-02-22T18:49:40.331Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (6, 'Alexandro.Stiedemann78@gmail.com', 'Angelina', 'Bruen', '685-809-2051 x645', '2026-02-22T07:27:10.888Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (7, 'Dora.Olson46@hotmail.com', 'Jacinto', 'Rodriguez', '(734) 938-7564 x05718', '2026-02-22T05:24:32.633Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (8, 'Domingo_Daniel73@gmail.com', 'Micheal', 'O''Connell-Cronin', '842-932-3940 x63494', '2026-02-22T14:37:06.624Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (9, 'Zander.Nader43@gmail.com', 'Lauren', 'Von', '1-517-277-6324 x99292', '2026-02-22T08:44:19.643Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (10, 'Chester_Christiansen@gmail.com', 'Julie', 'Mosciski', '674-453-1154 x1379', '2026-02-22T08:38:49.758Z');

-- Table: products
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (1, 2, 'woefully', 'Bobbie Reilly', '912.84', 8849, FALSE, '2026-02-22T15:32:23.715Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (2, 2, 'ew', 'Alysa Kirlin', '965.65', 3885, FALSE, '2026-02-22T05:12:52.697Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (3, 1, 'yum', 'Wade Sauer', '696.40', 1829, TRUE, '2026-02-22T17:56:21.205Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (4, 3, 'inferior', 'Demetrius Quitzon', '239.85', 9438, TRUE, '2026-02-22T20:55:54.763Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (5, 4, 'although', 'Laura Fay', '163.19', 4754, TRUE, '2026-02-22T13:43:55.972Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (6, 4, 'urgently', 'Emma Kemmer', '71.80', 6224, TRUE, '2026-02-22T12:32:21.729Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (7, 3, 'until', 'Milton Graham', '97.39', 2742, TRUE, '2026-02-22T10:06:23.511Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (8, 1, 'account', 'Georgette McGlynn', '764.75', 8392, TRUE, '2026-02-22T05:14:32.909Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (9, 4, 'er', 'Larry Monahan MD', '624.78', 7287, TRUE, '2026-02-22T09:32:31.437Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (10, 1, 'wilt', 'Rosemary Satterfield', '752.55', 5662, TRUE, '2026-02-22T23:00:37.466Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (11, 1, 'pace', 'Dr. Hugo Brekke', '836.95', 3514, FALSE, '2026-02-22T08:04:05.525Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (12, 3, 'by', 'Dr. Ezra Wintheiser', '273.95', 9370, FALSE, '2026-02-23T03:50:26.516Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (13, 3, 'until', 'Cornelius Gleichner', '649.69', 514, TRUE, '2026-02-22T17:34:36.048Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (14, 2, 'hoick', 'Kellie Aufderhar', '145.69', 7980, FALSE, '2026-02-22T23:25:24.263Z');
INSERT INTO products (id, category_id, sku, name, price, stock, active, created_at) VALUES (15, 2, 'till', 'Candice Steuber', '57.79', 208, FALSE, '2026-02-23T03:10:57.755Z');

-- Table: orders
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (1, 1, '510.09', 'intensely', '2026-02-22T16:42:18.480Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (2, 1, '4783.86', 'immediately', '2026-02-22T08:42:59.588Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (3, 5, '4035.50', 'frantically', '2026-02-22T19:45:04.394Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (4, 7, '952.04', 'gasp', '2026-02-22T16:33:12.153Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (5, 10, '2571.33', 'oh', '2026-02-22T09:29:26.819Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (6, 1, '874.42', 'positively', '2026-02-22T15:18:37.347Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (7, 2, '3738.47', 'dishonor', '2026-02-23T00:20:50.900Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (8, 1, '3872.53', 'form', '2026-02-22T09:14:38.554Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (9, 9, '2906.47', 'swiftly', '2026-02-22T06:12:34.001Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (10, 6, '432.72', 'anenst', '2026-02-22T08:10:28.740Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (11, 3, '2362.40', 'discrete', '2026-02-22T22:44:20.495Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (12, 10, '1618.05', 'even', '2026-02-22T09:24:39.458Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (13, 10, '4099.88', 'factorize', '2026-02-22T18:28:46.185Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (14, 7, '3878.34', 'adjourn', '2026-02-23T04:50:55.094Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (15, 3, '907.64', 'responsible', '2026-02-23T04:36:10.716Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (16, 1, '2360.42', 'luck', '2026-02-22T12:09:33.654Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (17, 4, '2874.96', 'er', '2026-02-23T01:23:21.516Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (18, 3, '4495.33', 'buzzing', '2026-02-22T19:47:36.115Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (19, 4, '850.13', 'guacamole', '2026-02-22T12:52:29.579Z');
INSERT INTO orders (id, customer_id, total, status, placed_at) VALUES (20, 6, '2986.52', 'excluding', '2026-02-22T11:34:43.151Z');
