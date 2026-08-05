import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = process.env.DB_CONNECTION_STRING
  ? process.env.DB_CONNECTION_STRING
  : {
      server: process.env.DB_HOST ?? 'serviapp1.database.windows.net',
      port: Number(process.env.DB_PORT ?? 1433),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      options: { encrypt: true, trustServerCertificate: false },
    };

try {
  const pool = await sql.connect(config);
  const result = await pool.request().query(
    `SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_DEFAULT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME='reservas'
     ORDER BY ORDINAL_POSITION;`
  );
  console.log(JSON.stringify(result.recordset, null, 2));
  await pool.close();
} catch (error) {
  console.error(error);
  process.exit(1);
}
