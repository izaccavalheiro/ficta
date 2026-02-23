CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  category VARCHAR(50),
  price DECIMAL(10,2),
  in_stock BOOLEAN
);

INSERT INTO products (id, sku, name, category, price, in_stock) VALUES (1, 'PRD-087296', 'Small Granite Salad', 'Beauty', '94.29', TRUE);
INSERT INTO products (id, sku, name, category, price, in_stock) VALUES (2, 'PRD-584868', 'Elegant Wooden Chips', 'Electronics', '613.15', TRUE);
INSERT INTO products (id, sku, name, category, price, in_stock) VALUES (3, 'PRD-098610', 'Handcrafted Ceramic Car', 'Tools', '135.09', TRUE);
INSERT INTO products (id, sku, name, category, price, in_stock) VALUES (4, 'PRD-669321', 'Practical Silk Tuna', 'Toys', '952.65', FALSE);
INSERT INTO products (id, sku, name, category, price, in_stock) VALUES (5, 'PRD-281009', 'Electronic Metal Ball', 'Automotive', '448.15', FALSE);