-- Schema: blog
-- Dialect: postgres
-- Generated: 2026-02-23T05:03:21.183Z

CREATE TABLE authors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255) NOT NULL
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER,
  title TEXT NOT NULL,
  body TEXT,
  published DATE
,
  CONSTRAINT fk_posts_author_id FOREIGN KEY (author_id) REFERENCES authors(id)
);

-- Table: authors
INSERT INTO authors (id, name, email) VALUES (1, 'Harry Hodkiewicz', 'Jeff.Zboncak@hotmail.com');
INSERT INTO authors (id, name, email) VALUES (2, 'Sabrina Schmeler', 'Erika_Gerhold@gmail.com');
INSERT INTO authors (id, name, email) VALUES (3, 'Ashtyn Kreiger', 'Danial38@hotmail.com');

-- Table: posts
INSERT INTO posts (id, author_id, title, body, published) VALUES (1, 8604, 'Tenus calcar contigo texo spes virtus teneo cinis tego cursus.', 'Avarus averto unus candidus amitto. Aequitas delectus quibusdam sublime caelum spero admoneo. Cultellus vere aspicio.', '2024-12-15');
INSERT INTO posts (id, author_id, title, body, published) VALUES (2, 3286, 'Coadunatio vobis vel.', 'Laborum umquam venio villa. Convoco surculus demo texo beatae amaritudo approbo demo illum. Caelestis cunctatio alter cilicium condico error.', '2025-01-27');
INSERT INTO posts (id, author_id, title, body, published) VALUES (3, 9460, 'Claro repellendus laboriosam cruciamentum tabgo.', 'Thesis antepono curso. Bestia color capitulus. Carbo temperantia cura quos sum.', '2025-08-22');
