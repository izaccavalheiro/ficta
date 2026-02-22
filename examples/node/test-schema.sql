CREATE TABLE users (
  id SERIAL,
  username VARCHAR(50),
  email VARCHAR(50),
  active BOOLEAN
);

INSERT INTO users (id, username, email, active) VALUES (1, 'of', 'under', TRUE);
INSERT INTO users (id, username, email, active) VALUES (2, 'vivid', 'per', FALSE);
INSERT INTO users (id, username, email, active) VALUES (3, 'whereas', 'numeracy', TRUE);
INSERT INTO users (id, username, email, active) VALUES (4, 'inwardly', 'mortally', FALSE);
INSERT INTO users (id, username, email, active) VALUES (5, 'yuck', 'rue', FALSE);