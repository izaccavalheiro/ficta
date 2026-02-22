
  -- Lookup table: no FK dependencies
  CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT
  );

  -- Depends on: categories
  CREATE TABLE products (
    id          SERIAL  PRIMARY KEY,
    category_id INT     NOT NULL REFERENCES categories(id),
    sku         VARCHAR(50) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    price       DECIMAL(10,2),
    stock       INT DEFAULT 0
  );

  -- No FK dependencies
  CREATE TABLE customers (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name  VARCHAR(50),
    phone      VARCHAR(30),
    created_at TIMESTAMP
  );

  -- Depends on: customers
  CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    customer_id INT  NOT NULL REFERENCES customers(id),
    total       DECIMAL(10,2),
    status      VARCHAR(20) DEFAULT 'pending',
    placed_at   TIMESTAMP
  );

  -- Depends on: orders, products
  CREATE TABLE order_items (
    id         SERIAL PRIMARY KEY,
    order_id   INT NOT NULL REFERENCES orders(id),
    product_id INT NOT NULL REFERENCES products(id),
    quantity   INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
  );
