-- Schema: blog
-- Dialect: sqlite
-- Generated: 2026-02-23T05:03:21.184Z

CREATE TABLE authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT NOT NULL
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER,
  title TEXT NOT NULL,
  body TEXT,
  published TEXT
,
  CONSTRAINT fk_posts_author_id FOREIGN KEY (author_id) REFERENCES authors(id)
);

-- Table: authors
INSERT INTO authors (id, name, email) VALUES (1, 'Mrs. Hope Abbott', 'Paulette13@yahoo.com');
INSERT INTO authors (id, name, email) VALUES (2, 'Darius Schultz', 'Wallace96@yahoo.com');
INSERT INTO authors (id, name, email) VALUES (3, 'Margarete Schulist', 'Ron83@yahoo.com');

-- Table: posts
INSERT INTO posts (id, author_id, title, body, published) VALUES (1, 2787, 'Acceptus corona vero vox beneficium tenetur arca copiose corporis.', 'Conscendo vinitor pauci vinco cado tener cervus. Delicate celer damno tubineus vulgo vacuus vere uberrime ullam. Causa summisse voluntarius valde corona vos approbo adipiscor neque vomito.', '2024-08-11');
INSERT INTO posts (id, author_id, title, body, published) VALUES (2, 3930, 'Voco facere tantum pecco confugo verumtamen vestigium bestia ventito subseco.', 'Vomica amoveo modi dolore rem consequatur terror. Adflicto ademptio cinis a desidero confero argumentum caput adipisci. Thema adversus vicissitudo viduo teres sequi vita tabgo.', '2024-07-13');
INSERT INTO posts (id, author_id, title, body, published) VALUES (3, 2053, 'Deduco error aduro deorsum delectus callide.', 'Triduana ara temporibus aeneus beatus tibi. Esse enim vitium currus creo appello nulla. Debilito adipisci aggero impedit id vobis.', '2025-04-05');
