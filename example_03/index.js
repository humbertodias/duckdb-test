const { promisify } = require("util");

const duckdb = require("duckdb");
const Redis = require("ioredis");

class DuckDbRepository {
  /**
   * Create a new instance of the DuckDbRepository.
   *
   * This constructor creates an in-memory DuckDB database and sets up
   * promisified versions of the `run` and `all` methods.
   */
  constructor() {
    this.db = new duckdb.Database(":memory:");
    this.runAsync = promisify(this.db.run.bind(this.db));
    this.allAsync = promisify(this.db.all.bind(this.db));
  }



  /**
   * Attach a PostgreSQL database to the DuckDB instance.
   *
   * This method first installs and loads the PostgreSQL extension, then attaches
   * the specified PostgreSQL database as "pg_db".
   *
   * @returns {Promise<void>} A promise that resolves when the database has been attached.
   */
  async attachPostgres() {
    await this.runAsync(`INSTALL postgres;`);
    await this.runAsync(`LOAD postgres;`);

    await this.runAsync(`
      ATTACH 'host=localhost port=5432 user=user password=pass dbname=leads_db' 
      AS pg_db (TYPE postgres);
    `);
  }
  /**
   * Attach a MySQL database to the DuckDB instance.
   *
   * This method first installs and loads the MySQL extension, then attaches
   * the specified MySQL database as "mysql_db".
   *
   * @returns {Promise<void>} A promise that resolves when the database has been attached.
   */

  /**
   * Attach a MySQL database to the DuckDB instance.
   *
   * This method first installs and loads the MySQL extension, then attaches
   * the specified MySQL database as "mysql_db".
   *
   * @returns {Promise<void>} A promise that resolves when the database has been attached.
   */
  async attachMySQL() {
    await this.runAsync(`INSTALL mysql;`);
    await this.runAsync(`LOAD mysql;`);

    await this.runAsync(`
      ATTACH 'host=localhost user=user password=pass port=3306 database=leads_db' 
      AS mysql_db (TYPE mysql);
    `);
  }

  /**
   * Create a DuckDB table named "leads_redis" from the contents of Redis.
   *
   * This method first checks if there are any keys in Redis matching the pattern
   * "lead:*". If there are no keys, it creates a table with the specified schema.
   *
   * If there are keys, it reads the values from Redis and parses them as JSON.
   * It then creates a DuckDB table with the specified schema and inserts the
   * parsed values into it.
   *
   * @returns {Promise<void>} A promise that resolves when the table has been created.
   */
  async loadRedisInMemory() {
    const redis = new Redis();

    try {
      const keys = await redis.keys("lead:*");
      if (!keys.length) {
        await this.runAsync(
          `CREATE TABLE leads_redis (external_lead_id VARCHAR, status VARCHAR);`
        );
        return;
      }

      const values = [];
      const pipeline = redis.pipeline();

      keys.forEach((key) => pipeline.get(key));
      const results = await pipeline.exec();

      for (const [err, val] of results) {
        if (err || !val) continue;
        try {
          const { external_lead_id, status } = JSON.parse(val);
          if (external_lead_id && status !== undefined) {
            values.push(`('${external_lead_id}', '${status}')`);
          }
        } catch {}
      }

      const sql = values.length
        ? `CREATE TABLE leads_redis AS SELECT * FROM (VALUES ${values.join(
            ","
          )}) AS t(external_lead_id, status);`
        : `CREATE TABLE leads_redis (external_lead_id VARCHAR, status VARCHAR);`;

      await this.runAsync(sql);
    } finally {
      redis.disconnect();
    }
  }

  /**
   * Join all three tables and return the result as a JSON array.
   *
   * The result will contain the columns "id", "name", "email", "phone", and
   * "status". The "id" column will be the MySQL ID, the "name" column will be
   * from MySQL, the "email" and "phone" columns will be from PostgreSQL, and
   * the "status" column will be from Redis.
   *
   * @returns {Promise<Array<{ id: number, name: string, email: string, phone: string, status: string }>>}
   * A promise that resolves with the joined result.
   */
  async joinAll() {
    const rows = await this.allAsync(`
      SELECT 
        m.id AS mysql_id, 
        m.name, 
        p.email, 
        p.phone, 
        r.status
      FROM mysql_db.leads m
      LEFT JOIN pg_db.lead_details p ON m.external_lead_id = p.external_lead_id
      LEFT JOIN leads_redis r ON m.external_lead_id = r.external_lead_id
    `);

    return rows.map((r) => ({
      id: Number(r.mysql_id),
      name: r.name,
      email: r.email,
      phone: r.phone,
      status: r.status,
    }));
  }
  
  /**
   * Prints the contents of all three tables to the console.
   *
   * The output will be labeled with the name of each table and will be
   * formatted as a table.
   *
   * @returns {Promise<void>} A promise that resolves when the output has been
   * printed.
   */
  async showAllTables() {
    const mysql = await this.allAsync(`SELECT * FROM mysql_db.leads`);
    const pg = await this.allAsync(`SELECT * FROM pg_db.lead_details`);
    const redis = await this.allAsync(`SELECT * FROM leads_redis`);

    console.log("=== MySQL Table ===");
    console.table(mysql);

    console.log("=== PostgreSQL Table ===");
    console.table(pg);

    console.log("=== Redis Table ===");
    console.table(redis);
  }
}

/**
 * The main entry point of the script.
 *
 * This function creates a new DuckDbRepository and then uses it to
 * attach the PostgreSQL and MySQL databases to the DuckDB instance,
 * load the Redis data into memory, and then join all three tables
 * together. The result is printed to the console as a table.
 *
 * Then, it calls `showAllTables` to print the contents of all three
 * tables to the console.
 *
 * @returns {Promise<void>} A promise that resolves when the tables have
 * been joined and printed.
 */
async function main() {
  const repo = new DuckDbRepository();

  await repo.attachPostgres();
  await repo.attachMySQL();
  await repo.loadRedisInMemory();

  const merged = await repo.joinAll();
  console.table(merged);
  
  await repo.showAllTables();
}

main();

