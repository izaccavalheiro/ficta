-- Table: users
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (1, 'Rochelle_Predovic@hotmail.com', 'Brandy', 'Pollich', '2026-02-22T18:53:40.284Z');
INSERT INTO users (id, email, first_name, last_name, created_at) VALUES (2, 'Owen43@gmail.com', 'Hazel', 'Bashirian', '2026-02-22T07:47:06.383Z');

-- Table: posts
INSERT INTO posts (id, author_id, title, body, published) VALUES (1, 2, 'Central Creative Administrator', 'sheepishly', '2024-06-20');
INSERT INTO posts (id, author_id, title, body, published) VALUES (2, 2, 'Direct Tactics Specialist', 'waterlogged', '2024-08-29');

-- Table: comments
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (1, 1, 2, 'Auctor compello aqua conqueror antepono.', '2026-02-22T15:08:31.247Z');
INSERT INTO comments (id, post_id, author_id, content, created_at) VALUES (2, 1, 1, 'Quo creta tracto venia thymum sol confugo.', '2026-02-22T06:30:47.163Z');
