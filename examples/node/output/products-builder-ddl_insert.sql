CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2),
  in_stock BOOLEAN DEFAULT true
);

INSERT INTO products (id, sku, name, price, in_stock) VALUES (1, 'PRD-764828', 'Rustic Concrete Sausages', '299.35', FALSE);
INSERT INTO products (id, sku, name, price, in_stock) VALUES (2, 'PRD-362099', 'Ergonomic Aluminum Table', '619.99', TRUE);
INSERT INTO products (id, sku, name, price, in_stock) VALUES (3, 'PRD-612052', 'Small Steel Keyboard', '425.95', TRUE);
INSERT INTO products (id, sku, name, price, in_stock) VALUES (4, 'PRD-113890', 'Small Marble Gloves', '939.20', TRUE);
INSERT INTO products (id, sku, name, price, in_stock) VALUES (5, 'PRD-062044', 'Handmade Steel Fish', '690.69', TRUE);