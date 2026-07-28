import type { Request } from "express";
import { database } from "./config/database.js";

export async function initAuditTables() {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_id INT NULL,
      user_role VARCHAR(50) NULL,
      action VARCHAR(100) NOT NULL,
      entity VARCHAR(100) NULL,
      entity_id VARCHAR(100) NULL,
      details TEXT NULL,
      ip VARCHAR(45) NULL,
      path VARCHAR(200) NULL,
      method VARCHAR(10) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS security_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      event VARCHAR(100) NOT NULL,
      level VARCHAR(20) NOT NULL,
      user_id INT NULL,
      user_role VARCHAR(50) NULL,
      ip VARCHAR(45) NULL,
      path VARCHAR(200) NULL,
      details TEXT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

export function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(",")[0].trim();
  }
  return req.socket.remoteAddress?.replace(/^::ffff:/, "") ?? null;
}

export async function logAudit(params: {
  action: string;
  entity?: string | null;
  entityId?: string | null;
  userId?: number | null;
  userRole?: string | null;
  details?: string | null;
  ip?: string | null;
  path?: string | null;
  method?: string | null;
}) {
  try {
    await database.execute(
      `
      INSERT INTO audit_log
      (user_id, user_role, action, entity, entity_id, details, ip, path, method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        params.userId ?? null,
        params.userRole ?? null,
        params.action,
        params.entity ?? null,
        params.entityId ?? null,
        params.details ?? null,
        params.ip ?? null,
        params.path ?? null,
        params.method ?? null,
      ],
    );
  } catch (error) {
    console.error("Audit log error:", error);
  }
}

export async function logSecurity(params: {
  event: string;
  level: string;
  userId?: number | null;
  userRole?: string | null;
  ip?: string | null;
  path?: string | null;
  method?: string | null;
  details?: string | null;
}) {
  try {
    await database.execute(
      `
      INSERT INTO security_log
      (event, level, user_id, user_role, ip, path, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        params.event,
        params.level,
        params.userId ?? null,
        params.userRole ?? null,
        params.ip ?? null,
        params.path ?? null,
        params.details ?? null,
      ],
    );
  } catch (error) {
    console.error("Security log error:", error);
  }
}
