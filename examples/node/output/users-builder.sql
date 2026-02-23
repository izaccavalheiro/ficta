CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  job_title VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);

INSERT INTO users (id, username, email, full_name, job_title, is_active, created_at) VALUES (1, 'Janis8', 'Afton.Abernathy31@hotmail.com', 'Kacie Cummerata', 'International Quality Analyst', TRUE, '2026-02-23T00:57:13.666Z');
INSERT INTO users (id, username, email, full_name, job_title, is_active, created_at) VALUES (2, 'Jarvis.Spencer51', 'Norma9@gmail.com', 'Katrina Schroeder', 'Lead Mobility Administrator', TRUE, '2026-02-23T00:14:55.976Z');
INSERT INTO users (id, username, email, full_name, job_title, is_active, created_at) VALUES (3, 'Larry35', 'Brayan_Vandervort63@hotmail.com', 'Dangelo Bayer', 'Principal Integration Facilitator', TRUE, '2026-02-23T02:02:43.573Z');
INSERT INTO users (id, username, email, full_name, job_title, is_active, created_at) VALUES (4, 'Hilton_Mueller47', 'Junius_Hettinger51@yahoo.com', 'Theresia Johnson', 'Internal Tactics Producer', FALSE, '2026-02-22T11:10:31.553Z');
INSERT INTO users (id, username, email, full_name, job_title, is_active, created_at) VALUES (5, 'Irma65', 'Aubrey_Cummerata@hotmail.com', 'Hallie O''Connell', 'International Integration Coordinator', TRUE, '2026-02-22T20:26:49.537Z');
INSERT INTO users (id, username, email, full_name, job_title, is_active, created_at) VALUES (6, 'Thea.Hermann', 'Lydia_Treutel@yahoo.com', 'Miss Emmie Sauer', 'Senior Accountability Assistant', FALSE, '2026-02-22T09:57:13.746Z');
INSERT INTO users (id, username, email, full_name, job_title, is_active, created_at) VALUES (7, 'Elmer80', 'Yvette7@gmail.com', 'Daryl Wolf', 'Dynamic Brand Coordinator', FALSE, '2026-02-22T13:01:19.448Z');
INSERT INTO users (id, username, email, full_name, job_title, is_active, created_at) VALUES (8, 'Patsy_Ward72', 'Velda_Vandervort58@gmail.com', 'Seth Goyette', 'Global Assurance Agent', TRUE, '2026-02-23T02:31:48.527Z');
INSERT INTO users (id, username, email, full_name, job_title, is_active, created_at) VALUES (9, 'Vanessa_Doyle', 'Austin_Pagac@yahoo.com', 'Mr. Brad Anderson', 'Future Factors Facilitator', FALSE, '2026-02-22T05:14:43.648Z');
INSERT INTO users (id, username, email, full_name, job_title, is_active, created_at) VALUES (10, 'Emile_Hintz45', 'Florian87@hotmail.com', 'Dr. Melissa Bergnaum', 'Investor Group Supervisor', TRUE, '2026-02-22T07:27:40.565Z');