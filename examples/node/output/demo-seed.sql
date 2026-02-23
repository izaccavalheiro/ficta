CREATE TABLE authors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255) NOT NULL
);

CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  author_id INT,
  title VARCHAR(255),
  published DATE
,
  CONSTRAINT fk_books_author_id FOREIGN KEY (author_id) REFERENCES authors(id)
);

-- Table: authors
INSERT INTO authors (id, name, email) VALUES (1, 'Roosevelt Kunze', 'Carole0@hotmail.com');
INSERT INTO authors (id, name, email) VALUES (2, 'Tracey Emmerich', 'Dianne_Bayer@hotmail.com');
INSERT INTO authors (id, name, email) VALUES (3, 'Melissa Krajcik', 'Coralie_Daugherty9@yahoo.com');
INSERT INTO authors (id, name, email) VALUES (4, 'Dr. Lily Metz', 'Franklin71@yahoo.com');

-- Table: books
INSERT INTO books (id, author_id, title, published) VALUES (1, 2, 'Senior Optimization Manager', '2024-10-05');
INSERT INTO books (id, author_id, title, published) VALUES (2, 2, 'National Usability Director', '2024-08-22');
INSERT INTO books (id, author_id, title, published) VALUES (3, 3, 'Chief Configuration Consultant', '2024-11-17');
INSERT INTO books (id, author_id, title, published) VALUES (4, 1, 'Product Directives Administrator', '2025-10-12');
