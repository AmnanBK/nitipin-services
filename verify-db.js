const mysql = require('mysql2/promise');
require('dotenv').config({ path: './auth/.env' });

async function verifyConnection() {
  console.log('🔄 Mencoba terkoneksi ke Cloud SQL...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }
    });

    console.log('✅ Koneksi ke Database BERHASIL!');
    
    const [rows] = await connection.execute('SHOW TABLES');
    console.log('📋 Daftar Tabel di Database:');
    rows.forEach(row => console.log(`  - ${Object.values(row)[0]}`));

    await connection.end();
  } catch (error) {
    console.error('❌ KONEKSI GAGAL!');
    console.error('Pesan Error:', error.message);
    console.error('Pastikan isi file .env sudah benar!');
  }
}

verifyConnection();
