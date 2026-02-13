// config/db.js
// MySQL database connection using mysql2 with promise support

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'brightpathhorizon',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL Database connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
    console.error('Make sure MySQL is running and your .env credentials are correct');
  });

module.exports = pool;
