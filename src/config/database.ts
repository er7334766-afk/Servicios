import sql from "mssql";
import "dotenv/config";

const connectionString = process.env.DB_CONNECTION_STRING;

const poolConfig = connectionString
  ? connectionString
  : {
      server: process.env.DB_HOST ?? "serviapp1.database.windows.net",
      port: Number(process.env.DB_PORT ?? 1433),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    };

const pool = new sql.ConnectionPool(poolConfig as any);
const poolConnect = pool.connect();

function normalizeQuery(query: string) {
  let normalized = query.trim();

  if (/\bSHOW TABLES\b/i.test(normalized)) {
    normalized = "SELECT TABLE_NAME AS TableName FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'";
  }

  normalized = normalized.replace(/\bNOW\(\)/gi, "GETDATE()");
  normalized = normalized.replace(/\bLOWER\(\s*TRIM\(([^)]+)\)\s*\)/gi, "LOWER(LTRIM(RTRIM($1)))");
  normalized = normalized.replace(/\bTRIM\(([^)]+)\)/gi, "LTRIM(RTRIM($1))");

  if (/\bFOR UPDATE\b/i.test(normalized)) {
    normalized = normalized.replace(/\bFOR UPDATE\b/i, "");
    normalized = normalized.replace(/FROM\s+([\w\[\]"\.]+)(\s*)([\w\[\]"\.]+)?/i, (match, tableName, spacing, alias) => {
      if (/\bWITH\s*\(/i.test(match)) {
        return match;
      }

      if (alias && !/\bWHERE\b/i.test(alias) && !/\bJOIN\b/i.test(alias) && !/\bON\b/i.test(alias)) {
        return `FROM ${tableName} WITH (UPDLOCK, ROWLOCK) ${alias}`;
      }

      return `FROM ${tableName} WITH (UPDLOCK, ROWLOCK) `;
    });
  }

  const limitOneMatch = /\bLIMIT\s+1\s*;?$/i.test(normalized);
  normalized = normalized.replace(/\bLIMIT\s+1\s*;?$/i, "");

  if (limitOneMatch) {
    normalized = normalized.replace(/^(\s*SELECT\s+)(DISTINCT\s+)?/i, (match, select, distinct = "") => {
      return `${select}${distinct}TOP 1 `;
    });
  }

  let index = 0;
  normalized = normalized.replace(/\?/g, () => `@p${index++}`);

  return normalized;
}

function bindParameters(request: sql.Request, params: any[]) {
  params.forEach((value, idx) => {
    const name = `p${idx}`;

    if (value === null || value === undefined) {
      request.input(name, sql.NVarChar, null);
    } else {
      request.input(name, value);
    }
  });

  return request;
}

function createResult(result: sql.IResult<any>) {
  const insertId = result.recordset?.[0]?.insertId ?? null;

  return {
    ...result,
    affectedRows: result.rowsAffected?.[0] ?? 0,
    insertId,
  };
}

async function createRequest(params: any[]) {
  await poolConnect;
  const request = pool.request();
  return bindParameters(request, params);
}

export const database = {
  async query(queryText: string, params: any[] = []) {
    const request = await createRequest(params);
    const result = await request.query(normalizeQuery(queryText));
    return [result.recordset, result];
  },

  async execute(queryText: string, params: any[] = []) {
    const request = await createRequest(params);
    const result = await request.query(normalizeQuery(queryText));
    return [createResult(result)];
  },

  async getConnection() {
    await poolConnect;
    const transaction = new sql.Transaction(pool);
    let transactionStarted = false;

    return {
      async beginTransaction() {
        await transaction.begin();
        transactionStarted = true;
      },

      async execute(queryText: string, params: any[] = []) {
        const request = bindParameters(transaction.request(), params);
        const result = await request.query(normalizeQuery(queryText));
        return [createResult(result)];
      },

      async query(queryText: string, params: any[] = []) {
        const request = bindParameters(transaction.request(), params);
        const result = await request.query(normalizeQuery(queryText));
        return [result.recordset, result];
      },

      async commit() {
        await transaction.commit();
        transactionStarted = false;
      },

      async rollback() {
        await transaction.rollback();
        transactionStarted = false;
      },

      release() {
        if (transactionStarted) {
          transaction.rollback().catch(() => {});
        }
      },
    };
  },
};