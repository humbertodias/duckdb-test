# DuckDB Integration with MySQL, PostgreSQL, and Redis

This project demonstrates the integration of [DuckDB](https://duckdb.org/) with MySQL, PostgreSQL, and Redis to perform data operations across these databases. It uses a `docker-compose.yaml` configuration to set up the required database services and a Node.js script (`index.js`) to orchestrate the data integration and querying process.

## Overview

The project achieves the following:
1. **Database Setup**: Configures MySQL, PostgreSQL, and Redis services using Docker Compose.
2. **DuckDB Integration**: Utilizes DuckDB to attach MySQL and PostgreSQL databases and load Redis data into an in-memory table.
3. **Data Joining**: Joins data from MySQL, PostgreSQL, and Redis based on a common key (`external_lead_id`).
4. **Result Display**: Outputs the joined data and individual table contents in a tabular format.

## Prerequisites

- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.
- [Node.js](https://nodejs.org/) (version 14 or higher) for running the script.
- Required Node.js packages:
  - `duckdb`
  - `ioredis`
  Install them using:
  ```bash
  npm install duckdb ioredis
  ```

## Project Structure

- **docker-compose.yaml**: Defines the services for MySQL, PostgreSQL, and Redis, including environment variables, ports, and volume mappings for data persistence and initialization scripts.
- **index.js**: The main Node.js script that uses DuckDB to connect to the databases, load Redis data, join tables, and display results.
- **infra/**: Directory containing volume mappings for database data and initialization scripts:
  - `infra/db/mysql/`: MySQL data persistence.
  - `infra/mysql/mysql-init/`: MySQL initialization scripts.
  - `infra/db/postgres/`: PostgreSQL data persistence.
  - `infra/postgres/pg-init/`: PostgreSQL initialization scripts.
  - `infra/db/redis/`: Redis data persistence.
  - `infra/redis/init.sh`: Redis initialization script.

## Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/stdioh321/duckdb-test.git
   cd duckdb-test/example_03
   ```

2. **Start the Database Services**:
   Run the following command to start MySQL, PostgreSQL, and Redis containers:
   ```bash
   docker-compose up
   # Or
   docker compose up
   ```

3. **Install Node.js Dependencies**:
   Ensure you have the required Node.js packages installed:
   ```bash
   npm install duckdb ioredis
   ```

4. **Run the Script**:
   Execute the main script to perform the data integration and display the results:
   ```bash
   node index.js
   ```

## How It Works

### Docker Compose Configuration
The `docker-compose.yaml` file sets up three services:
- **MySQL**: Uses the `mysql:8.0` image, exposes port `3306`, and initializes a database `leads_db` with user credentials (`user:pass`).
- **PostgreSQL**: Uses the `postgres:15` image, exposes port `5432`, and initializes a database `leads_db` with user credentials (`user:pass`).
- **Redis**: Uses the `redis:7` image, exposes port `6379`, and runs an initialization script (`init.sh`).

Each service uses volumes to persist data and load initialization scripts.

### Node.js Script (`index.js`)
The script uses the `DuckDbRepository` class to:
1. **Initialize DuckDB**: Creates an in-memory DuckDB instance with promisified methods for running queries (`runAsync`) and fetching results (`allAsync`).
2. **Attach Databases**:
   - **MySQL**: Installs and loads the MySQL extension, then attaches the `leads_db` database as `mysql_db`.
   - **PostgreSQL**: Installs and loads the PostgreSQL extension, then attaches the `leads_db` database as `pg_db`.
3. **Load Redis Data**: Connects to Redis, retrieves keys matching `lead:*`, parses JSON values, and creates an in-memory table `leads_redis` with columns `external_lead_id` and `status`.
4. **Join Tables**: Performs a SQL query to join:
   - `mysql_db.leads` (columns: `id`, `name`, `external_lead_id`)
   - `pg_db.lead_details` (columns: `email`, `phone`, `external_lead_id`)
   - `leads_redis` (columns: `external_lead_id`, `status`)
   The join is based on `external_lead_id` and returns a JSON array with columns `id`, `name`, `email`, `phone`, and `status`.
5. **Display Results**: Outputs the joined data and individual table contents using `console.table`.

### Main Workflow
The `main` function orchestrates the process:
1. Creates a `DuckDbRepository` instance.
2. Attaches MySQL and PostgreSQL databases.
3. Loads Redis data into an in-memory table.
4. Joins the tables and prints the result.
5. Displays the contents of all three tables.

## Expected Output
Running `node index.js` will produce the following output, showing the joined data from the three data sources (MySQL, PostgreSQL, and Redis) and the contents of each individual table:

### Joined Data
The result of joining the three data sources based on `external_lead_id`:
```
┌─────────┬────┬───────────┬───────────────────────┬─────────────┬─────────────┐
│ (index) │ id │ name      │ email                 │ phone       │ status      │
├─────────┼────┼───────────┼───────────────────────┼─────────────┼─────────────┤
│ 0       │ 2  │ 'Bob'     │ 'bob@example.com'     │ '222222222' │ 'contacted' │
│ 1       │ 1  │ 'Alice'   │ 'alice@example.com'   │ '111111111' │ 'new'       │
│ 2       │ 3  │ 'Charlie' │ 'charlie@example.com' │ '333333333' │ 'converted' │
└─────────┴────┴───────────┴───────────────────────┴─────────────┴─────────────┘
```

### MySQL Table (`mysql_db.leads`)
```
=== MySQL Table ===
┌─────────┬────┬──────────────────┬───────────┐
│ (index) │ id │ external_lead_id │ name      │
├─────────┼────┼──────────────────┼───────────┤
│ 0       │ 1  │ 'lead_1'         │ 'Alice'   │
│ 1       │ 2  │ 'lead_2'         │ 'Bob'     │
│ 2       │ 3  │ 'lead_3'         │ 'Charlie' │
└─────────┴────┴──────────────────┴───────────┘
```

### PostgreSQL Table (`pg_db.lead_details`)
```
=== PostgreSQL Table ===
┌─────────┬────┬──────────────────┬───────────────────────┬─────────────┐
│ (index) │ id │ external_lead_id │ email                 │ phone       │
├─────────┼────┼──────────────────┼───────────────────────┼─────────────┤
│ 0       │ 1  │ 'lead_1'         │ 'alice@example.com'   │ '111111111' │
│ 1       │ 2  │ 'lead_2'         │ 'bob@example.com'     │ '222222222' │
│ 2       │ 3  │ 'lead_3'         │ 'charlie@example.com' │ '333333333' │
└─────────┴────┴──────────────────┴───────────────────────┴─────────────┘
```

### Redis Table (`leads_redis`)
```
=== Redis Table ===
┌─────────┬──────────────────┬─────────────┐
│ (index) │ external_lead_id │ status      │
├─────────┼──────────────────┼─────────────┤
│ 0       │ 'lead_2'         │ 'contacted' │
│ 1       │ 'lead_1'         │ 'new'       │
│ 2       │ 'lead_3'         │ 'converted' │
└─────────┴──────────────────┴─────────────┘
```

## Notes
- Ensure the initialization scripts in `infra/mysql/mysql-init/`, `infra/postgres/pg-init/`, and `infra/redis/init.sh` create tables and data compatible with the schema expected by `index.js` (e.g., matching `external_lead_id` values across tables).
- The script assumes the databases are running on `localhost` with the specified ports and credentials as defined in `docker-compose.yaml`.
- DuckDB's in-memory database is used for performance, but it requires sufficient memory to handle the data size.

## Troubleshooting
- **Database Connection Errors**: Verify that Docker containers are running (`docker ps`) and ports `3306`, `5432`, and `6379` are not in use by other processes.
- **Missing Data**: Check the initialization scripts to ensure tables and data are properly set up.
- **Node.js Errors**: Ensure all dependencies are installed and compatible with your Node.js version.