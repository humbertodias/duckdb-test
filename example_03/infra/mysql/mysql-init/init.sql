CREATE TABLE leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  external_lead_id VARCHAR(50),
  name VARCHAR(100)
);

INSERT INTO leads (external_lead_id, name) VALUES
('lead_1', 'Alice'),
('lead_2', 'Bob'),
('lead_3', 'Charlie');
