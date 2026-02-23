CREATE TABLE authors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255)
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
INSERT INTO authors (id, name, email) VALUES (1, 'Ollie Lind', 'Antoinette62@gmail.com');
INSERT INTO authors (id, name, email) VALUES (2, 'Jody Shanahan', 'Odell26@yahoo.com');
INSERT INTO authors (id, name, email) VALUES (3, 'Salma Cremin', 'Cory_Heathcote@gmail.com');

-- Table: books
INSERT INTO books (id, author_id, title, published) VALUES (1, 3, 'Corporate Applications Executive', '2024-09-16');
INSERT INTO books (id, author_id, title, published) VALUES (2, 3, 'Lead Tactics Supervisor', '2024-05-10');
INSERT INTO books (id, author_id, title, published) VALUES (3, 2, 'Legacy Division Director', '2026-02-16');
