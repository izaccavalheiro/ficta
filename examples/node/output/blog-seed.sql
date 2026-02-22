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
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (1, 'Ellen62@hotmail.com', 'Elmer', 'Schroeder', '2026-02-22T10:13:27.615Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (2, 'Lisa95@yahoo.com', 'Ricardo', 'Buckridge', '2026-02-22T05:25:01.449Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (3, 'Mildred_Hauck88@gmail.com', 'Katelynn', 'Leuschke', '2026-02-22T05:08:11.340Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (4, 'Santos68@gmail.com', 'Harriet', 'Schmeler', '2026-02-22T13:17:58.367Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (5, 'Melanie.Watsica@yahoo.com', 'Stacey', 'Schulist', '2026-02-21T23:23:15.258Z');

-- Table: posts
INSERT INTO posts (id, user_id, title, body, published) VALUES (1, 1, 'Internal Interactions Coordinator', 'Consectetur tabesco casso depulso atavus vesper bene vito.', '2024-08-22');
INSERT INTO posts (id, user_id, title, body, published) VALUES (2, 4, 'Principal Infrastructure Planner', 'Decens confero uberrime coma suppellex nobis incidunt demum ascisco sollers.', '2025-05-21');
INSERT INTO posts (id, user_id, title, body, published) VALUES (3, 5, 'Product Communications Planner', 'Tergeo aggero depraedor conculco venio caelestis distinctio voluntarius accusantium accendo.', '2024-11-27');
INSERT INTO posts (id, user_id, title, body, published) VALUES (4, 4, 'Global Configuration Strategist', 'Vulgaris delibero cilicium tabesco subiungo sublime cohaero condico veritas.', '2025-04-17');
INSERT INTO posts (id, user_id, title, body, published) VALUES (5, 4, 'National Brand Director', 'Alioqui occaecati tubineus toties uredo quos.', '2024-05-26');

-- Table: comments
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (1, 1, 2, 'Vestrum quibusdam venustas vere tenuis dens ademptio vestigium iure.', '2026-02-21T21:53:51.693Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (2, 4, 1, 'Aggredior cito toties.', '2026-02-22T12:36:58.746Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (3, 2, 4, 'Cariosus demens incidunt cognatus suppellex sumptus viduo.', '2026-02-21T22:20:59.800Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (4, 3, 2, 'Delibero arca magni cibus abeo vinco.', '2026-02-22T09:54:27.730Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (5, 3, 2, 'Capio amicitia curtus civitas quas eum qui exercitationem.', '2026-02-22T00:44:13.557Z');
