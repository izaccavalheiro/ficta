
    CREATE TABLE users (
      id         SERIAL PRIMARY KEY,
      email      VARCHAR(255) NOT NULL,
      first_name VARCHAR(50),
      last_name  VARCHAR(50),
      created_at TIMESTAMP
    );
    CREATE TABLE posts (
      id         SERIAL PRIMARY KEY,
      user_id    INT NOT NULL REFERENCES users(id),
      title      VARCHAR(255) NOT NULL,
      body       TEXT,
      published  DATE
    );
    CREATE TABLE comments (
      id         SERIAL PRIMARY KEY,
      post_id    INT NOT NULL REFERENCES posts(id),
      author_id  INT NOT NULL REFERENCES users(id),
      content    TEXT,
      created_at TIMESTAMP
    );
  