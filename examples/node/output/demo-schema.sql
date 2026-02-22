
    CREATE TABLE authors (
      id    SERIAL PRIMARY KEY,
      name  VARCHAR(100),
      email VARCHAR(255) NOT NULL
    );
    CREATE TABLE books (
      id        SERIAL PRIMARY KEY,
      author_id INT REFERENCES authors(id),
      title     VARCHAR(255),
      published DATE
    );
  