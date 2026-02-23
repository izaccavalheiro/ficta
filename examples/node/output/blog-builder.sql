-- Schema: blog
-- Dialect: postgres
-- Generated: 2026-02-23T05:02:42.838Z

CREATE TABLE authors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  author_id INTEGER,
  title TEXT,
  published_at TIMESTAMP
,
  CONSTRAINT fk_articles_author_id FOREIGN KEY (author_id) REFERENCES authors(id)
);

-- Table: authors
INSERT INTO authors (id, name, email) VALUES (1, 'Mr. Darrell Stehr', 'Guy_Kautzer@gmail.com');
INSERT INTO authors (id, name, email) VALUES (2, 'Amaya Hyatt', 'April_Volkman8@hotmail.com');
INSERT INTO authors (id, name, email) VALUES (3, 'Andre Kilback', 'Frances.Ryan@hotmail.com');
INSERT INTO authors (id, name, email) VALUES (4, 'Marcia Bernhard', 'Arlene75@gmail.com');
INSERT INTO authors (id, name, email) VALUES (5, 'Vella Kemmer DVM', 'Terry59@hotmail.com');

-- Table: articles
INSERT INTO articles (id, author_id, title, published_at) VALUES (1, 5370, 'Demitto quasi ascisco vinculum accommodo addo.', '2026-02-22T18:45:32.121Z');
INSERT INTO articles (id, author_id, title, published_at) VALUES (2, 9840, 'Officiis reiciendis quis distinctio terror titulus decretum colligo adnuo.', '2026-02-22T21:46:47.166Z');
INSERT INTO articles (id, author_id, title, published_at) VALUES (3, 2691, 'Triumphus autem aspicio demergo cupio cultura.', '2026-02-23T02:59:10.669Z');
INSERT INTO articles (id, author_id, title, published_at) VALUES (4, 6669, 'Eaque decumbo textilis trucido sunt videlicet aperio decet sollers abstergo.', '2026-02-22T16:51:36.915Z');
INSERT INTO articles (id, author_id, title, published_at) VALUES (5, 4733, 'Tabula tubineus reprehenderit admoneo vulgaris.', '2026-02-22T05:12:35.565Z');
