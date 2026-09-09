const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || process.env.MYSQL_USER || 'zmt_app',
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'zmt_app_12345',
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || 'zmt_attendance',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
});

const waitForDatabase = async (attempts = 20) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
};

const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

const execute = async (sql, params) => {
  const [result] = await pool.execute(sql, params);
  return result;
};

const withTransaction = async (work) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  execute,
  pool,
  query,
  waitForDatabase,
  withTransaction,
};