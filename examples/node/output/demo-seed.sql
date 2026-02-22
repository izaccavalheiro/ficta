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
INSERT INTO authors (id, name, email) VALUES (1, 'Mr. Mario Balistreri', 'Hallie_Ebert15@gmail.com');
INSERT INTO authors (id, name, email) VALUES (2, 'Lynne Leannon', 'Wendy87@gmail.com');
INSERT INTO authors (id, name, email) VALUES (3, 'Maggie Block', 'Bethany_Rempel@hotmail.com');
INSERT INTO authors (id, name, email) VALUES (4, 'Sarah Lubowitz', 'Kolby.Ryan@gmail.com');

-- Table: books
INSERT INTO books (id, author_id, title, published) VALUES (1, 3, 'Investor Quality Consultant', '2026-02-13');
INSERT INTO books (id, author_id, title, published) VALUES (2, 4, 'Human Markets Developer', '2024-04-04');
INSERT INTO books (id, author_id, title, published) VALUES (3, 3, 'Dynamic Assurance Associate', '2024-08-14');
INSERT INTO books (id, author_id, title, published) VALUES (4, 1, 'Lead Communications Designer', '2025-12-05');
