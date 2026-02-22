CREATE TABLE users (
  id SERIAL,
  username VARCHAR(50),
  email VARCHAR(50),
  active BOOLEAN
);

INSERT INTO users (id, username, email, active) VALUES (1, 'spirit', 'offset', FALSE);
INSERT INTO users (id, username, email, active) VALUES (2, 'finally', 'until', TRUE);
INSERT INTO users (id, username, email, active) VALUES (3, 'plan', 'monster', FALSE);
INSERT INTO users (id, username, email, active) VALUES (4, 'gee', 'ring', TRUE);
INSERT INTO users (id, username, email, active) VALUES (5, 'for', 'stoop', TRUE);