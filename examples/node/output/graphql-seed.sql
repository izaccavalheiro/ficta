CREATE TABLE product (
  id UUID NOT NULL,
  sku VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  price VARCHAR(255) NOT NULL,
  stock INTEGER NOT NULL,
  category VARCHAR(255) NOT NULL,
  available BOOLEAN NOT NULL,
  created_at TIMESTAMP
);

CREATE TABLE customer (
  id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  phone VARCHAR(255),
  city VARCHAR(255),
  country VARCHAR(255),
  created_at TIMESTAMP
);

-- Table: product
INSERT INTO product (id, sku, name, description, price, stock, category, available, created_at) VALUES (1, 'why', 'Isabell Jacobi', 'Suffoco cohaero solus advoco arca coerceo eius.', '425.75', 8392, 'that', FALSE, '2026-02-22T20:46:14.651Z');
INSERT INTO product (id, sku, name, description, price, stock, category, available, created_at) VALUES (2, 'ambitious', 'Milton Borer', 'Tamen thesis vesper depraedor addo delectatio ad patrocinor subito esse.', '749.69', 657, 'for', TRUE, '2026-02-23T07:44:05.217Z');
INSERT INTO product (id, sku, name, description, price, stock, category, available, created_at) VALUES (3, 'after', 'Darlene Satterfield', 'Angelus coniecto artificiose corrigo solio baiulus aperio.', '439.70', 8523, 'amid', FALSE, '2026-02-23T12:24:46.193Z');
INSERT INTO product (id, sku, name, description, price, stock, category, available, created_at) VALUES (4, 'clamp', 'Estell Little-Lakin', 'Strenuus voco admoveo carcer.', '797.59', 9806, 'viciously', TRUE, '2026-02-22T16:56:07.743Z');
INSERT INTO product (id, sku, name, description, price, stock, category, available, created_at) VALUES (5, 'heartache', 'Glen Gutmann', 'Creber ipsum thalassinus suspendo earum deserunt conqueror cerno conqueror cupio.', '989.85', 8414, 'lest', TRUE, '2026-02-23T12:46:14.589Z');
INSERT INTO product (id, sku, name, description, price, stock, category, available, created_at) VALUES (6, 'pick', 'Woodrow Ledner', 'Utique abstergo volaticus xiphias speciosus omnis.', '999.29', 7956, 'gadzooks', TRUE, '2026-02-22T20:57:52.838Z');
INSERT INTO product (id, sku, name, description, price, stock, category, available, created_at) VALUES (7, 'rule', 'Sabrina Berge DVM', 'Currus debitis synagoga.', '871.49', 3172, 'vainly', FALSE, '2026-02-23T09:28:54.389Z');
INSERT INTO product (id, sku, name, description, price, stock, category, available, created_at) VALUES (8, 'supposing', 'Bobby Prohaska', 'Sunt correptius acies creber numquam civitas subito vigilo voluptate.', '327.29', 2512, 'provided', FALSE, '2026-02-23T08:42:44.155Z');
INSERT INTO product (id, sku, name, description, price, stock, category, available, created_at) VALUES (9, 'warming', 'Reyes Stiedemann', 'Tamisium aeternus debeo cetera ara sit adinventitias.', '64.39', 8168, 'while', TRUE, '2026-02-22T16:20:53.019Z');
INSERT INTO product (id, sku, name, description, price, stock, category, available, created_at) VALUES (10, 'fedora', 'Dr. Mathew Maggio', 'Beatae adaugeo virgo vita.', '723.65', 4556, 'helplessly', FALSE, '2026-02-23T11:30:20.716Z');

-- Table: customer
INSERT INTO customer (id, email, first_name, last_name, phone, city, country, created_at) VALUES (1, 'Kraig96@gmail.com', 'Jeromy', 'Kihn', '(862) 846-1652 x2513', 'West Arlene', 'Guinea', '2026-02-23T13:16:38.816Z');
INSERT INTO customer (id, email, first_name, last_name, phone, city, country, created_at) VALUES (2, 'Robin.Collins-Auer@hotmail.com', 'Casey', 'Braun', '(231) 909-0687 x34181', 'Enterprise', 'France', '2026-02-23T08:13:44.016Z');
INSERT INTO customer (id, email, first_name, last_name, phone, city, country, created_at) VALUES (3, 'Jesse.Klein47@yahoo.com', 'Bette', 'Lynch', '417-763-5378 x6341', 'Loveland', 'Pitcairn Islands', '2026-02-23T06:16:20.516Z');
INSERT INTO customer (id, email, first_name, last_name, phone, city, country, created_at) VALUES (4, 'Demario74@gmail.com', 'Susan', 'Morissette-Harvey', '905-361-1502 x810', 'North Bryce', 'Albania', '2026-02-23T09:38:06.397Z');
INSERT INTO customer (id, email, first_name, last_name, phone, city, country, created_at) VALUES (5, 'Darryl.Morar@yahoo.com', 'Elijah', 'Senger', '449.916.0293 x0083', 'New Ericka', 'Albania', '2026-02-23T08:14:53.679Z');
INSERT INTO customer (id, email, first_name, last_name, phone, city, country, created_at) VALUES (6, 'Guy.Crist@yahoo.com', 'Beverly', 'Schmitt', '1-241-398-9109 x586', 'Aliciatown', 'Svalbard & Jan Mayen Islands', '2026-02-23T03:38:49.841Z');
INSERT INTO customer (id, email, first_name, last_name, phone, city, country, created_at) VALUES (7, 'Esmeralda.Wyman@hotmail.com', 'Lola', 'Kessler-Zieme', '609-795-8019 x1661', 'Lake Dominicfurt', 'Jordan', '2026-02-23T04:19:12.201Z');
INSERT INTO customer (id, email, first_name, last_name, phone, city, country, created_at) VALUES (8, 'Judge57@gmail.com', 'Lana', 'Thompson', '(589) 276-6563 x6821', 'Port Bethanyville', 'Libyan Arab Jamahiriya', '2026-02-23T11:30:20.992Z');
INSERT INTO customer (id, email, first_name, last_name, phone, city, country, created_at) VALUES (9, 'Davion25@gmail.com', 'Jeremy', 'Reilly', '990-932-3594 x8879', 'Marisaview', 'Martinique', '2026-02-23T10:08:50.989Z');
INSERT INTO customer (id, email, first_name, last_name, phone, city, country, created_at) VALUES (10, 'Dolores_Mueller@gmail.com', 'Obie', 'Greenfelder', '(243) 661-0172', 'West Joaquin', 'Armenia', '2026-02-23T11:27:03.199Z');
