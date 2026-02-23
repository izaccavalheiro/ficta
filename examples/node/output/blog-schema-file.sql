CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  created_at TIMESTAMP
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  body VARCHAR(255),
  published DATE
,
  CONSTRAINT fk_posts_author_id FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  content VARCHAR(255),
  created_at TIMESTAMP
,
  CONSTRAINT fk_comments_post_id FOREIGN KEY (post_id) REFERENCES posts(id),
  CONSTRAINT fk_comments_author_id FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Table: users
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (1, 'Quinton.White72@gmail.com', 'Jeff', 'Cartwright', '2026-02-22T19:34:58.310Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (2, 'Levi.McCullough@yahoo.com', 'Rodger', 'Walter', '2026-02-22T19:03:11.960Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (3, 'Schuyler_Johns@hotmail.com', 'Dusty', 'Weimann', '2026-02-22T21:24:15.891Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (4, 'Kara81@gmail.com', 'Monique', 'Berge', '2026-02-23T03:06:20.710Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (5, 'Madeline38@gmail.com', 'Martha', 'Rice', '2026-02-22T07:59:31.782Z');

-- Table: posts
INSERT INTO posts (id, author_id, title, body, published) VALUES (1, 1, 'Product Implementation Analyst', 'phew', '2026-02-12');
INSERT INTO posts (id, author_id, title, body, published) VALUES (2, 4, 'Corporate Branding Assistant', 'inasmuch', '2024-07-22');
INSERT INTO posts (id, author_id, title, body, published) VALUES (3, 1, 'International Markets Manager', 'altruistic', '2025-05-11');
INSERT INTO posts (id, author_id, title, body, published) VALUES (4, 3, 'Customer Integration Designer', 'wherever', '2026-01-17');
INSERT INTO posts (id, author_id, title, body, published) VALUES (5, 2, 'Dynamic Operations Engineer', 'safely', '2025-01-29');
INSERT INTO posts (id, author_id, title, body, published) VALUES (6, 5, 'Corporate Identity Executive', 'ornate', '2025-07-27');
INSERT INTO posts (id, author_id, title, body, published) VALUES (7, 1, 'Lead Intranet Planner', 'legislature', '2025-09-22');
INSERT INTO posts (id, author_id, title, body, published) VALUES (8, 4, 'Lead Factors Designer', 'multicolored', '2024-05-17');
INSERT INTO posts (id, author_id, title, body, published) VALUES (9, 1, 'Product Metrics Associate', 'unknown', '2025-01-27');
INSERT INTO posts (id, author_id, title, body, published) VALUES (10, 5, 'Legacy Paradigm Developer', 'reapply', '2024-09-06');

-- Table: comments
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (1, 4, 1, 'Tremo vorago demonstro hic consectetur.', '2026-02-22T22:01:01.765Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (2, 1, 4, 'Quidem cruentus speculum suscipit advoco commodo trucido.', '2026-02-22T11:07:07.940Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (3, 1, 2, 'Creator defessus tenax ut corrigo iure acer concedo curriculum.', '2026-02-22T21:13:39.422Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (4, 8, 1, 'Censura adipisci synagoga angulus capio conturbo crudelis.', '2026-02-23T04:53:03.694Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (5, 6, 1, 'Esse vere acer stella.', '2026-02-23T02:57:53.238Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (6, 2, 1, 'Occaecati ver aureus talus barba.', '2026-02-22T13:26:08.409Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (7, 4, 3, 'Denuncio nostrum tui spargo vulgivagus.', '2026-02-22T21:35:17.369Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (8, 9, 1, 'Annus necessitatibus pauci conturbo repellendus triumphus thorax.', '2026-02-22T08:55:43.777Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (9, 1, 2, 'Commemoro nulla civis derelinquo careo decumbo admitto arbitro.', '2026-02-22T19:37:46.215Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (10, 4, 5, 'Terror illo utilis aeneus.', '2026-02-22T21:22:50.918Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (11, 4, 5, 'Corrupti vallum stipes usus eum arbor quam deripio.', '2026-02-23T03:13:29.892Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (12, 3, 4, 'Apud ambulo benigne.', '2026-02-22T21:06:40.592Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (13, 6, 4, 'Abstergo abeo curo eveniet dedecor allatus amitto alioqui.', '2026-02-22T16:43:29.607Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (14, 9, 1, 'Facilis cupiditas virtus demonstro.', '2026-02-22T17:52:06.718Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (15, 6, 2, 'Unde aspicio confero temeritas verbera casus pecto.', '2026-02-22T22:34:44.725Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (16, 4, 3, 'Magni damnatio sonitus vindico.', '2026-02-22T13:36:50.284Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (17, 2, 2, 'Deputo culpo sulum.', '2026-02-23T02:57:55.823Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (18, 8, 4, 'Dapifer voluntarius aut condico thymbra.', '2026-02-22T11:52:16.850Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (19, 10, 4, 'Vehemens tot corrigo vicinus assumenda uberrime.', '2026-02-22T14:31:10.523Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (20, 10, 5, 'Voro illum uxor totidem varius denique sono.', '2026-02-22T12:01:36.157Z');
