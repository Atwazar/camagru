const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    user: process.env.PGUSER || "myuser",
    host: process.env.PGHOST || "db",
    database: process.env.PGDATABASE || "mydatabase",
    password: process.env.PGPASSWORD || "mypassword",
    port: process.env.PGPORT || 5432,
});

module.exports = pool;

