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
  body TEXT,
  published DATE
,
  CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL,
  author_id INT NOT NULL,
  content TEXT,
  created_at TIMESTAMP
,
  CONSTRAINT fk_comments_post_id FOREIGN KEY (post_id) REFERENCES posts(id),
  CONSTRAINT fk_comments_author_id FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Table: users
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (1, 'Allan_Metz62@yahoo.com', 'Cathy', 'Casper', '2026-02-23T01:36:50.243Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (2, 'Mercedes29@yahoo.com', 'Joana', 'Blanda', '2026-02-23T03:27:20.297Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (3, 'Margie.Kautzer@hotmail.com', 'Jonathon', 'Leffler', '2026-02-22T22:30:27.601Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (4, 'Laurine.Bayer23@yahoo.com', 'Katarina', 'Kemmer', '2026-02-22T09:59:52.646Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (5, 'Brooke85@yahoo.com', 'Maryam', 'Boehm', '2026-02-22T14:22:35.767Z');

-- Table: posts
INSERT INTO posts (id, user_id, title, body, published) VALUES (1, 2, 'Chief Applications Supervisor', 'Adaugeo supellex denique aestus spero temperantia utilis decor cubo.', '2025-01-04');
INSERT INTO posts (id, user_id, title, body, published) VALUES (2, 4, 'Customer Accountability Representative', 'Tripudio adversus defessus ducimus cibus cerno doloribus vero vita.', '2024-07-16');
INSERT INTO posts (id, user_id, title, body, published) VALUES (3, 4, 'Investor Response Specialist', 'Audeo debitis adfero charisma adhuc tantum voluptatibus.', '2025-03-28');
INSERT INTO posts (id, user_id, title, body, published) VALUES (4, 4, 'Senior Data Strategist', 'Corrumpo supra patrocinor architecto verto theca.', '2025-09-11');
INSERT INTO posts (id, user_id, title, body, published) VALUES (5, 4, 'Future Integration Executive', 'Utor atavus sustineo.', '2025-02-22');

-- Table: comments
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (1, 1, 3, 'Demergo talus voluntarius triumphus vestrum.', '2026-02-22T09:04:24.724Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (2, 4, 1, 'Urbanus subnecto absconditus cunae.', '2026-02-23T04:35:47.795Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (3, 2, 1, 'Vilis adsuesco damnatio cimentarius adamo aurum clam repellat adstringo officia.', '2026-02-22T08:52:35.496Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (4, 3, 2, 'Vilitas avaritia vaco cito depraedor adeo.', '2026-02-22T18:23:20.040Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (5, 1, 4, 'Vestigium aureus crux ducimus vito decretum sollers patruus.', '2026-02-22T22:55:25.169Z');
