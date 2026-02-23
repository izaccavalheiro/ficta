-- Schema: ecommerce
-- Dialect: postgres
-- Generated: 2026-02-23T05:03:21.182Z

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  phone VARCHAR(20),
  created_at TIMESTAMP
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER,
  sku VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2),
  stock INTEGER DEFAULT 0
,
  CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Table: categories
INSERT INTO categories (id, name, description) VALUES (1, 'Health', 'Velut cetera supellex cimentarius voluntarius accusamus rem.');
INSERT INTO categories (id, name, description) VALUES (2, 'Tools', 'Vulariter attonbitus ea tego laudantium aestas tergum amitto videlicet.');
INSERT INTO categories (id, name, description) VALUES (3, 'Computers', 'Articulus amo doloremque cupressus urbs.');
INSERT INTO categories (id, name, description) VALUES (4, 'Sports', 'Arcus uter cognomen tergo depopulo eos bellum calculus taedium tabesco.');
INSERT INTO categories (id, name, description) VALUES (5, 'Movies', 'Celo surculus ancilla stella suggero desparatus amor cultellus nemo aiunt.');
INSERT INTO categories (id, name, description) VALUES (6, 'Automotive', 'Triumphus conscendo curo depraedor minus subseco.');
INSERT INTO categories (id, name, description) VALUES (7, 'Electronics', 'Asperiores blanditiis circumvenio terreo odio tamisium spero alter atrox.');
INSERT INTO categories (id, name, description) VALUES (8, 'Kids', 'Solium currus angulus aliquam custodia aegrus.');
INSERT INTO categories (id, name, description) VALUES (9, 'Electronics', 'Aqua suasoria bellicus sublime volaticus dapifer causa.');
INSERT INTO categories (id, name, description) VALUES (10, 'Jewelry', 'Baiulus vociferor arcesso porro.');

-- Table: customers
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (1, 'Leland_Kovacek71@gmail.com', 'Lizeth', 'Upton', '(990) 222-8463 x04532', '2026-02-22T13:49:12.434Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (2, 'Matteo_Torp62@gmail.com', 'Ruben', 'Kuhic', '1-474-939-8598', '2026-02-22T20:30:02.933Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (3, 'Ruby.Kris@yahoo.com', 'Phyllis', 'Nitzsche', '680-932-2736 x48064', '2026-02-22T23:49:04.622Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (4, 'Sarah89@yahoo.com', 'Jannie', 'Waelchi', '370.882.1360 x5197', '2026-02-22T12:46:43.661Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (5, 'Vallie14@gmail.com', 'George', 'Kiehn', '220-412-7476 x68574', '2026-02-22T08:22:05.395Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (6, 'James13@yahoo.com', 'Antwan', 'Beahan', '388.990.8695 x393', '2026-02-22T18:38:00.235Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (7, 'Geraldine.Stroman@gmail.com', 'Rafael', 'Hoeger', '202-841-3092 x96393', '2026-02-22T12:30:59.543Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (8, 'Kallie_Deckow@yahoo.com', 'Blanche', 'Hilpert', '299.467.3154 x122', '2026-02-22T09:05:46.391Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (9, 'June6@yahoo.com', 'Malachi', 'Hackett-Kuhic', '1-854-942-5441', '2026-02-22T08:56:05.150Z');
INSERT INTO customers (id, email, first_name, last_name, phone, created_at) VALUES (10, 'Rafael_Von@yahoo.com', 'Jackie', 'O''Kon', '207.569.5930 x5344', '2026-02-22T07:57:20.230Z');

-- Table: products
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (1, 8506, 'P-693277', 'Refined Bamboo Keyboard', '119.29', 17);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (2, 2959, 'P-071435', 'Electronic Granite Gloves', '928.85', 20);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (3, 8067, 'P-022184', 'Fresh Bamboo Soap', '618.55', 481);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (4, 5038, 'P-934242', 'Rustic Cotton Chicken', '321.29', 31);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (5, 7510, 'P-803588', 'Practical Concrete Computer', '907.39', 295);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (6, 1405, 'P-430704', 'Unbranded Bamboo Soap', '654.65', 444);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (7, 1670, 'P-794671', 'Recycled Gold Chair', '327.59', 412);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (8, 6597, 'P-833958', 'Refined Bronze Tuna', '55.00', 46);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (9, 663, 'P-388678', 'Luxurious Plastic Chips', '130.30', 498);
INSERT INTO products (id, category_id, sku, name, price, stock) VALUES (10, 1810, 'P-260564', 'Elegant Marble Pizza', '119.71', 427);
