const duckdb = require("duckdb");
const { promisify } = require("util");

class DuckDbRepository {
  constructor() {
    this.db = new duckdb.Database(":memory:");
    this.runAsync = promisify(this.db.run.bind(this.db));
    this.allAsync = promisify(this.db.all.bind(this.db));
  }

  async createTables() {
    try {
      await this.runAsync(`
        CREATE TABLE users_csv AS
        SELECT * FROM read_csv_auto('db01.csv');

        CREATE TABLE users_json AS
        SELECT * FROM read_json_auto('db01.json');
      `);
      console.log("Tabelas criadas com sucesso!");
    } catch (err) {
      console.error("Erro ao criar tabelas:", err);
    }
  }

  async joinUsers() {
    try {
      const rows = await this.allAsync(`
        SELECT c.id, c.name, j.age
        FROM users_csv c
        LEFT JOIN users_json j
        ON c.id = j.id
      `);

      return rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        age: r.age !== null ? Number(r.age) : null,
      }));
    } catch (err) {
      console.error("Erro ao executar JOIN:", err);
      return [];
    }
  }
}

async function main() {
  const repository = new DuckDbRepository();

  await repository.createTables();

  const users = await repository.joinUsers();
  console.log("Resultado do JOIN:");
  console.table(users);
}

main();
