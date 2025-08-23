CREATE TABLE lead_details (
  id SERIAL PRIMARY KEY,
  external_lead_id VARCHAR(50),
  email VARCHAR(100),
  phone VARCHAR(20)
);

INSERT INTO lead_details (external_lead_id, email, phone) VALUES
('lead_1', 'alice@example.com', '111111111'),
('lead_2', 'bob@example.com', '222222222'),
('lead_3', 'charlie@example.com', '333333333');
