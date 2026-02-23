CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  registered DATE
);

-- Table: users
INSERT INTO users (id, username, email, registered) VALUES (1, 'Robin.Terry81', 'Nicolas_Metz61@gmail.com', '2026-02-23T00:07:21.343Z');
INSERT INTO users (id, username, email, registered) VALUES (2, 'Ellis85', 'Pearl23@gmail.com', '2026-02-22T22:57:08.088Z');
INSERT INTO users (id, username, email, registered) VALUES (3, 'Isabel24', 'Annabel.Wehner@gmail.com', '2026-02-22T22:44:46.975Z');
INSERT INTO users (id, username, email, registered) VALUES (4, 'Jessie_Zboncak', 'Antonia7@hotmail.com', '2026-02-22T18:47:22.782Z');
INSERT INTO users (id, username, email, registered) VALUES (5, 'Penny.Reichert67', 'Pete_Schneider@yahoo.com', '2026-02-22T11:39:54.444Z');
