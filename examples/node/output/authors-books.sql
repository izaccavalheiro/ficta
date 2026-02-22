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
INSERT INTO authors (id, name, email) VALUES (1, 'Ms. Mae Crona', 'Darrick60@hotmail.com');
INSERT INTO authors (id, name, email) VALUES (2, 'Rebecca Lynch', 'Whitney.Hoppe77@gmail.com');
INSERT INTO authors (id, name, email) VALUES (3, 'Dr. Roberto Legros', 'Earline93@gmail.com');

-- Table: books
INSERT INTO books (id, author_id, title, published) VALUES (1, 3, 'Chief Solutions Agent', '2024-07-31');
INSERT INTO books (id, author_id, title, published) VALUES (2, 1, 'Legacy Data Supervisor', '2025-11-11');
INSERT INTO books (id, author_id, title, published) VALUES (3, 3, 'Chief Directives Coordinator', '2024-05-01');
