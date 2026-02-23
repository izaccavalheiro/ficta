CREATE TABLE product (
  id UUID,
  sku VARCHAR(255),
  name VARCHAR(255),
  price VARCHAR(255),
  stock INTEGER,
  available BOOLEAN,
  category VARCHAR(255),
  created_at TIMESTAMP
);

CREATE TABLE customer (
  id UUID,
  email VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(255),
  created_at TIMESTAMP
);

-- Table: product
INSERT INTO product (id, sku, name, price, stock, available, category, created_at) VALUES (1, 'without', 'Miss Kyle Wilderman', '441.64', 1982, FALSE, 'torn', '2026-02-23T05:55:57.468Z');
INSERT INTO product (id, sku, name, price, stock, available, category, created_at) VALUES (2, 'incidentally', 'Carlton Crist', '745.30', 8644, FALSE, 'though', '2026-02-23T13:31:45.334Z');
INSERT INTO product (id, sku, name, price, stock, available, category, created_at) VALUES (3, 'zowie', 'Bernard Senger', '180.89', 8796, TRUE, 'industrialize', '2026-02-23T09:26:19.864Z');
INSERT INTO product (id, sku, name, price, stock, available, category, created_at) VALUES (4, 'with', 'Houston Daugherty', '283.15', 5531, TRUE, 'mundane', '2026-02-23T02:20:23.544Z');
INSERT INTO product (id, sku, name, price, stock, available, category, created_at) VALUES (5, 'minority', 'Joyce Hoppe', '658.29', 5395, TRUE, 'since', '2026-02-22T23:33:43.937Z');
INSERT INTO product (id, sku, name, price, stock, available, category, created_at) VALUES (6, 'among', 'Kayla Franecki I', '922.25', 2363, FALSE, 'athwart', '2026-02-22T20:43:50.316Z');
INSERT INTO product (id, sku, name, price, stock, available, category, created_at) VALUES (7, 'monumental', 'Clementine Corwin-Reynolds', '186.95', 1510, FALSE, 'nectarine', '2026-02-22T22:45:46.728Z');
INSERT INTO product (id, sku, name, price, stock, available, category, created_at) VALUES (8, 'glisten', 'Miss Urban Howe', '74.85', 6471, TRUE, 'elegant', '2026-02-23T01:40:16.798Z');

-- Table: customer
INSERT INTO customer (id, email, first_name, last_name, phone, created_at) VALUES (1, 'Wm20@yahoo.com', 'Natalie', 'Torp', '(657) 653-3062 x4197', '2026-02-23T10:10:37.797Z');
INSERT INTO customer (id, email, first_name, last_name, phone, created_at) VALUES (2, 'Mustafa.Windler@gmail.com', 'Bernita', 'Harber', '(942) 589-7055 x8802', '2026-02-23T11:57:09.097Z');
INSERT INTO customer (id, email, first_name, last_name, phone, created_at) VALUES (3, 'Makenna24@yahoo.com', 'Johnny', 'Kreiger', '295.699.5509 x0623', '2026-02-23T12:56:57.568Z');
INSERT INTO customer (id, email, first_name, last_name, phone, created_at) VALUES (4, 'Tracey_Leuschke23@gmail.com', 'Jaunita', 'Walker', '442.245.9635 x89464', '2026-02-23T11:25:58.286Z');
INSERT INTO customer (id, email, first_name, last_name, phone, created_at) VALUES (5, 'Patricia54@gmail.com', 'Dan', 'Schuppe', '1-501-628-6571', '2026-02-22T18:44:01.707Z');
INSERT INTO customer (id, email, first_name, last_name, phone, created_at) VALUES (6, 'Lucille71@hotmail.com', 'Leland', 'Nicolas', '1-795-564-0838 x945', '2026-02-23T10:40:28.054Z');
INSERT INTO customer (id, email, first_name, last_name, phone, created_at) VALUES (7, 'Wilma.Baumbach95@gmail.com', 'Lupe', 'Luettgen', '273.250.8521', '2026-02-23T08:22:17.169Z');
INSERT INTO customer (id, email, first_name, last_name, phone, created_at) VALUES (8, 'Elaine_Johns@hotmail.com', 'Jamison', 'Hane', '1-938-639-0980 x47247', '2026-02-23T08:29:57.469Z');
