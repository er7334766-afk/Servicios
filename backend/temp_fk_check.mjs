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
  console.log('CONSTRAINTS:');
  const constraints = await pool.request().query(
    `SELECT tc.CONSTRAINT_NAME, tc.CONSTRAINT_TYPE, kcu.COLUMN_NAME, rc.UNIQUE_CONSTRAINT_NAME, rc.UPDATE_RULE, rc.DELETE_RULE
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
     LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
       ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
     LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
       ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
     WHERE tc.TABLE_NAME='reservas';`
  );
  console.log(JSON.stringify(constraints.recordset, null, 2));
  const fk = await pool.request().query(
    `SELECT fk.NAME AS FK_Name, OBJECT_NAME(fk.parent_object_id) AS ParentTable, c1.name AS ParentColumn,
            OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable, c2.name AS ReferencedColumn
     FROM sys.foreign_keys fk
     INNER JOIN sys.foreign_key_columns fkc
       ON fk.object_id = fkc.constraint_object_id
     INNER JOIN sys.columns c1
       ON fkc.parent_object_id = c1.object_id AND fkc.parent_column_id = c1.column_id
     INNER JOIN sys.columns c2
       ON fkc.referenced_object_id = c2.object_id AND fkc.referenced_column_id = c2.column_id
     WHERE OBJECT_NAME(fk.parent_object_id) = 'reservas';`
  );
  console.log('FKs:');
  console.log(JSON.stringify(fk.recordset, null, 2));
  await pool.close();
} catch (error) {
  console.error(error);
  process.exit(1);
}
