CREATE TABLE items (
      id    SERIAL PRIMARY KEY,
      label VARCHAR(100),
      rev   INT DEFAULT 3
    );