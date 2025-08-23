const duckdb = require("duckdb");

const db = new duckdb.Database(":memory:");

db.run(`
  -- Criar tabelas temporárias a partir de arquivos CSV e JSON
  CREATE TABLE users_csv AS
  SELECT * FROM read_csv_auto('db01.csv');

  CREATE TABLE users_json AS
  SELECT * FROM read_json_auto('db01.json');
`, function(err) {
  if (err) return console.error("Erro ao criar tabelas:", err);

  console.log("Tabelas criadas com sucesso!");

  // Fazer JOIN
  db.all(`
    SELECT c.id, c.name, j.age
    FROM users_csv c
    LEFT JOIN users_json j
    ON c.id = j.id
  `, function(err, rows) {
    if (err) return console.error("Erro no JOIN:", err);

    console.log("Resultado do JOIN:");
    console.table(rows);
  });
});
