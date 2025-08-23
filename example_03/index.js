const duckdb = require("duckdb");
const { promisify } = require("util");
const Redis = require("ioredis");

class DuckDbRepository {
  constructor() {
    this.db = new duckdb.Database(":memory:");
    this.runAsync = promisify(this.db.run.bind(this.db));
    this.allAsync = promisify(this.db.all.bind(this.db));
  }

  async attachPostgres() {
    await this.runAsync(`INSTALL postgres;`);
    await this.runAsync(`LOAD postgres;`);

    await this.runAsync(`
      ATTACH 'host=localhost port=5432 user=user password=pass dbname=leads_db' 
      AS pg_db (TYPE postgres);
    `);
  }

  async attachMySQL() {
    await this.runAsync(`INSTALL mysql;`);
    await this.runAsync(`LOAD mysql;`);

    await this.runAsync(`
      ATTACH 'host=localhost user=user password=pass port=3306 database=leads_db' 
      AS mysql_db (TYPE mysql);
    `);
  }

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
}

(async () => {
  const repo = new DuckDbRepository();

  await repo.attachPostgres();
  await repo.attachMySQL();
  await repo.loadRedisInMemory();

  const merged = await repo.joinAll();
  console.table(merged);
})();
