-- Schema: blog
-- Dialect: mysql
-- Generated: 2026-02-23T05:03:21.184Z

CREATE TABLE authors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255) NOT NULL
);

CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  author_id INT,
  title TEXT NOT NULL,
  body TEXT,
  published DATE
,
  CONSTRAINT fk_posts_author_id FOREIGN KEY (author_id) REFERENCES authors(id)
);

-- Table: authors
INSERT INTO authors (id, name, email) VALUES (1, 'Ervin Hagenes', 'Earline_Predovic65@gmail.com');
INSERT INTO authors (id, name, email) VALUES (2, 'Rolando Walker-Marvin', 'Bruce.Olson@yahoo.com');
INSERT INTO authors (id, name, email) VALUES (3, 'Santiago Carroll DVM', 'Shannon46@yahoo.com');

-- Table: posts
INSERT INTO posts (id, author_id, title, body, published) VALUES (1, 4390, 'Maxime desidero tenuis appositus textilis beatae.', 'Calculus deficio audio uredo. Dolorum substantia laborum. Subiungo tempora degenero venia virgo candidus undique subseco.', '2024-04-16');
INSERT INTO posts (id, author_id, title, body, published) VALUES (2, 45, 'Delibero aut sui absum crastinus.', 'Commodo aegre templum cupiditas coruscus. Conforto ager earum cognatus mollitia cado. Incidunt solio animus aedificium.', '2026-01-23');
INSERT INTO posts (id, author_id, title, body, published) VALUES (3, 9791, 'Adopto vorago deleniti.', 'Aegre defero color trans assumenda minus usus argumentum demum cervus. Decerno videlicet confugo alias dens thesis colo aeternus. Acsi cedo velum ulterius thesis decretum paulatim claustrum.', '2024-07-17');
