-- Schema: blog
-- Dialect: generic
-- Generated: 2026-02-23T05:03:21.185Z

CREATE TABLE authors (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255) NOT NULL
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  author_id INTEGER,
  title TEXT NOT NULL,
  body TEXT,
  published DATE
,
  CONSTRAINT fk_posts_author_id FOREIGN KEY (author_id) REFERENCES authors(id)
);

-- Table: authors
INSERT INTO authors (id, name, email) VALUES (1, 'Toby Kuvalis', 'Chad35@gmail.com');
INSERT INTO authors (id, name, email) VALUES (2, 'Dr. Emma Abshire', 'Greg32@gmail.com');
INSERT INTO authors (id, name, email) VALUES (3, 'Norbert Wiegand', 'Toney78@gmail.com');

-- Table: posts
INSERT INTO posts (id, author_id, title, body, published) VALUES (1, 6172, 'Nesciunt cimentarius auditor textor curvo atavus sunt.', 'Molestiae umquam tabella peccatus tamen. Solum civis libero tego tabula tergeo tenetur. Volup amo tantillus alveus mollitia.', '2025-10-09');
INSERT INTO posts (id, author_id, title, body, published) VALUES (2, 6333, 'Tamisium vulnus vicinus verbera decerno vigor amplus autus conservo.', 'Solio cunae ex amet cito victus conservo voluptate. Defero celo certe circumvenio approbo. Voveo tutis auctus.', '2025-03-02');
INSERT INTO posts (id, author_id, title, body, published) VALUES (3, 9213, 'Ut quis caelestis delibero speculum ulterius.', 'Varius valetudo curriculum clarus suggero quos approbo aranea vilitas atque. Bellicus creber vorago comminor. Vilis decens attollo ipsum decet turba eius thalassinus.', '2026-01-01');
