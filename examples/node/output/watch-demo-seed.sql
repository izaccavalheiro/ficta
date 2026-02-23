CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  created_at TIMESTAMP
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT
,
  CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table: users
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (1, 'Casimir22@yahoo.com', 'Hattie', 'Schuppe', '2026-02-22T22:16:16.425Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (2, 'Santos_Corkery@hotmail.com', 'Norma', 'Macejkovic', '2026-02-23T01:07:07.534Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (3, 'Eleanor.Ullrich@gmail.com', 'Stuart', 'Schroeder', '2026-02-23T01:45:28.012Z');

-- Table: posts
INSERT INTO posts (id, user_id, title, body) VALUES (1, 3, 'Conitor vallum tolero adsuesco tabernus nobis.', 'Theatrum adulescens soleo.');
INSERT INTO posts (id, user_id, title, body) VALUES (2, 3, 'Bellicus allatus molestiae capillus comprehendo sapiente stillicidium quis.', 'Cimentarius explicabo appello vulgaris.');
INSERT INTO posts (id, user_id, title, body) VALUES (3, 3, 'Utique cupiditas decretum antepono nesciunt aliquid benigne triduana verbum est.', 'Summa averto conculco vos sperno adflicto.');
