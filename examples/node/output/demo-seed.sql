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
INSERT INTO authors (id, name, email) VALUES (1, 'America Keebler', 'Lee_Dietrich@gmail.com');
INSERT INTO authors (id, name, email) VALUES (2, 'Norman Gerhold', 'Stephen83@hotmail.com');
INSERT INTO authors (id, name, email) VALUES (3, 'Daisy Hermiston', 'Christine.Oberbrunner@yahoo.com');
INSERT INTO authors (id, name, email) VALUES (4, 'Jane Rogahn', 'Francisco.Spinka70@gmail.com');

-- Table: books
INSERT INTO books (id, author_id, title, published) VALUES (1, 1, 'Conforto vulticulus dedico aestivus unus conspergo celebrer sum.', '2024-04-19');
INSERT INTO books (id, author_id, title, published) VALUES (2, 2, 'Viridis credo alveus aegrus tempus cauda turbo textor pectus.', '2024-09-10');
INSERT INTO books (id, author_id, title, published) VALUES (3, 3, 'Cras vere sunt doloremque consectetur.', '2025-04-02');
INSERT INTO books (id, author_id, title, published) VALUES (4, 2, 'Porro venio dedecor distinctio adamo turba tametsi tristis uxor corrumpo.', '2025-04-14');
