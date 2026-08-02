import express from "express";
import cors from "cors";
import "dotenv/config";
import bcrypt from "bcryptjs";
import { BlobServiceClient } from "@azure/storage-blob";
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';

import { database } from "./config/database.js";
import fs from 'fs';
import path from 'path';

const app = express();
const port = Number(process.env.PORT ?? 3000);

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
//console.log("Cadena existe:", !!AZURE_STORAGE_CONNECTION_STRING);

/*console.log(
    "Primeros 80 caracteres:",
    AZURE_STORAGE_CONNECTION_STRING?.substring(0,80)
);*/

/*console.log(
    "Using Placeholder:",
    String(AZURE_STORAGE_CONNECTION_STRING ?? "")
        .includes("your_account")
);*/
if (!AZURE_STORAGE_CONNECTION_STRING) {
  console.warn("AZURE_STORAGE_CONNECTION_STRING no definida. Subidas a Azure fallarán si no se configura.");
}
const AZURE_BLOB_CONTAINER = process.env.AZURE_BLOB_CONTAINER ?? "fotosclientesyempleados";
const AZURE_ANTECEDENTES_CONTAINER = process.env.AZURE_ANTECEDENTES_CONTAINER ?? "antecedentes";
const AZURE_EVIDENCIAS_CONTAINER = process.env.AZURE_EVIDENCIAS_CONTAINER ?? "evidencias";

const AZURE_CHAT_CONTAINER = process.env.AZURE_BLOB_CONTAINER ?? 'fotosclientesyempleados';

const blobServiceClient: BlobServiceClient | null = AZURE_STORAGE_CONNECTION_STRING
  ? BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)
  : null;
const SALT_ROUNDS = 10;

// --- Security/session configuration ---
const SESSION_INACTIVITY_MS = 10 * 60 * 1000; // 10 minutos
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos
const MAX_LOGIN_ATTEMPTS = 3;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'sid';
const COOKIE_SECURE = (process.env.NODE_ENV === 'production');
const COOKIE_SAME_SITE: 'lax' | 'strict' | 'none' = 'lax';

type SessionData = {
  id: string;
  user: any;
  createdAt: number;
  lastActivity: number;
};

const sessions = new Map<string, SessionData>();
const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

function ensureLogsDir() {
  const dir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function logSecurity(event: string, details: Record<string, any> = {}) {
  try {
    ensureLogsDir();
    const ts = new Date().toISOString();
    const entry = { ts, event, details };
    const destino = path.join(process.cwd(), 'logs', 'security.log');
    fs.appendFileSync(destino, JSON.stringify(entry) + "\n");
  } catch (e) {
    console.error('No se pudo escribir security log:', e);
  }
}

async function subirArchivoAzure(base64: string, fileName: string, contentType: string, containerName: string) {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
  if (!allowedTypes.includes(contentType.toLowerCase())) {
    throw new Error("Tipo de archivo no permitido");
  }

  const extension = fileName.split(".").pop()?.toLowerCase();
  const allowedExtensions = ["jpg", "jpeg", "png", "pdf"];
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error("Extensión de archivo no permitida");
  }

  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blobName = `${Date.now()}-${cleanName}`;
  const buffer = Buffer.from(base64, "base64");
  // If Azure is not configured or still using placeholder, fall back to local storage
  const usingPlaceholder = String(AZURE_STORAGE_CONNECTION_STRING ?? '').includes('your_account');

  if (!blobServiceClient || usingPlaceholder) {
    // Ensure uploads directory exists
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const containerDir = path.join(uploadsRoot, containerName);
    if (!fs.existsSync(containerDir)) {
      fs.mkdirSync(containerDir, { recursive: true });
    }

    const filePath = path.join(containerDir, blobName);
    fs.writeFileSync(filePath, buffer);

    // Return a URL path that will be served statically
    return `/uploads/${containerName}/${blobName}`;
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType,
    },
  });

  return blockBlobClient.url;
}



app.use(cors());
app.use(cookieParser());
// Aumentar límite para permitir subir imágenes/documentos en base64 grandes
app.use(express.json({ limit: "50mb" }));

// Middleware para refrescar sesión por actividad
app.use((req, res, next) => {
  try {
    const sid = req.cookies?.[COOKIE_NAME];
    if (sid && sessions.has(sid)) {
      const sess = sessions.get(sid)!;
      const now = Date.now();
      // Si inactividad excede, caducar sesión
      if (now - sess.lastActivity > SESSION_INACTIVITY_MS) {
        sessions.delete(sid);
        res.clearCookie(COOKIE_NAME);
        logSecurity('session_expired', { sid, userId: sess.user?.id });
      } else {
        // refrescar
        sess.lastActivity = now;
        sessions.set(sid, sess);
        // volver a enviar cookie para renovar su maxAge
        res.cookie(COOKIE_NAME, sid, {
          httpOnly: true,
          secure: COOKIE_SECURE,
          sameSite: COOKIE_SAME_SITE,
          maxAge: SESSION_INACTIVITY_MS,
        });
      }
    }
  } catch (e) {
    // no bloquear por errores de sesión
    console.error('Session middleware error', e);
  }

  next();
});

// Servir archivos subidos localmente para desarrollo cuando se usa el fallback
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Servir archivos públicos (términos, privacidad, manuales)
const publicPath = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
}
app.use('/public', express.static(publicPath));

app.get("/", (_req, res) => {
  res.json({
    mensaje: "Backend funcionando",
  });
});

app.get("/api/test", async (_req, res) => {
  try {
    const [rows] = await database.query("SHOW TABLES");

    res.json({
      conectado: true,
      tablas: rows,
    });
  } catch (error) {
    console.error("Error al conectar con MySQL:", error);

    res.status(500).json({
      conectado: false,
      mensaje: "Error al conectar con la base de datos",
    });
  }
});

app.post("/api/upload-foto", async (req, res) => {
  try {
    const { base64, fileName, contentType } = req.body as {
      base64?: string;
      fileName?: string;
      contentType?: string;
    };

    if (!base64 || !fileName || !contentType) {
      return res.status(400).json({ mensaje: "Faltan datos de la imagen" });
    }

    const url = await subirArchivoAzure(base64, fileName, contentType, AZURE_BLOB_CONTAINER);
    return res.status(200).json({ url, mensaje: "Foto subida correctamente" });
  } catch (error) {
    console.error("Error al subir foto a Azure Blob:", error);
    return res.status(500).json({ mensaje: "No se pudo subir la foto" });
  }
});

app.post("/api/upload-antecedente", async (req, res) => {
  try {
    const { base64, fileName, contentType } = req.body as {
      base64?: string;
      fileName?: string;
      contentType?: string;
    };

    if (!base64 || !fileName || !contentType) {
      return res.status(400).json({ mensaje: "Faltan datos del documento" });
    }

    const url = await subirArchivoAzure(base64, fileName, contentType, AZURE_ANTECEDENTES_CONTAINER);
    return res.status(200).json({ url, mensaje: "Documento subido correctamente" });
  } catch (error) {
    console.error("Error al subir antecedente a Azure Blob:", error);
    return res.status(500).json({ mensaje: "No se pudo subir el documento" });
  }
});

app.post("/api/upload-evidencia", async (req, res) => {
  try {
    const { base64, fileName, contentType } = req.body as {
      base64?: string;
      fileName?: string;
      contentType?: string;
    };

    if (!base64 || !fileName || !contentType) {
      return res.status(400).json({ mensaje: "Faltan datos de la evidencia" });
    }

    const url = await subirArchivoAzure(base64, fileName, contentType, AZURE_EVIDENCIAS_CONTAINER);
    return res.status(200).json({ url, mensaje: "Evidencia subida correctamente" });
  } catch (error) {
    console.error("Error al subir evidencia a Azure Blob:", error);
    return res.status(500).json({ mensaje: "No se pudo subir la evidencia" });
  }
});

// ==========================================
// SUBIR IMAGEN DEL CHAT
// ==========================================
app.post(
  '/api/upload-chat',
  async (req, res) => {
    try {
      const {
        base64,
        fileName,
        contentType,
      } = req.body as {
        base64?: string;
        fileName?: string;
        contentType?: string;
      };

      if (
        !base64 ||
        !fileName ||
        !contentType
      ) {
        return res.status(400).json({
          mensaje:
            'Faltan datos de la imagen',
        });
      }

      const url =
        await subirArchivoAzure(
          base64,
          fileName,
          contentType,
          AZURE_CHAT_CONTAINER,
        );

      return res.status(200).json({
        url,
        mensaje:
          'Imagen subida correctamente',
      });
    } catch (error: any) {
      console.error(
        'Error al subir imagen del chat:',
        error,
      );

      return res.status(500).json({
        mensaje:
          'No se pudo subir la imagen',
        detalle:
          error?.message ??
          String(error),
      });
    }
  },
);


// ==========================================
// RUTAS DE EMPLEADOS
// ==========================================
app.post('/api/empleados', async (req, res) => {
  try {
    const { nombre_E, password_E, correo, celular } = req.body;

    if (!nombre_E || !password_E || !correo || !celular) {
      return res.status(400).json({
        mensaje: 'Nombre, correo, teléfono y contraseña son obligatorios',
      });
    }

    const passwordHash = await bcrypt.hash(password_E, SALT_ROUNDS);

    const [resultado] = await database.execute(
      `
      INSERT INTO empleados
      (
        nombre,
        password_hash,
        correo,
        telefono,
        titulo,
        dni,
        antecedentes,
        direccion,
        estado,
        numero_trabajos,
        sobre_mi,
        foto_url
      )
      VALUES
      (?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, NULL, NULL);
      SELECT SCOPE_IDENTITY() AS insertId;
      `,
      [
        nombre_E,
        passwordHash,
        correo,
        celular,
        'Pendiente',
        0,
      ],
    );

    res.status(201).json({
      mensaje: 'Empleado registrado correctamente',
      resultado,
    });
  } catch (error) {
    console.error('Error al registrar empleado:', error);

    res.status(500).json({
      mensaje: 'Error al registrar el empleado',
    });
  }
});

app.get('/api/empleados', async (_req, res) => {
  try {
    const [empleados] = await database.query(
      `
      SELECT
        id_empleado,
        nombre AS nombre_E,
        correo,
        telefono AS celular,
        titulo,
        dni,
        direccion,
        estado,
        numero_trabajos AS N_trabajos,
        foto_url,
        fecha_creacion AS fechaCreacion
      FROM empleados
      `,
    );

    res.json(empleados);
  } catch (error) {
    console.error('Error al consultar empleados:', error);

    res.status(500).json({
      mensaje: 'Error al consultar los empleados',
    });
  }
});

//disponibilidad de empleados
app.get('/api/empleados/disponibles', async (_req, res) => {
  try {
    const [respuesta]: any = await database.execute(`
      SELECT
        id_empleado,
        nombre,
        correo,
        telefono,
        dni,
        titulo,
        antecedentes,
        direccion,
        estado,
        numero_trabajos,
        sobre_mi,
        foto_url,
        fecha_creacion,
        ultima_actividad
      FROM empleados
      WHERE LOWER(LTRIM(RTRIM(estado))) = 'disponible'
    `);

    const empleados: any[] = Array.isArray(respuesta?.recordset)
      ? respuesta.recordset
      : Array.isArray(respuesta?.recordsets?.[0])
        ? respuesta.recordsets[0]
        : Array.isArray(respuesta)
          ? respuesta
          : [];

    return res.status(200).json(empleados);
  } catch (error: any) {
    console.error(
      'Error al consultar empleados disponibles:',
      error
    );

    return res.status(500).json({
      mensaje: 'Error al consultar los empleados disponibles',
      detalle: error?.message ?? String(error),
    });
  }
});

//empleados destacados
app.get('/api/empleados/destacados', async (_req, res) => {
  try {
    const [empleados]: any = await database.query(
      `
      SELECT TOP 5
        e.id_empleado,
        e.nombre_E,
        e.correo,
        e.celular,
        e.titulo,
        e.direccion,
        e.fk_categoria,
        e.estado,
        e.numero_trabajos AS N_trabajos,
        COALESCE(AVG(r.calificacion_general), 0) AS promedio_calificacion,
        e.sobre_mi,
        e.fechaCreacion
      FROM empleados AS e
      LEFT JOIN servicios AS s
        ON s.fk_empleado = e.id_empleado
      LEFT JOIN reservas AS re
        ON re.id_servicio = s.id_servicio
      LEFT JOIN resenas AS r
        ON r.id_reserva = re.id_reserva
        AND r.id_empleado = e.id_empleado
      GROUP BY
        e.id_empleado,
        e.nombre_E,
        e.correo,
        e.celular,
        e.titulo,
        e.direccion,
        e.fk_categoria,
        e.estado,
        e.numero_trabajos,
        e.sobre_mi,
        e.fechaCreacion
      ORDER BY promedio_calificacion DESC, N_trabajos DESC, nombre_E ASC
      `
    );

    res.json(Array.isArray(empleados) ? empleados : []);
  } catch (error) {
    console.error('Error al consultar empleados destacados:', error);

    res.status(500).json({
      mensaje: 'Error al consultar los empleados destacados',
    });
  }
});



// ==========================================
// OBTENER EMPLEADO POR ID
// ==========================================
app.get("/api/empleados/:id", async (req, res) => {
  try {
    const idEmpleado = Number(req.params.id);

    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      return res.status(400).json({
        mensaje: "ID de empleado inválido",
      });
    }

    const respuesta: any = await database.query(
      `
      SELECT TOP 1
        id_empleado,
        nombre AS nombre_E,
        correo,
        telefono AS celular,
        titulo,
        dni,
        antecedentes AS antecedente,
        direccion,
        estado,
        numero_trabajos AS N_trabajos,
        sobre_mi,
        foto_url AS foto,
        fecha_creacion AS fechaCreacion
      FROM empleados
      WHERE id_empleado = ${idEmpleado}
      `
    );

    const empleados: any[] =
      Array.isArray(respuesta?.[0])
        ? respuesta[0]
        : Array.isArray(respuesta?.recordset)
          ? respuesta.recordset
          : Array.isArray(respuesta?.rows)
            ? respuesta.rows
            : [];

    if (empleados.length === 0) {
      return res.status(404).json({
        mensaje: "Empleado no encontrado",
      });
    }

    return res.status(200).json(empleados[0]);
  } catch (error: any) {
    console.error("Error al consultar empleado:", error);

    return res.status(500).json({
      mensaje: "Error al consultar empleado",
      detalle: error?.message || String(error),
    });
  }
});

// ==========================================
// ACTUALIZAR EMPLEADO
// ==========================================
app.put("/api/empleados/:id", async (req, res) => {
  try {
    const idEmpleado = Number(req.params.id);

    const {
      nombre_E,
      correo,
      celular,
      titulo,
      dni,
      antecedente,
      direccion,
      sobre_mi,
      foto,
    } = req.body;

    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      return res.status(400).json({
        mensaje: "ID de empleado inválido",
      });
    }

    if (!nombre_E?.trim() || !correo?.trim()) {
      return res.status(400).json({
        mensaje: "Nombre y correo son obligatorios",
      });
    }

    const [resultado]: any = await database.execute(
      `
      UPDATE empleados
      SET
        nombre = ?,
        correo = ?,
        telefono = ?,
        titulo = ?,
        dni = ?,
        antecedentes = ?,
        direccion = ?,
        sobre_mi = ?,
        foto_url = ?
      WHERE id_empleado = ?
      `,
      [
        nombre_E.trim(),
        correo.trim().toLowerCase(),
        celular?.trim() || null,
        titulo?.trim() || null,
        dni?.trim() || null,
        antecedente?.trim() || null,
        direccion?.trim() || null,
        sobre_mi?.trim() || null,
        foto?.trim() || null,
        idEmpleado,
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Empleado no encontrado",
      });
    }

    return res.status(200).json({
      mensaje: "Perfil actualizado correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar empleado:", error);

    return res.status(500).json({
      mensaje: "Error al actualizar empleado",
    });
  }
});

// ==========================================
// RUTAS DE CLIENTES
// ==========================================
app.post("/api/clientes", async (req, res) => {
  try {
    const {
      nombre_C,
      password_C,
      correo,
      celular
    } = req.body;

    if (!nombre_C || !password_C || !correo || !celular) {
      return res.status(400).json({
        mensaje: "Nombre, correo, teléfono y contraseña son obligatorios"
      });
    }

    const passwordHash = await bcrypt.hash(password_C, SALT_ROUNDS);

    const [resultado] = await database.execute(
      `
      INSERT INTO clientes
      (nombre, password_hash, correo, telefono, dni, foto_url)
      VALUES (?, ?, ?, ?, NULL, NULL);
      SELECT SCOPE_IDENTITY() AS insertId;
      `,
      [
        nombre_C,
        passwordHash,
        correo,
        celular
      ]
    );

    res.status(201).json({
      mensaje: "Cliente registrado correctamente",
      resultado
    });
  } catch (error) {
    console.error("Error al registrar cliente:", error);

    res.status(500).json({
      mensaje: "Error al registrar el cliente"
    });
  }
});

/*app.get("/api/clientes", async (_req, res) => {
  try {
    const [clientes] = await database.query(
      `SELECT id_cliente, nombre AS nombre_C, correo, telefono AS celular, dni, fecha_creacion AS fechaCreacion FROM clientes`
    );

    res.json(clientes);
  } catch (error) {
    console.error("Error al consultar clientes:", error);

    res.status(500).json({
      mensaje: "Error al consultar los clientes",
    });
  }
});*/

// ==========================================
// OBTENER CLIENTE POR ID
// ==========================================
app.get(
  "/api/clientes/:id",
  async (req, res) => {
    try {
      const idCliente = Number(
        req.params.id
      );

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        return res.status(400).json({
          mensaje:
            "ID de cliente inválido",
        });
      }

      const respuesta: any =
        await database.query(`
          
          SELECT TOP 1
          id_cliente,
          nombre AS nombre_C,
          correo,
          telefono AS celular,
          dni,
          direccion,
          foto_url AS foto,
          fecha_creacion AS fechaCreacion
        FROM clientes
        WHERE id_cliente = ${idCliente}
                `);

      const clientes: any[] =
        Array.isArray(
          respuesta?.recordset
        )
          ? respuesta.recordset
          : Array.isArray(
                respuesta?.recordsets?.[0]
              )
            ? respuesta.recordsets[0]
            : Array.isArray(
                  respuesta?.[0]
                )
              ? respuesta[0]
              : Array.isArray(
                    respuesta?.rows
                  )
                ? respuesta.rows
                : [];

      if (clientes.length === 0) {
        return res.status(404).json({
          mensaje:
            "Cliente no encontrado",
        });
      }

      return res
        .status(200)
        .json(clientes[0]);
    } catch (error: any) {
      console.error(
        "Error al consultar cliente:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error al consultar el cliente",
        detalle:
          error?.message ||
          String(error),
      });
    }
  }
);

// ==========================================
// ACTUALIZAR CLIENTE
// ==========================================
/*app.put("/api/clientes/:id", async (req, res) => {
  try {
    const idCliente = Number(req.params.id);

    const {
      nombre_C,
      correo,
      celular,
      dni,
      password_C,
      foto,
    } = req.body;

    if (!Number.isInteger(idCliente) || idCliente <= 0) {
      return res.status(400).json({
        mensaje: "ID de cliente inválido",
      });
    }

    if (!nombre_C || !correo) {
      return res.status(400).json({
        mensaje: "Nombre y correo son obligatorios",
      });
    }

    const passwordHash = password_C
      ? await bcrypt.hash(password_C, SALT_ROUNDS)
      : null;

    const [resultado]: any = await database.execute(
      `
      UPDATE clientes
      SET
        nombre = ?,
        correo = ?,
        telefono = ?,
        dni = ?,
        password_hash = COALESCE(?, password_hash),
        foto_url = ?
      WHERE id_cliente = ?
      `,
      [
        nombre_C,
        correo,
        celular || null,
        dni || null,
        passwordHash,
        foto || null,
        idCliente,
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Cliente no encontrado",
      });
    }

    return res.status(200).json({
      mensaje: "Perfil del cliente actualizado correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar cliente:", error);

    return res.status(500).json({
      mensaje: "Error al actualizar el cliente",
    });
  }
});*/


// ==========================================
// ACTUALIZAR CLIENTE SIN MODIFICAR CONTRASEÑA
// ==========================================
app.put("/api/clientes/:id", async (req, res) => {
  try {
    const idCliente = Number(req.params.id);

    const {
      nombre_C,
      correo,
      celular,
      dni,
      direccion,
      foto,
    } = req.body;

    if (!Number.isInteger(idCliente) || idCliente <= 0) {
      return res.status(400).json({
        mensaje: "ID de cliente inválido",
      });
    }

    const nombreLimpio = String(nombre_C ?? "").trim();
    const correoLimpio = String(correo ?? "")
      .trim()
      .toLowerCase();

    const celularLimpio = String(celular ?? "").trim();
    const dniLimpio = String(dni ?? "").trim();
    const direccionLimpia = String(direccion ?? "").trim();
    const fotoLimpia = String(foto ?? "").trim();

    if (!nombreLimpio || !correoLimpio) {
      return res.status(400).json({
        mensaje: "Nombre y correo son obligatorios",
      });
    }

    const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!correoRegex.test(correoLimpio)) {
      return res.status(400).json({
        mensaje: "El correo electrónico no es válido",
      });
    }

    if (
      celularLimpio &&
      !/^\d{8}$/.test(celularLimpio)
    ) {
      return res.status(400).json({
        mensaje:
          "El celular debe contener exactamente 8 números",
      });
    }

    if (
      dniLimpio &&
      !/^\d+$/.test(dniLimpio)
    ) {
      return res.status(400).json({
        mensaje:
          "El DNI solo puede contener números",
      });
    }

    const escaparSql = (valor: string) =>
      valor.replace(/'/g, "''");

    const respuesta: any = await database.query(`
      UPDATE clientes
      SET
        nombre = '${escaparSql(nombreLimpio)}',
        correo = '${escaparSql(correoLimpio)}',

        telefono = ${
          celularLimpio
            ? `'${escaparSql(celularLimpio)}'`
            : "NULL"
        },

        dni = ${
          dniLimpio
            ? `'${escaparSql(dniLimpio)}'`
            : "NULL"
        },

        direccion = ${
          direccionLimpia
            ? `'${escaparSql(direccionLimpia)}'`
            : "NULL"
        },

        foto_url = ${
          fotoLimpia
            ? `'${escaparSql(fotoLimpia)}'`
            : "NULL"
        }

      WHERE id_cliente = ${idCliente};

      SELECT @@ROWCOUNT AS filasActualizadas;
    `);

    const resultado =
      respuesta?.recordset?.[0] ??
      respuesta?.recordsets?.[0]?.[0] ??
      respuesta?.[0]?.[0] ??
      null;

    const filasActualizadas = Number(
      resultado?.filasActualizadas ?? 0
    );

    if (filasActualizadas === 0) {
      return res.status(404).json({
        mensaje: "Cliente no encontrado",
      });
    }

    return res.status(200).json({
      mensaje:
        "Perfil del cliente actualizado correctamente",

      cliente: {
        id_cliente: idCliente,
        nombre_C: nombreLimpio,
        correo: correoLimpio,
        celular: celularLimpio,
        dni: dniLimpio,
        direccion: direccionLimpia,
        foto: fotoLimpia,
      },
    });
  } catch (error: any) {
    console.error(
      "Error al actualizar cliente:",
      error
    );

    return res.status(500).json({
      mensaje:
        "Error al actualizar el cliente",

      detalle:
        error?.message ||
        String(error),
    });
  }
});

// ==========================================
// OBTENER CLIENTE POR ID
// ==========================================
app.get("/api/clientes/:id", async (req, res) => {
  try {
    const idCliente = Number(req.params.id);

    if (!Number.isInteger(idCliente) || idCliente <= 0) {
      return res.status(400).json({
        mensaje: "ID de cliente inválido",
      });
    }

    const [clientes]: any = await database.execute(
      `
      SELECT
        id_cliente,
        nombre AS nombre_C,
        correo,
        telefono AS celular,
        dni,
        foto_url AS foto,
        fecha_creacion AS fechaCreacion
      FROM clientes
      WHERE id_cliente = ?
      LIMIT 1
      `,
      [idCliente]
    );

    if (clientes.length === 0) {
      return res.status(404).json({
        mensaje: "Cliente no encontrado",
      });
    }

    return res.status(200).json(clientes[0]);
  } catch (error) {
    console.error("Error al consultar cliente:", error);

    return res.status(500).json({
      mensaje: "Error al consultar el cliente",
    });
  }
});

// ==========================================
// OBTENER EMPLEADOS POR CATEGORÍA
// ==========================================

// ==========================================
// OBTENER EMPLEADOS POR CATEGORÍA
// ==========================================
app.get(
  '/api/categorias/:id/empleados',
  async (req, res) => {
    try {
      const idCategoria = Number(
        req.params.id
      );

      if (
        !Number.isInteger(idCategoria) ||
        idCategoria <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'ID de categoría inválido',
        });
      }

      const resultado: any =
        await database.execute(
          `
          SELECT DISTINCT
            e.id_empleado,
            e.nombre AS nombre_E,
            e.correo,
            e.telefono AS celular,
            e.titulo,
            e.direccion,
            e.estado,
            e.numero_trabajos AS N_trabajos,
            e.foto_url,
            c.id_categoria,
            c.nombre AS categoria
          FROM empleados AS e
          INNER JOIN empleado_categorias AS ec
            ON ec.id_empleado =
              e.id_empleado
          INNER JOIN categorias AS c
            ON c.id_categoria =
              ec.id_categoria
          WHERE ec.id_categoria = ?
          ORDER BY e.nombre ASC
          `,
          [idCategoria]
        );

      const empleados = obtenerFilas(
        Array.isArray(resultado)
          ? resultado[0]
          : resultado
      );

      console.log(
        `Categoría ${idCategoria}:`,
        empleados.length,
        'trabajadores encontrados'
      );

      return res.status(200).json(
        empleados
      );
    } catch (error: any) {
      console.error(
        'Error al consultar empleados por categoría:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al consultar los trabajadores',
        detalle:
          error?.message ||
          String(error),
      });
    }
  }
);



// ==========================================
// RUTA DE LOGIN (NUEVA)
// ==========================================
/*app.post("/api/login", async (req, res) => {
  try {
    const { correo, password, rol } = req.body;

    if (!correo || !password || !rol) {
      return res.status(400).json({
        mensaje: "Correo, contraseña y rol son obligatorios",
      });
    }

    let usuario = null;

    // Usamos alias (AS id, AS nombre) para estandarizar la respuesta sin importar si es cliente o empleado
    if (rol === 'client') {
      /*const [rows]: any = await database.execute(
        "SELECT id_cliente AS id, nombre AS nombre, correo, telefono AS celular, NULL AS estado, foto_url AS foto, password_hash FROM clientes WHERE correo = ?",
        [correo]
      );
      if (rows.length > 0) {
        const cliente = rows[0];
        //const valid = await bcrypt.compare(password, cliente.password_hash);
        
        if (valid) {
          const { password_hash, ...usuarioSinPassword } = cliente;
          usuario = usuarioSinPassword;
        }
      }
    } else if (rol === 'worker') {
      const [rows]: any = await database.execute(
        `
        SELECT
          id_empleado AS id,
          id_empleado AS idEmpleado,
          id_empleado AS id_empleado,
          nombre AS nombre,
          correo,
          telefono AS celular,
          estado,
          foto_url AS foto,
          password_hash
        FROM empleados
        WHERE correo = ?
        `,
        [correo]
      );
      if (rows.length > 0) {
        const empleado = rows[0];
        //const valid = await bcrypt.compare(password, empleado.password_hash);
        if (valid) {
          const { password_hash, ...usuarioSinPassword } = empleado;
          usuario = usuarioSinPassword;
        }
      }
    } else {
      return res.status(400).json({ mensaje: "Rol no válido" });
    }*/

    /*if (!usuario) {
      return res.status(401).json({ mensaje: "Correo o contraseña incorrectos" });
    }

    res.json({
      mensaje: "Inicio de sesión exitoso",
      usuario
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    res.status(500).json({
      mensaje: "Error interno del servidor al iniciar sesión",
    });
  }
});*/

app.post("/api/login", async (req, res) => {
  try {
    const { correo, password, rol } = req.body;

    if (!correo || !password || !rol) {
      return res.status(400).json({ mensaje: "Correo, contraseña y rol son obligatorios" });
    }

    const correoLimpio = String(correo).trim().toLowerCase();

    // Check lockout
    const now = Date.now();
    const attempt = loginAttempts.get(correoLimpio) ?? { count: 0 };
    if (attempt.lockedUntil && attempt.lockedUntil > now) {
      const waitSec = Math.ceil((attempt.lockedUntil - now) / 1000);
      logSecurity('login_blocked', { correo: correoLimpio, waitSec });
      return res.status(429).json({ mensaje: `Cuenta bloqueada temporalmente. Intente en ${waitSec} segundos.` });
    }

    let usuario: any = null;

    // Reuse existing queries to fetch user record
    if (rol === 'client') {
      const [respuesta]: any = await database.execute(
        `
      SELECT
        id_cliente AS id,
        nombre,
        correo,
        telefono AS celular,
        NULL AS estado,
        foto_url AS foto,
        password_hash
      FROM clientes
      WHERE correo = ?
    `,
        [correoLimpio]
      );

      const filas: any[] = Array.isArray(respuesta?.recordset)
        ? respuesta.recordset
        : Array.isArray(respuesta?.recordsets?.[0])
          ? respuesta.recordsets[0]
          : Array.isArray(respuesta)
            ? respuesta
            : [];

      if (filas.length > 0) {
        const row = filas[0];
        const hashGuardado = String(row.password_hash ?? '').trim();
        const valid = await bcrypt.compare(String(password), hashGuardado);
        if (valid) usuario = (({ password_hash, ...rest }) => rest)(row);
      }
    } else if (rol === 'worker') {
      const [respuesta]: any = await database.execute(
        `
      SELECT
        id_empleado AS id,
        id_empleado AS idEmpleado,
        id_empleado AS id_empleado,
        nombre,
        correo,
        telefono AS celular,
        estado,
        foto_url AS foto,
        password_hash
      FROM empleados
      WHERE correo = ?
    `,
        [correoLimpio]
      );

      const filas: any[] = Array.isArray(respuesta?.recordset)
        ? respuesta.recordset
        : Array.isArray(respuesta?.recordsets?.[0])
          ? respuesta.recordsets[0]
          : Array.isArray(respuesta)
            ? respuesta
            : [];

      if (filas.length > 0) {
        const row = filas[0];
        const hashGuardado = String(row.password_hash ?? '').trim();
        const valid = await bcrypt.compare(String(password), hashGuardado);
        if (valid) usuario = (({ password_hash, ...rest }) => rest)(row);
      }
    } else {
      return res.status(400).json({ mensaje: 'Rol no válido' });
    }

    if (!usuario) {
      // increment attempts
      const prev = loginAttempts.get(correoLimpio) ?? { count: 0 };
      const updated = { count: prev.count + 1 } as any;
      if (updated.count >= MAX_LOGIN_ATTEMPTS) {
        updated.lockedUntil = Date.now() + LOCKOUT_MS;
        logSecurity('login_locked', { correo: correoLimpio, attempts: updated.count });
      }
      loginAttempts.set(correoLimpio, updated);
      logSecurity('login_failed', { correo: correoLimpio, attempts: updated.count });
      return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos', attempts: updated.count });
    }

    // Success: clear attempts, create session and set cookie
    loginAttempts.delete(correoLimpio);
    const sid = uuidv4();
    const session: SessionData = {
      id: sid,
      user: usuario,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    sessions.set(sid, session);

    res.cookie(COOKIE_NAME, sid, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAME_SITE,
      maxAge: SESSION_INACTIVITY_MS,
    });

    logSecurity('login_success', { correo: correoLimpio, userId: usuario?.id, sid });

    return res.status(200).json({ mensaje: 'Inicio de sesión exitoso', usuario });
  } catch (error: any) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al iniciar sesión', detalle: error?.message ?? String(error) });
  }
});

// ==========================================
// AUXILIAR PARA LEER RESULTADOS DE SQL SERVER
// ==========================================
function obtenerFilas(resultado: any): any[] {
  if (!resultado) {
    return [];
  }

  if (Array.isArray(resultado.recordset)) {
    return resultado.recordset;
  }

  if (
    Array.isArray(
      resultado.recordsets?.[0],
    )
  ) {
    return resultado.recordsets[0];
  }

  if (Array.isArray(resultado.rows)) {
    return resultado.rows;
  }

  if (Array.isArray(resultado[0])) {
    return resultado[0];
  }

  if (Array.isArray(resultado)) {
    return resultado;
  }

  return [];
}



// ==========================================
// CREAR SERVICIO Y NOTIFICAR EMPLEADOS
// ==========================================
app.post('/api/servicios', async (req, res) => {
  try {
    const {
      fk_cliente,
      fk_categoria,
      fk_evidencia,
      titulo,
      descripcion,
      direccion,
      presupuesto,
      fecha,
      hora_inicio,
      hora_fin,
    } = req.body;

    const idCliente = Number(fk_cliente);
    const idCategoria = Number(fk_categoria);
    const presupuestoNumero = Number(presupuesto);

    const tituloLimpio =
      typeof titulo === 'string' && titulo.trim()
        ? titulo.trim()
        : typeof descripcion === 'string' && descripcion.trim()
          ? descripcion.trim().slice(0, 80)
          : 'Solicitud de servicio';

    const descripcionLimpia =
      typeof descripcion === 'string'
        ? descripcion.trim()
        : '';

    const direccionLimpia =
      typeof direccion === 'string'
        ? direccion.trim()
        : '';

    if (
      !Number.isInteger(idCliente) ||
      idCliente <= 0 ||
      !Number.isInteger(idCategoria) ||
      idCategoria <= 0 ||
      !descripcionLimpia ||
      !direccionLimpia ||
      !Number.isFinite(presupuestoNumero) ||
      presupuestoNumero <= 0 ||
      !fecha ||
      !hora_inicio ||
      !hora_fin
    ) {
      return res.status(400).json({
        mensaje:
          'Faltan datos obligatorios o existen datos inválidos',
      });
    }

    if (String(hora_fin) <= String(hora_inicio)) {
      return res.status(400).json({
        mensaje:
          'La hora final debe ser posterior a la hora inicial',
      });
    }

    // Crear servicio.
    const [resultadoServicio]: any =
      await database.execute(
        `
        INSERT INTO servicios (
          id_cliente,
          id_categoria,
          fk_cliente,
          fk_categoria,
          fk_evidencia,
          titulo,
          descripcion,
          direccion,
          presupuesto,
          fecha,
          hora_inicio,
          hora_fin,
          estado
        )
        OUTPUT
          INSERTED.id_servicio
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          'Pendiente'
        )
        `,
        [
          idCliente,
          idCategoria,
          idCliente,
          idCategoria,
          fk_evidencia || null,
          tituloLimpio,
          descripcionLimpia,
          direccionLimpia,
          presupuestoNumero,
          fecha,
          hora_inicio,
          hora_fin,
        ],
      );

    const filasServicio =
      obtenerFilas(resultadoServicio);

    const idServicio = Number(
      filasServicio[0]?.id_servicio,
    );

    if (
      !Number.isInteger(idServicio) ||
      idServicio <= 0
    ) {
      throw new Error(
        'No se pudo obtener el ID del servicio creado',
      );
    }

    // Obtener empleados relacionados con la categoría.
    const [resultadoEmpleados]: any =
      await database.execute(
        `
        SELECT DISTINCT
          ec.id_empleado
        FROM empleado_categorias AS ec
        INNER JOIN empleados AS e
          ON e.id_empleado = ec.id_empleado
        WHERE ec.id_categoria = ?
        `,
        [idCategoria],
      );

    const empleados =
      obtenerFilas(resultadoEmpleados);

    let notificacionesCreadas = 0;

    for (const empleado of empleados) {
      const idEmpleado = Number(
        empleado.id_empleado,
      );

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        continue;
      }

      const [resultadoNotificacion]: any =
        await database.execute(
          `
          INSERT INTO notificaciones (
            id_cliente,
            id_empleado,
            titulo,
            descripcion,
            tipo,
            leida,
            fecha,
            fk_servicio
          )
          OUTPUT
            INSERTED.id_notificacion
          VALUES (
            NULL,
            ?,
            ?,
            ?,
            ?,
            0,
            SYSDATETIME(),
            ?
          )
          `,
          [
            idEmpleado,
            'Nuevo trabajo disponible',
            `Se publicó el trabajo "${tituloLimpio}" en una de tus categorías.`,
            'nuevo_servicio',
            idServicio,
          ],
        );

      const filasNotificacion =
        obtenerFilas(resultadoNotificacion);

      if (filasNotificacion.length > 0) {
        notificacionesCreadas += 1;
      }
    }

    console.log('Servicio creado:', {
      idServicio,
      idCliente,
      idCategoria,
      empleadosEncontrados: empleados.length,
      notificacionesCreadas,
    });

    return res.status(201).json({
      mensaje:
        'Solicitud publicada correctamente',
      idServicio,
      empleadosEncontrados: empleados.length,
      notificacionesCreadas,
    });
  } catch (error: any) {
    console.error(
      'Error al registrar servicio:',
      error,
    );

    return res.status(500).json({
      mensaje:
        'Error al publicar la solicitud',
      detalle:
        error?.message || String(error),
      numero: error?.number ?? null,
      codigo: error?.code ?? null,
    });
  }
});

// ==========================================
// POSTULARSE Y NOTIFICAR AL CLIENTE
// ==========================================
app.post(
  '/api/servicios/:idServicio/postular',
  async (req, res) => {
    try {
      const idServicio = Number(
        req.params.idServicio,
      );

      const idEmpleado = Number(
        req.body?.fk_empleado,
      );

      const tipoPostulacion =
        String(
          req.body?.tipo_postulacion ?? 'aceptar'
        )
          .trim()
          .toLowerCase();

      if (
        !Number.isInteger(idServicio) ||
        idServicio <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de servicio inválido',
        });
      }

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de empleado inválido',
        });
      }

      // Obtener servicio y cliente.
      const [resultadoServicio]: any =
        await database.execute(
          `
          SELECT TOP 1
            s.id_servicio,
            s.titulo,
            s.estado,
            COALESCE(
              s.fk_cliente,
              s.id_cliente
            ) AS id_cliente
          FROM servicios AS s
          WHERE s.id_servicio = ?
          `,
          [idServicio],
        );

      const servicios =
        obtenerFilas(resultadoServicio);

      if (servicios.length === 0) {
        return res.status(404).json({
          mensaje: 'El servicio no existe',
        });
      }

      const servicio = servicios[0];

      const estadoServicio = String(
        servicio.estado ?? '',
      )
        .trim()
        .toLowerCase();

      if (
        ![
          'pendiente',
          'pending',
        ].includes(estadoServicio)
      ) {
        return res.status(400).json({
          mensaje:
            'Este servicio ya no acepta postulaciones',
        });
      }

      const idCliente = Number(
        servicio.id_cliente,
      );

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'El servicio no tiene un cliente válido',
        });
      }

      // Obtener empleado.
      const [resultadoEmpleado]: any =
        await database.execute(
          `
          SELECT TOP 1
            id_empleado,
            nombre
          FROM empleados
          WHERE id_empleado = ?
          `,
          [idEmpleado],
        );

      const empleados =
        obtenerFilas(resultadoEmpleado);

      if (empleados.length === 0) {
        return res.status(404).json({
          mensaje: 'El empleado no existe',
        });
      }

      const empleado = empleados[0];

      // Evitar postulación duplicada.
      const [resultadoExistente]: any =
        await database.execute(
          `
          SELECT TOP 1
            id_postulacion,
            estado,
            fecha
          FROM postulaciones
          WHERE fk_servicio = ?
            AND fk_empleado = ?
          `,
          [
            idServicio,
            idEmpleado,
          ],
        );

      const existentes =
        obtenerFilas(resultadoExistente);

      if (existentes.length > 0) {
        return res.status(409).json({
          mensaje:
            'Ya te postulaste a este servicio',
          postulacion: existentes[0],
        });
      }

      // Crear postulación.
      const [resultadoPostulacion]: any =
        await database.execute(
          `
          INSERT INTO postulaciones (
            fk_servicio,
            fk_empleado,
            tipo_postulacion,
            estado,
            fecha
          )
          OUTPUT
            INSERTED.id_postulacion,
            INSERTED.tipo_postulacion,
            INSERTED.fk_servicio,
            INSERTED.fk_empleado,
            INSERTED.estado,
            INSERTED.fecha
          VALUES (
            ?,
            ?,
            ?,
            'Pendiente',
            SYSDATETIME()
          )
          `,
          [
            idServicio,
            idEmpleado,
            tipoPostulacion,
          ],
        );

      const postulaciones =
        obtenerFilas(resultadoPostulacion);

      const postulacion =
        postulaciones[0] ?? {
          fk_servicio: idServicio,
          fk_empleado: idEmpleado,
          estado: 'Pendiente',
        };

      const nombreEmpleado = String(
        empleado.nombre ||
          'Un trabajador',
      ).trim();

      const tituloServicio = String(
        servicio.titulo ||
          'Solicitud de servicio',
      ).trim();

      const descripcionNotificacion =
        tipoPostulacion === 'negociar'
          ? `${nombreEmpleado} quiere negociar el presupuesto de tu solicitud "${tituloServicio}".`
          : `${nombreEmpleado} aceptó el presupuesto de tu solicitud "${tituloServicio}".`;

      // Notificar al cliente.
      const [resultadoNotificacion]: any =
        await database.execute(
          `
          INSERT INTO notificaciones (
            id_cliente,
            id_empleado,
            titulo,
            descripcion,
            tipo,
            leida,
            fecha,
            fk_servicio
          )
          OUTPUT
            INSERTED.id_notificacion,
            INSERTED.id_cliente,
            INSERTED.id_empleado,
            INSERTED.titulo,
            INSERTED.descripcion,
            INSERTED.tipo,
            INSERTED.leida,
            INSERTED.fecha,
            INSERTED.fk_servicio
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            0,
            SYSDATETIME(),
            ?
          )
          `,
          [
            idCliente,
            null,
            'Nueva postulación',
            descripcionNotificacion,
            // `${nombreEmpleado} se postuló a tu solicitud "${tituloServicio}".`,
            'postulacion',
            idServicio,
          ],
        );

      const notificaciones =
        obtenerFilas(resultadoNotificacion);

      console.log(
        'Postulación y notificación creadas:',
        {
          idServicio,
          idEmpleado,
          idCliente,
          idPostulacion:
            postulacion?.id_postulacion ??
            null,
          idNotificacion:
            notificaciones[0]
              ?.id_notificacion ?? null,
        },
      );

      return res.status(201).json({
        mensaje:
          'Postulación registrada correctamente',
        postulacion,
        notificacion:
          notificaciones[0] ?? null,
      });
    } catch (error: any) {
      console.error(
        'Error al registrar postulación:',
        error,
      );

      if (
        error?.number === 2601 ||
        error?.number === 2627
      ) {
        return res.status(409).json({
          mensaje:
            'Ya te postulaste a este servicio',
        });
      }

      return res.status(500).json({
        mensaje:
          'Error al registrar la postulación',
        detalle:
          error?.message || String(error),
        numero: error?.number ?? null,
        codigo: error?.code ?? null,
      });
    }
  },
);

// ==========================================
// NOTIFICACIONES DEL CLIENTE
// ==========================================
app.get(
  '/api/clientes/:idCliente/notificaciones',
  async (req, res) => {
    try {
      const idCliente = Number(
        req.params.idCliente,
      );

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de cliente inválido',
        });
      }

      const [resultado]: any =
        await database.execute(
          `
          SELECT
            n.id_notificacion,
            n.id_cliente,
            n.id_empleado,
            n.titulo,
            n.descripcion,
            n.tipo,
            n.leida,
            n.fecha,
            n.fk_servicio,
            e.nombre AS nombre_empleado,
            e.foto_url AS foto_empleado
          FROM notificaciones AS n
          LEFT JOIN empleados AS e
            ON e.id_empleado =
              n.id_empleado
          WHERE n.id_cliente = ?
          ORDER BY
            n.fecha DESC,
            n.id_notificacion DESC
          `,
          [idCliente],
        );

      const notificaciones =
        obtenerFilas(resultado);

      return res.status(200).json({
        notificaciones,
        total: notificaciones.length,
        no_leidas:
          notificaciones.filter(
            (item) =>
              !Boolean(item.leida),
          ).length,
      });
    } catch (error: any) {
      console.error(
        'Error al obtener notificaciones del cliente:',
        error,
      );

      return res.status(500).json({
        mensaje:
          'Error al obtener las notificaciones',
        detalle:
          error?.message || String(error),
      });
    }
  },
);

// ==========================================
// NOTIFICACIONES DEL EMPLEADO
// ==========================================
app.get(
  '/api/empleados/:idEmpleado/notificaciones',
  async (req, res) => {
    try {
      const idEmpleado = Number(
        req.params.idEmpleado,
      );

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de empleado inválido',
        });
      }

      const [resultado]: any =
        await database.execute(
          `
          SELECT
            n.id_notificacion,
            n.id_cliente,
            n.id_empleado,
            n.titulo,
            n.descripcion,
            n.tipo,
            n.leida,
            n.fecha,
            n.fk_servicio
          FROM notificaciones AS n
          WHERE n.id_empleado = ?
          ORDER BY
            n.fecha DESC,
            n.id_notificacion DESC
          `,
          [idEmpleado],
        );

      const notificaciones =
        obtenerFilas(resultado);

      return res.status(200).json({
        notificaciones,
        total: notificaciones.length,
        no_leidas:
          notificaciones.filter(
            (item) =>
              !Boolean(item.leida),
          ).length,
      });
    } catch (error: any) {
      console.error(
        'Error al obtener notificaciones del empleado:',
        error,
      );

      return res.status(500).json({
        mensaje:
          'Error al obtener las notificaciones',
        detalle:
          error?.message || String(error),
      });
    }
  },
);

// ==========================================
// MARCAR UNA NOTIFICACIÓN COMO LEÍDA
// ==========================================
app.put(
  '/api/notificaciones/:idNotificacion/leer',
  async (req, res) => {
    try {
      const idNotificacion = Number(
        req.params.idNotificacion,
      );

      if (
        !Number.isInteger(idNotificacion) ||
        idNotificacion <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'ID de notificación inválido',
        });
      }

      const [resultado]: any =
        await database.execute(
          `
          UPDATE notificaciones
          SET leida = 1
          OUTPUT
            INSERTED.id_notificacion,
            INSERTED.leida
          WHERE id_notificacion = ?
          `,
          [idNotificacion],
        );

      const filas = obtenerFilas(resultado);

      if (filas.length === 0) {
        return res.status(404).json({
          mensaje:
            'La notificación no existe',
        });
      }

      return res.status(200).json({
        mensaje:
          'Notificación marcada como leída',
        notificacion: filas[0],
      });
    } catch (error: any) {
      return res.status(500).json({
        mensaje:
          'No se pudo actualizar la notificación',
        detalle:
          error?.message || String(error),
      });
    }
  },
);


// ==========================================
// MARCAR TODAS LAS NOTIFICACIONES DEL CLIENTE
// ==========================================
app.put(
  '/api/clientes/:idCliente/notificaciones/leer-todas',
  async (req, res) => {
    try {
      const idCliente = Number(
        req.params.idCliente
      );

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de cliente inválido',
        });
      }

      await database.execute(
        `
        UPDATE notificaciones
        SET leida = 1
        WHERE id_cliente = ?
        `,
        [idCliente]
      );

      return res.status(200).json({
        mensaje:
          'Notificaciones marcadas como leídas',
      });
    } catch (error: any) {
      console.error(
        'Error al marcar notificaciones del cliente:',
        error
      );

      return res.status(500).json({
        mensaje:
          'No se pudieron actualizar las notificaciones',
        detalle: error?.message || String(error),
      });
    }
  }
);

// ==========================================
// MARCAR TODAS LAS DEL EMPLEADO COMO LEÍDAS
// ==========================================
app.put(
  '/api/empleados/:idEmpleado/notificaciones/leer-todas',
  async (req, res) => {
    try {
      const idEmpleado = Number(
        req.params.idEmpleado,
      );

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'ID de empleado inválido',
        });
      }

      await database.execute(
        `
        UPDATE notificaciones
        SET leida = 1
        WHERE id_empleado = ?
        `,
        [idEmpleado],
      );

      return res.status(200).json({
        mensaje:
          'Notificaciones marcadas como leídas',
      });
    } catch (error: any) {
      return res.status(500).json({
        mensaje:
          'No se pudieron actualizar las notificaciones',
        detalle:
          error?.message || String(error),
      });
    }
  },
);







// ==========================================
// OBTENER SERVICIOS / SOLICITUDES DISPONIBLES
// ==========================================
app.get('/api/servicios', async (_req, res) => {
  try {
    const respuesta: any = await database.query(`
      SELECT
        s.id_servicio,
        COALESCE(s.fk_cliente, s.id_cliente) AS fk_cliente,
        COALESCE(s.fk_categoria, s.id_categoria) AS fk_categoria,
        s.id_cliente,
        s.id_categoria,
        s.id_subcategoria,
        s.fk_empleado,
        s.fk_evidencia,
        s.titulo,
        s.descripcion,
        s.direccion,
        s.presupuesto,
        s.fecha,
        s.hora_inicio,
        s.hora_fin,
        COALESCE(
          NULLIF(LTRIM(RTRIM(s.estado)), ''),
          'Pendiente'
        ) AS estado,
        COALESCE(
          NULLIF(LTRIM(RTRIM(cat.nombre)), ''),
          'Sin categoría'
        ) AS nombre_categoria,
        COALESCE(
          NULLIF(LTRIM(RTRIM(c.nombre)), ''),
          'Cliente'
        ) AS nombre_cliente,
        c.foto_url AS foto_cliente,
        (
          SELECT COUNT(*)
          FROM postulaciones AS p
          WHERE p.fk_servicio = s.id_servicio
        ) AS total_postulaciones
      FROM servicios AS s
      LEFT JOIN categorias AS cat
        ON cat.id_categoria = COALESCE(
          s.fk_categoria,
          s.id_categoria
        )
      LEFT JOIN clientes AS c
        ON c.id_cliente = COALESCE(
          s.fk_cliente,
          s.id_cliente
        )
      ORDER BY
        s.fecha DESC,
        s.hora_inicio DESC,
        s.id_servicio DESC
    `);

    const servicios = obtenerFilas(respuesta);

    return res.status(200).json(servicios);
  } catch (error: any) {
    console.error(
      'Error al consultar servicios:',
      error
    );

    return res.status(500).json({
      mensaje: 'Error al consultar los servicios',
      detalle: error?.message || String(error),
    });
  }
});

// ==========================================
// RUTAS DE SERVICIOS / SOLICITUDES lectura id 
// ==========================================
// ==========================================
// OBTENER SERVICIO POR ID
// ==========================================
app.get('/api/servicios/:id', async (req, res) => {
  try {
    const idServicio = Number(req.params.id);

    if (
      !Number.isInteger(idServicio) ||
      idServicio <= 0
    ) {
      return res.status(400).json({
        mensaje: 'ID de servicio inválido',
      });
    }

    /*
      Usamos database.query en lugar de database.execute.

      El ID ya fue convertido y validado como número entero,
      por lo que se puede colocar directamente en la consulta.
    */
    const respuesta: any = await database.query(
      `
        SELECT
          s.id_servicio,

          COALESCE(
            s.fk_cliente,
            s.id_cliente
          ) AS fk_cliente,

          COALESCE(
            s.fk_categoria,
            s.id_categoria
          ) AS fk_categoria,

          s.id_cliente,
          s.id_categoria,
          s.id_subcategoria,
          s.fk_empleado,
          s.fk_evidencia,
          s.titulo,
          s.descripcion,
          s.direccion,
          s.presupuesto,
          s.fecha,
          s.hora_inicio,
          s.hora_fin,
          COALESCE(
            NULLIF(LTRIM(RTRIM(s.estado)), ''),
            'Pendiente'
          ) AS estado,

          COALESCE(
            NULLIF(c.nombre, ''),
            NULLIF(c.nombre_C, ''),
            'Cliente no disponible'
          ) AS nombre_cliente,

          COALESCE(
            c.foto_url,
            c.foto
          ) AS foto_cliente,

          e.nombre AS nombre_empleado,

          (SELECT COUNT(*)
           FROM resenas r
           JOIN reservas re ON re.id_reserva = r.id_reserva
           WHERE re.id_servicio = s.id_servicio
          ) AS total_resenas,

          cat.nombre AS nombre_categoria

        FROM servicios AS s

        LEFT JOIN clientes AS c
          ON c.id_cliente = COALESCE(
            s.fk_cliente,
            s.id_cliente
          )

        LEFT JOIN empleados AS e
          ON e.id_empleado = s.fk_empleado

        LEFT JOIN categorias AS cat
          ON cat.id_categoria = COALESCE(
            s.fk_categoria,
            s.id_categoria
          )

        WHERE s.id_servicio = ${idServicio}
      `
    );

    /*
      Compatibilidad con las posibles formas en las que
      el adaptador puede devolver los resultados.
    */
    let filas: any[] = [];

    if (
      Array.isArray(respuesta) &&
      Array.isArray(respuesta[0])
    ) {
      // Formato: [filas, información]
      filas = respuesta[0];
    } else if (
      Array.isArray(respuesta?.recordset)
    ) {
      // Formato directo de mssql
      filas = respuesta.recordset;
    } else if (
      Array.isArray(respuesta?.rows)
    ) {
      filas = respuesta.rows;
    } else if (Array.isArray(respuesta)) {
      filas = respuesta;
    }

    if (filas.length === 0) {
      return res.status(404).json({
        mensaje: 'Servicio no encontrado',
        idServicio,
      });
    }

    return res.status(200).json(filas[0]);
  } catch (error: any) {
    console.error(
      'Error al consultar servicio:',
      error
    );

    return res.status(500).json({
      mensaje: 'Error al consultar el servicio',
      detalle:
        error?.message ||
        'Error desconocido en la consulta',
    });
  }
});
// ==========================================
// RUTAS DE SERVICIOS / SOLICITUDES (UPDATE)
// ==========================================
app.put("/api/servicios/:id", async (req, res) => {
  try {
    const idServicio = Number(req.params.id);

    if (
      !Number.isInteger(idServicio) ||
      idServicio <= 0
    ) {
      return res.status(400).json({
        mensaje: "ID de servicio inválido",
      });
    }

    const {
      fk_cliente,
      fk_categoria,
      fk_evidencia,
      descripcion,
      direccion,
      presupuesto,
      fecha,
      hora_inicio,
      hora_fin,
    } = req.body;

    if (
      !fk_cliente ||
      !fk_categoria ||
      !descripcion ||
      !direccion ||
      !presupuesto ||
      !fecha ||
      !hora_inicio ||
      !hora_fin
    ) {
      return res.status(400).json({
        mensaje:
          "Faltan datos obligatorios para actualizar la solicitud",
      });
    }

    if (String(hora_fin) <= String(hora_inicio)) {
      return res.status(400).json({
        mensaje:
          "La hora final debe ser posterior a la hora inicial",
      });
    }

    const [resultado]: any =
      await database.execute(
        `
        UPDATE servicios
        SET
          fk_cliente = ?,
          fk_categoria = ?,
          fk_evidencia = ?,
          descripcion = ?,
          direccion = ?,
          presupuesto = ?,
          fecha = ?,
          hora_inicio = ?,
          hora_fin = ?
        WHERE id_servicio = ?
        `,
        [
          fk_cliente,
          fk_categoria,
          fk_evidencia || null,
          descripcion,
          direccion,
          presupuesto,
          fecha,
          hora_inicio,
          hora_fin,
          idServicio,
        ]
      );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Servicio no encontrado",
      });
    }

    return res.json({
      mensaje:
        "Servicio actualizado correctamente",
    });
  } catch (error) {
    console.error(
      "Error al actualizar servicio:",
      error
    );

    return res.status(500).json({
      mensaje:
        "Error al actualizar el servicio",
    });
  }
});
// ==========================================
// RUTAS DE SERVICIOS / SOLICITUDES (DELETE)
// ==========================================

app.delete("/api/servicios/:id", async (req, res) => {
  try {
    const idServicio = Number(req.params.id);

    const [resultado]: any = await database.execute(
      `
      DELETE FROM servicios
      WHERE id_servicio = ?
      `,
      [idServicio]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Servicio no encontrado",
      });
    }

    res.json({
      mensaje: "Servicio eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar servicio:", error);

    res.status(500).json({
      mensaje: "Error al eliminar el servicio",
    });
  }
});



// ==========================================
// RUTAS DE CATEGORÍAS
// ==========================================
app.get("/api/categorias", async (_req, res) => {
  try {
    const [categorias] = await database.query(
      "SELECT id_categoria, nombre FROM categorias"
    );
    res.json(categorias);
  } catch (error) {
    console.error("Error al consultar categorías:", error);
    res.status(500).json({
      mensaje: "Error al consultar las categorías",
    });
  }
});

app.get('/api/categorias/:id/subcategorias', async (req, res) => {
  try {
    const idCategoria = Number(req.params.id);

    if (!Number.isInteger(idCategoria) || idCategoria <= 0) {
      return res.status(400).json({
        mensaje: 'ID de categoría inválido',
      });
    }

    const [subcategorias] = await database.query(
      `
      SELECT
        id_subcategoria,
        nombre,
        descripcion,
        fk_categoria AS id_categoria
      FROM subcategorias
      WHERE fk_categoria = ?
      ORDER BY nombre ASC
      `,
      [idCategoria]
    );

    res.json({
      subcategorias,
    });
  } catch (error) {
    console.error('Error al consultar subcategorías:', error);

    res.status(500).json({
      mensaje: 'Error al consultar las subcategorías',
    });
  }
});

// ==========================================
// SUBCATEGORÍAS ASIGNADAS A UN EMPLEADO
// ==========================================

// Obtener las subcategorías seleccionadas por un empleado
/*app.get(
  "/api/empleados/:idEmpleado/subcategorias",
  async (req, res) => {
    try {
      const idEmpleado = Number(
        req.params.idEmpleado
      );

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: "ID de empleado inválido",
        });
      }

      const [empleados]: any =
        await database.execute(
          `
          SELECT id_empleado
          FROM empleados
          WHERE id_empleado = ?
          `,
          [idEmpleado]
        );

      if (
        !Array.isArray(empleados) ||
        empleados.length === 0
      ) {
        return res.status(404).json({
          mensaje: "Empleado no encontrado",
        });
      }

      const [subcategorias]: any =
        await database.execute(
          `
          SELECT
            s.id_subcategoria,
            s.fk_categoria AS id_categoria,
            s.nombre,
            s.descripcion
          FROM empleado_subcategorias es
          INNER JOIN subcategorias s
            ON s.id_subcategoria =
              es.id_subcategoria
          WHERE es.id_empleado = ?
          ORDER BY
            s.fk_categoria ASC,
            s.nombre ASC
          `,
          [idEmpleado]
        );

      return res.status(200).json({
        idEmpleado,
        subcategorias,
      });
    } catch (error: any) {
      console.error(
        "Error al consultar subcategorías del empleado:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error al consultar las subcategorías del empleado",
        detalle: error.message,
      });
    }
  }
);*/


// ==========================================
// OBTENER SUBCATEGORÍAS DE UN EMPLEADO
// ==========================================
app.get(
  "/api/empleados/:idEmpleado/subcategorias",
  async (req, res) => {
    try {
      const idEmpleado = Number(
        req.params.idEmpleado
      );

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: "ID de empleado inválido",
        });
      }

      const respuesta: any =
        await database.query(`
          SELECT
            s.id_subcategoria,
            s.fk_categoria AS id_categoria,
            s.nombre,
            s.descripcion
          FROM empleado_subcategorias es
          INNER JOIN subcategorias s
            ON s.id_subcategoria =
               es.id_subcategoria
          WHERE es.id_empleado = ${idEmpleado}
          ORDER BY
            s.fk_categoria ASC,
            s.nombre ASC
        `);

      let subcategorias: any[] = [];

      if (
        Array.isArray(respuesta?.recordset)
      ) {
        subcategorias =
          respuesta.recordset;
      } else if (
        Array.isArray(
          respuesta?.recordsets?.[0]
        )
      ) {
        subcategorias =
          respuesta.recordsets[0];
      } else if (
        Array.isArray(respuesta?.[0])
      ) {
        subcategorias =
          respuesta[0];
      } else if (
        Array.isArray(respuesta?.rows)
      ) {
        subcategorias =
          respuesta.rows;
      } else if (
        Array.isArray(respuesta)
      ) {
        subcategorias = respuesta;
      }

      return res.status(200).json({
        idEmpleado,
        subcategorias,
      });
    } catch (error: any) {
      console.error(
        "Error al consultar subcategorías del empleado:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error al consultar las subcategorías del empleado",
        detalle:
          error?.message ||
          "Error desconocido",
      });
    }
  }
);

// ==========================================
// GUARDAR CATEGORÍAS Y SUBCATEGORÍAS
// ==========================================
app.put(
  "/api/empleados/:idEmpleado/categorias",
  async (req, res) => {
    try {
      const idEmpleado = Number(req.params.idEmpleado);

      const categoriasRecibidas = Array.isArray(req.body?.categorias)
        ? req.body.categorias
        : [];

      const subcategoriasRecibidas = Array.isArray(req.body?.subcategorias)
        ? req.body.subcategorias
        : [];

      const categorias: number[] = categoriasRecibidas
        .map((valor: unknown) => Number(valor))
        .filter(
          (id: number, indice: number, arreglo: number[]) =>
            Number.isInteger(id) && id > 0 && arreglo.indexOf(id) === indice
        );

      const subcategorias: number[] = subcategoriasRecibidas
        .map((valor: unknown) => Number(valor))
        .filter(
          (id: number, indice: number, arreglo: number[]) =>
            Number.isInteger(id) && id > 0 && arreglo.indexOf(id) === indice
        );

      console.log("================================");
      console.log("GUARDANDO SERVICIOS DEL EMPLEADO");
      console.log("Empleado:", idEmpleado);
      console.log("Categorías:", categorias);
      console.log("Subcategorías:", subcategorias);
      console.log("================================");

      if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
        return res.status(400).json({
          mensaje: "ID de empleado inválido",
        });
      }

      if (categorias.length === 0) {
        return res.status(400).json({
          mensaje: "Debes seleccionar al menos una categoría",
        });
      }

      // Confirmar que el empleado existe.
      const respuestaEmpleado: any = await database.query(
        `
        SELECT TOP 1 id_empleado
        FROM empleados
        WHERE id_empleado = ${idEmpleado}
        `
      );

      const empleados: any[] =
        Array.isArray(respuestaEmpleado?.[0])
          ? respuestaEmpleado[0]
          : Array.isArray(respuestaEmpleado?.recordset)
            ? respuestaEmpleado.recordset
            : Array.isArray(respuestaEmpleado?.rows)
              ? respuestaEmpleado.rows
              : [];

      if (empleados.length === 0) {
        return res.status(404).json({
          mensaje: "Empleado no encontrado",
          idEmpleado,
        });
      }

      // Validar categorías.
      for (const idCategoria of categorias) {
        const respuestaCategoria: any = await database.query(
          `
          SELECT TOP 1 id_categoria
          FROM categorias
          WHERE id_categoria = ${idCategoria}
          `
        );

        const filasCategoria: any[] =
          Array.isArray(respuestaCategoria?.[0])
            ? respuestaCategoria[0]
            : Array.isArray(respuestaCategoria?.recordset)
              ? respuestaCategoria.recordset
              : Array.isArray(respuestaCategoria?.rows)
                ? respuestaCategoria.rows
                : [];

        if (filasCategoria.length === 0) {
          return res.status(400).json({
            mensaje: `La categoría ${idCategoria} no existe`,
          });
        }
      }

      // Validar subcategorías y comprobar que pertenecen a las categorías seleccionadas.
      for (const idSubcategoria of subcategorias) {
        const respuestaSubcategoria: any = await database.query(
          `
          SELECT TOP 1
            id_subcategoria,
            fk_categoria
          FROM subcategorias
          WHERE id_subcategoria = ${idSubcategoria}
          `
        );

        const filasSubcategoria: any[] =
          Array.isArray(respuestaSubcategoria?.[0])
            ? respuestaSubcategoria[0]
            : Array.isArray(respuestaSubcategoria?.recordset)
              ? respuestaSubcategoria.recordset
              : Array.isArray(respuestaSubcategoria?.rows)
                ? respuestaSubcategoria.rows
                : [];

        if (filasSubcategoria.length === 0) {
          return res.status(400).json({
            mensaje: `La subcategoría ${idSubcategoria} no existe`,
          });
        }

        const idCategoriaDeSubcategoria = Number(
          filasSubcategoria[0].fk_categoria
        );

        if (!categorias.includes(idCategoriaDeSubcategoria)) {
          return res.status(400).json({
            mensaje:
              `La subcategoría ${idSubcategoria} no pertenece a una categoría seleccionada`,
          });
        }
      }

      // Guardar todo en una única transacción de Azure SQL.
      const valoresCategorias = categorias
        .map((idCategoria) => `(${idEmpleado}, ${idCategoria})`)
        .join(", ");

      const valoresSubcategorias = subcategorias
        .map((idSubcategoria) => `(${idEmpleado}, ${idSubcategoria})`)
        .join(", ");

      const insertarCategorias = `
        INSERT INTO empleado_categorias (id_empleado, id_categoria)
        VALUES ${valoresCategorias};
      `;

      const insertarSubcategorias = subcategorias.length > 0
        ? `
          INSERT INTO empleado_subcategorias (id_empleado, id_subcategoria)
          VALUES ${valoresSubcategorias};
        `
        : "";

      await database.query(
        `
        SET XACT_ABORT ON;

        BEGIN TRY
          BEGIN TRANSACTION;

          DELETE FROM empleado_subcategorias
          WHERE id_empleado = ${idEmpleado};

          DELETE FROM empleado_categorias
          WHERE id_empleado = ${idEmpleado};

          ${insertarCategorias}
          ${insertarSubcategorias}

          COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
          IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

          THROW;
        END CATCH;
        `
      );

      console.log("Guardado terminado correctamente");

      return res.status(200).json({
        mensaje: "Categorías y subcategorías guardadas correctamente",
        idEmpleado,
        categorias,
        subcategorias,
      });
    } catch (error: any) {
      console.error("ERROR REAL AL GUARDAR:", error);

      return res.status(500).json({
        mensaje: "Error al guardar categorías y subcategorías",
        detalle: error?.message || String(error),
        numero: error?.number ?? null,
        codigo: error?.code ?? null,
      });
    }
  }
);

// ==========================================
// ADMIN: exportar informes (CSV)
// ==========================================
app.get('/api/admin/export/services', async (_req, res) => {
  try {
    const [servicios] = await database.query(
      `
      SELECT
        s.id_servicio,
        s.fk_cliente,
        s.fk_categoria,
        s.fk_empleado,
        s.titulo,
        s.descripcion,
        s.direccion,
        s.presupuesto,
        s.fecha,
        s.hora_inicio,
        s.hora_fin,
        s.estado
      FROM servicios s
      ORDER BY s.fecha DESC
      `,
    );

    // Build CSV
    const header = [
      'id_servicio',
      'fk_cliente',
      'fk_categoria',
      'fk_empleado',
      'titulo',
      'descripcion',
      'direccion',
      'presupuesto',
      'fecha',
      'hora_inicio',
      'hora_fin',
      'estado',
    ];

    const rows = ((servicios as any[]) || []).map((r: any) =>
      header.map((h) => {
        const v = r[h] ?? '';
        return String(v).replace(/\"/g, '""');
      }).join(',')
    );

    const csv = [header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="services.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error export services:', error);
    res.status(500).json({ mensaje: 'Error al exportar servicios' });
  }
});

app.get('/api/admin/export/clients', async (_req, res) => {
  try {
    const [clientes] = await database.query(
      `SELECT id_cliente, nombre AS nombre_C, correo, telefono AS celular, dni FROM clientes ORDER BY id_cliente ASC`
    );

    const header = ['id_cliente', 'nombre_C', 'correo', 'celular', 'dni'];

    const rows = ((clientes as any[]) || []).map((r: any) =>
      header.map((h) => String(r[h] ?? '').replace(/\"/g, '""')).join(',')
    );

    const csv = [header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="clients.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Error export clients:', error);
    res.status(500).json({ mensaje: 'Error al exportar clientes' });
  }
});

// ==========================================
// REPORTES / QUEJAS
// ==========================================
app.post('/api/reportes', async (req, res) => {
  try {
    const { categoria, descripcion, fotos, fk_usuario } = req.body;

    if (!categoria || !descripcion) {
      return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
    }

    // fotos: array de dataURLs o urls. Guardamos como JSON si existe.
    const fotosJson = fotos && Array.isArray(fotos) ? JSON.stringify(fotos) : null;

    const [resultado]: any = await database.execute(
      `
      INSERT INTO reportes (
        fk_usuario,
        categoria,
        descripcion,
        fotos,
        fecha
      )
      VALUES (?, ?, ?, ?, GETDATE())
      `,
      [fk_usuario || null, categoria, descripcion, fotosJson]
    );

    return res.status(201).json({ mensaje: 'Reporte enviado correctamente', resultado });
  } catch (error: any) {
    console.error('Error al crear reporte:', error);
    return res.status(500).json({ mensaje: 'Error al enviar el reporte', detalle: error.message });
  }
});

// ==========================================
// CATEGORÍAS Y ASOCIACION CON EMPLEADO
// ==========================================
/*app.get("/api/empleados/:id/categorias", async (req, res) => {
  try {
    const idEmpleado = Number(req.params.id);

    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      return res.status(400).json({
        mensaje: "ID de empleado inválido",
      });
    }

    const [empleados]: any = await database.execute(
      `
      SELECT id_empleado
      FROM empleados
      WHERE id_empleado = ?
      `,
      [idEmpleado]
    );

    if (empleados.length === 0) {
      return res.status(404).json({
        mensaje: "Empleado no encontrado",
      });
    }

    const [categorias]: any = await database.execute(
      `
      SELECT
        c.id_categoria,
        c.nombre
      FROM empleado_categorias ec
      INNER JOIN categorias c
        ON c.id_categoria = ec.id_categoria
      WHERE ec.id_empleado = ?
      ORDER BY c.nombre ASC
      `,
      [idEmpleado]
    );

    return res.status(200).json({
      idEmpleado,
      categorias,
    });
  } catch (error) {
    console.error("Error al consultar categorías del empleado:", error);

    return res.status(500).json({
      mensaje: "Error interno del servidor",
    });
  }
});*/

// ==========================================
// OBTENER CATEGORÍAS DE UN EMPLEADO
// ==========================================
app.get(
  "/api/empleados/:idEmpleado/categorias",
  async (req, res) => {
    try {
      const idEmpleado = Number(
        req.params.idEmpleado
      );

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: "ID de empleado inválido",
        });
      }

      const respuesta: any =
        await database.query(`
          SELECT
            c.id_categoria,
            c.nombre
          FROM empleado_categorias ec
          INNER JOIN categorias c
            ON c.id_categoria = ec.id_categoria
          WHERE ec.id_empleado = ${idEmpleado}
          ORDER BY c.nombre ASC
        `);

      let categorias: any[] = [];

      if (
        Array.isArray(respuesta?.recordset)
      ) {
        categorias = respuesta.recordset;
      } else if (
        Array.isArray(
          respuesta?.recordsets?.[0]
        )
      ) {
        categorias =
          respuesta.recordsets[0];
      } else if (
        Array.isArray(respuesta?.[0])
      ) {
        categorias = respuesta[0];
      } else if (
        Array.isArray(respuesta?.rows)
      ) {
        categorias = respuesta.rows;
      } else if (
        Array.isArray(respuesta)
      ) {
        categorias = respuesta;
      }

      return res.status(200).json({
        idEmpleado,
        categorias,
      });
    } catch (error: any) {
      console.error(
        "Error al consultar categorías del empleado:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error al consultar las categorías del empleado",
        detalle:
          error?.message ||
          "Error desconocido",
      });
    }
  }
);



app.post("/api/empleados/:id/categorias", async (req, res) => {
  try {
    const idEmpleado = Number(req.params.id);
    const idCategoria = Number(req.body.idCategoria);

    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      return res.status(400).json({
        mensaje: "ID de empleado inválido",
      });
    }

    if (!Number.isInteger(idCategoria) || idCategoria <= 0) {
      return res.status(400).json({
        mensaje: "ID de categoría inválido",
      });
    }

    const [empleados]: any = await database.execute(
      `
      SELECT id_empleado
      FROM empleados
      WHERE id_empleado = ?
      LIMIT 1
      `,
      [idEmpleado]
    );

    if (empleados.length === 0) {
      return res.status(404).json({
        mensaje: "Empleado no encontrado",
      });
    }

    const [categorias]: any = await database.execute(
      `
      SELECT id_categoria
      FROM categorias
      WHERE id_categoria = ?
      LIMIT 1
      `,
      [idCategoria]
    );

    if (categorias.length === 0) {
      return res.status(404).json({
        mensaje: "Categoría no encontrada",
      });
    }

    const [resultado]: any = await database.execute(
      `
      INSERT INTO empleado_categorias (
        id_empleado,
        id_categoria
      )
      VALUES (?, ?)
      `,
      [idEmpleado, idCategoria]
    );

    return res.status(201).json({
      mensaje: "Categoría agregada correctamente",
      relacion: {
        id_empleado_categoria: resultado.insertId,
        idEmpleado,
        idCategoria,
      },
    });
  } catch (error: any) {
    console.error("Error al agregar categoría:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        mensaje: "El empleado ya tiene esa categoría",
      });
    }

    return res.status(500).json({
      mensaje: "Error interno del servidor",
    });
  }
});

app.delete(
  "/api/empleados/:idEmpleado/categorias/:idCategoria",
  async (req, res) => {
    try {
      const idEmpleado = Number(req.params.idEmpleado);
      const idCategoria = Number(req.params.idCategoria);

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0 ||
        !Number.isInteger(idCategoria) ||
        idCategoria <= 0
      ) {
        return res.status(400).json({
          mensaje: "Identificadores inválidos",
        });
      }

      const [resultado]: any = await database.execute(
        `
        DELETE FROM empleado_categorias
        WHERE id_empleado = ?
          AND id_categoria = ?
        `,
        [idEmpleado, idCategoria]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          mensaje: "La categoría no está asignada al empleado",
        });
      }

      return res.status(200).json({
        mensaje: "Categoría eliminada correctamente",
      });
    } catch (error) {
      console.error("Error al eliminar categoría:", error);

      return res.status(500).json({
        mensaje: "Error interno del servidor",
      });
    }
  }
);

// ==========================================
// RUTA PARA ACTUALIZAR DISPONIBILIDAD (WORKER)
// ==========================================
app.patch('/api/workers/:id/disponibilidad', async (req, res) => {
  const { id } = req.params;
  const { disponible, idEmpleado } = req.body;

  try {
    const valorDisponible =
      disponible === true ||
      disponible === 'true' ||
      disponible === 1 ||
      disponible === '1';

    const idParaActualizar = Number(idEmpleado ?? id);
   const nuevoEstado = valorDisponible
    ? 'Disponible'
    : 'Ocupado';

    if (!Number.isInteger(idParaActualizar) || idParaActualizar <= 0) {
      return res.status(400).json({ mensaje: 'ID de empleado inválido' });
    }

    const [resultado]: any = await database.execute(
      "UPDATE empleados SET estado = ? WHERE id_empleado = ?",
      [nuevoEstado, idParaActualizar]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Trabajador no encontrado" });
    }

    res.json({
      mensaje: "Disponibilidad actualizada correctamente",
      nuevoEstado,
      disponible: valorDisponible,
    });
  } catch (error) {
    console.error("Error al actualizar disponibilidad:", error);
    res.status(500).json({
      mensaje: "Error interno al actualizar disponibilidad"
    });
  }
});   


// ==========================================
// ENVIAR MENSAJE
// ==========================================
/*app.post("/api/chat", async (req, res) => {
  try {
    const {
      fk_cliente,
      fk_empleado,
      remitente,
      mensaje,
    } = req.body;

    const idCliente = Number(fk_cliente);
    const idEmpleado = Number(fk_empleado);
    const textoMensaje = String(mensaje ?? "").trim();

    if (!Number.isInteger(idCliente) || idCliente <= 0) {
      return res.status(400).json({
        mensaje: "ID de cliente inválido",
      });
    }

    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      return res.status(400).json({
        mensaje: "ID de empleado inválido",
      });
    }

    if (
      remitente !== "cliente" &&
      remitente !== "empleado"
    ) {
      return res.status(400).json({
        mensaje: "Remitente inválido",
      });
    }

    if (!textoMensaje) {
      return res.status(400).json({
        mensaje: "El mensaje no puede estar vacío",
      });
    }

    const [conversaciones]: any = await database.execute(
      `
      SELECT id_conversacion
      FROM chat_conversaciones
      WHERE id_cliente = ? AND id_empleado = ?
      `,
      [idCliente, idEmpleado]
    );

    let idConversacion = conversaciones[0]?.id_conversacion;

    if (!idConversacion) {
      const [resultadoConversacion]: any = await database.execute(
        `
        INSERT INTO chat_conversaciones
        (id_cliente, id_empleado, fecha_creacion)
        VALUES (?, ?, GETDATE())
        `,
        [idCliente, idEmpleado]
      );
      idConversacion = resultadoConversacion.insertId;
    }

    const [resultadoMensaje]: any = await database.execute(
      `
      INSERT INTO chat_mensajes
      (id_conversacion, remitente, mensaje, fecha)
      VALUES (?, ?, ?, GETDATE())
      `,
      [
        idConversacion,
        remitente === "empleado" ? "EMPLEADO" : "CLIENTE",
        textoMensaje,
      ]
    );

    return res.status(201).json({
      mensaje: "Mensaje enviado correctamente",
      chat: {
        id_chat: resultadoMensaje.insertId,
        fk_cliente: idCliente,
        fk_empleado: idEmpleado,
        remitente,
        mensaje: textoMensaje,
      },
    });
  } catch (error: any) {
    console.error("Error al enviar mensaje:", error);

    return res.status(500).json({
      mensaje: "Error al enviar el mensaje",
      detalle: error.message,
      codigo: error.code,
    });
  }
});*/

app.post("/api/chat", async (req, res) => {
  try {
    const {
      fk_cliente,
      fk_empleado,
      remitente,
      mensaje,
    } = req.body;

    const idCliente = Number(fk_cliente);
    const idEmpleado = Number(fk_empleado);
    const textoMensaje = String(
      mensaje ?? ""
    ).trim();

    if (
      !Number.isInteger(idCliente) ||
      idCliente <= 0
    ) {
      return res.status(400).json({
        mensaje: "ID de cliente inválido",
      });
    }

    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      return res.status(400).json({
        mensaje: "ID de empleado inválido",
      });
    }

    if (
      remitente !== "cliente" &&
      remitente !== "empleado"
    ) {
      return res.status(400).json({
        mensaje: "Remitente inválido",
      });
    }

    if (!textoMensaje) {
      return res.status(400).json({
        mensaje:
          "El mensaje no puede estar vacío",
      });
    }

    const respuestaConversacion: any =
      await database.query(`
        SELECT TOP 1
          id_conversacion
        FROM chat_conversaciones
        WHERE id_cliente = ${idCliente}
          AND id_empleado = ${idEmpleado}
      `);

    let conversaciones: any[] = [];

    if (
      Array.isArray(
        respuestaConversacion?.recordset
      )
    ) {
      conversaciones =
        respuestaConversacion.recordset;
    } else if (
      Array.isArray(
        respuestaConversacion
          ?.recordsets?.[0]
      )
    ) {
      conversaciones =
        respuestaConversacion.recordsets[0];
    } else if (
      Array.isArray(
        respuestaConversacion?.[0]
      )
    ) {
      conversaciones =
        respuestaConversacion[0];
    } else if (
      Array.isArray(
        respuestaConversacion?.rows
      )
    ) {
      conversaciones =
        respuestaConversacion.rows;
    }

    let idConversacion = Number(
      conversaciones[0]?.id_conversacion
    );

    if (
      !Number.isInteger(idConversacion) ||
      idConversacion <= 0
    ) {
      const respuestaNuevaConversacion: any =
        await database.query(`
          INSERT INTO chat_conversaciones
          (
            id_cliente,
            id_empleado,
            fecha_creacion
          )
          OUTPUT INSERTED.id_conversacion
          VALUES
          (
            ${idCliente},
            ${idEmpleado},
            GETDATE()
          )
        `);

      let nuevaConversacion: any[] = [];

      if (
        Array.isArray(
          respuestaNuevaConversacion
            ?.recordset
        )
      ) {
        nuevaConversacion =
          respuestaNuevaConversacion
            .recordset;
      } else if (
        Array.isArray(
          respuestaNuevaConversacion
            ?.recordsets?.[0]
        )
      ) {
        nuevaConversacion =
          respuestaNuevaConversacion
            .recordsets[0];
      } else if (
        Array.isArray(
          respuestaNuevaConversacion?.[0]
        )
      ) {
        nuevaConversacion =
          respuestaNuevaConversacion[0];
      }

      idConversacion = Number(
        nuevaConversacion[0]
          ?.id_conversacion
      );
    }

    if (
      !Number.isInteger(idConversacion) ||
      idConversacion <= 0
    ) {
      throw new Error(
        "No se pudo crear la conversación"
      );
    }

    const remitenteBD =
      remitente === "empleado"
        ? "EMPLEADO"
        : "CLIENTE";

    const respuestaMensaje: any =
      await database.execute(
        `
          INSERT INTO chat_mensajes
          (
            id_conversacion,
            remitente,
            mensaje,
            fecha,
            entregado,
            leido
          )
          OUTPUT
            INSERTED.id_mensaje,
            INSERTED.fecha,
            INSERTED.entregado,
            INSERTED.leido
          VALUES
          (
            ?,
            ?,
            ?,
            GETDATE(),
            0,
            0
          )
        `,
        [
          idConversacion,
          remitenteBD,
          textoMensaje,
        ]
      );

    let mensajesInsertados: any[] = [];

    if (
      Array.isArray(
        respuestaMensaje?.recordset
      )
    ) {
      mensajesInsertados =
        respuestaMensaje.recordset;
    } else if (
      Array.isArray(
        respuestaMensaje
          ?.recordsets?.[0]
      )
    ) {
      mensajesInsertados =
        respuestaMensaje.recordsets[0];
    } else if (
      Array.isArray(
        respuestaMensaje?.[0]
      )
    ) {
      mensajesInsertados =
        respuestaMensaje[0];
    } else if (
      Array.isArray(
        respuestaMensaje?.rows
      )
    ) {
      mensajesInsertados =
        respuestaMensaje.rows;
    }

    const mensajeInsertado =
      mensajesInsertados[0] ?? {};

    return res.status(201).json({
      mensaje:
        "Mensaje enviado correctamente",
      chat: {
        id_chat: Number(
          mensajeInsertado.id_mensaje
        ),
        fk_cliente: idCliente,
        fk_empleado: idEmpleado,
        remitente,
        mensaje: textoMensaje,
        entregado:
          mensajeInsertado.entregado ??
          false,
        leido:
          mensajeInsertado.leido ??
          false,
        fecha:
          mensajeInsertado.fecha ??
          new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error(
      "Error al enviar mensaje:",
      error
    );

    return res.status(500).json({
      mensaje:
        "Error al enviar el mensaje",
      detalle:
        error?.message ||
        String(error),
      codigo:
        error?.code ?? null,
    });
  }
});

// ==========================================
// ELIMINAR VARIAS CONVERSACIONES
// ==========================================
app.delete(
  "/api/chat/conversaciones",
  async (req, res) => {
    try {
      const {
        rol,
        idUsuario,
        contactos,
      } = req.body as {
        rol?: "client" | "worker";
        idUsuario?: number;
        contactos?: number[];
      };

      const usuarioId = Number(idUsuario);

      const idsContactos = Array.isArray(contactos)
        ? contactos
            .map((id) => Number(id))
            .filter(
              (id, indice, arreglo) =>
                Number.isInteger(id) &&
                id > 0 &&
                arreglo.indexOf(id) === indice
            )
        : [];

      if (
        rol !== "client" &&
        rol !== "worker"
      ) {
        return res.status(400).json({
          mensaje: "Rol de usuario inválido",
        });
      }

      if (
        !Number.isInteger(usuarioId) ||
        usuarioId <= 0
      ) {
        return res.status(400).json({
          mensaje: "ID de usuario inválido",
        });
      }

      if (idsContactos.length === 0) {
        return res.status(400).json({
          mensaje:
            "Debes seleccionar al menos una conversación",
        });
      }

      const listaIds = idsContactos.join(",");

      const condicion =
        rol === "client"
          ? `
            cc.id_cliente = ${usuarioId}
            AND cc.id_empleado IN (${listaIds})
          `
          : `
            cc.id_empleado = ${usuarioId}
            AND cc.id_cliente IN (${listaIds})
          `;

      const resultado: any =
        await database.query(`
          SET XACT_ABORT ON;

          BEGIN TRY
            BEGIN TRANSACTION;

            DELETE cm
            FROM chat_mensajes AS cm
            INNER JOIN chat_conversaciones AS cc
              ON cc.id_conversacion =
                 cm.id_conversacion
            WHERE ${condicion};

            DELETE cc
            FROM chat_conversaciones AS cc
            WHERE ${condicion};

            DECLARE @conversacionesEliminadas INT =
              @@ROWCOUNT;

            COMMIT TRANSACTION;

            SELECT
              @conversacionesEliminadas
                AS conversacionesEliminadas;
          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      const datos =
        resultado?.recordset?.[0] ??
        resultado?.recordsets?.[0]?.[0] ??
        null;

      return res.status(200).json({
        mensaje:
          "Conversaciones eliminadas correctamente",
        conversacionesEliminadas: Number(
          datos?.conversacionesEliminadas ?? 0
        ),
      });
    } catch (error: any) {
      console.error(
        "Error al eliminar conversaciones:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error al eliminar las conversaciones",
        detalle:
          error?.message ?? String(error),
      });
    }
  }
);



// ==========================================
// OBTENER MENSAJES ENTRE CLIENTE Y EMPLEADO
// ==========================================
/*app.get(
  '/api/chat/cliente/:idCliente/empleado/:idEmpleado',
  async (req, res) => {
    try {
      const idCliente = Number(req.params.idCliente);
      const idEmpleado = Number(req.params.idEmpleado);

      const [conversacion]: any = await database.execute(
        `
        SELECT id_conversacion
        FROM chat_conversaciones
        WHERE id_cliente = ? AND id_empleado = ?
        `,
        [idCliente, idEmpleado]
      );

      if (conversacion.length === 0) {
        return res.status(200).json([]);
      }

      const idConversacion = conversacion[0].id_conversacion;

      const [mensajes]: any = await database.execute(
        `
        SELECT
          id_mensaje AS id_chat,
          ? AS fk_cliente,
          ? AS fk_empleado,
          CASE remitente
            WHEN 'EMPLEADO' THEN 'empleado'
            ELSE 'cliente'
          END AS remitente,
          mensaje,
          0 AS leido,
          fecha
        FROM chat_mensajes
        WHERE id_conversacion = ?
        ORDER BY fecha ASC, id_mensaje ASC
        `,
        [idCliente, idEmpleado, idConversacion]
      );

      return res.status(200).json(mensajes);
    } catch (error: any) {
      return res.status(500).json({
        mensaje: 'Error al consultar los mensajes',
        detalle: error.message,
      });
    }
  }
);*/

// ==========================================
// OBTENER MENSAJES ENTRE CLIENTE Y EMPLEADO
// ==========================================
app.get(
  '/api/chat/cliente/:idCliente/empleado/:idEmpleado',
  async (req, res) => {
    try {
      const idCliente = Number(
        req.params.idCliente
      );

      const idEmpleado = Number(
        req.params.idEmpleado
      );

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'ID de cliente inválido',
        });
      }

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'ID de empleado inválido',
        });
      }

      const respuestaConversacion: any =
        await database.query(`
          SELECT TOP 1
            id_conversacion
          FROM chat_conversaciones
          WHERE id_cliente = ${idCliente}
            AND id_empleado = ${idEmpleado}
        `);

      let conversaciones: any[] = [];

      if (
        Array.isArray(
          respuestaConversacion?.recordset
        )
      ) {
        conversaciones =
          respuestaConversacion.recordset;
      } else if (
        Array.isArray(
          respuestaConversacion
            ?.recordsets?.[0]
        )
      ) {
        conversaciones =
          respuestaConversacion.recordsets[0];
      } else if (
        Array.isArray(
          respuestaConversacion?.[0]
        )
      ) {
        conversaciones =
          respuestaConversacion[0];
      } else if (
        Array.isArray(
          respuestaConversacion?.rows
        )
      ) {
        conversaciones =
          respuestaConversacion.rows;
      } else if (
        Array.isArray(
          respuestaConversacion
        )
      ) {
        conversaciones =
          respuestaConversacion;
      }

      if (conversaciones.length === 0) {
        return res.status(200).json([]);
      }

      const idConversacion = Number(
        conversaciones[0].id_conversacion
      );

      const respuestaMensajes: any =
      await database.query(`
        SELECT
          m.id_mensaje AS id_chat,
          ${idCliente} AS fk_cliente,
          ${idEmpleado} AS fk_empleado,
          CASE m.remitente
            WHEN 'EMPLEADO'
              THEN 'empleado'
            ELSE 'cliente'
          END AS remitente,
          m.mensaje,
          m.entregado,
          m.leido,
          m.fecha
        FROM chat_mensajes AS m
        WHERE m.id_conversacion =
          ${idConversacion}
        ORDER BY
          m.fecha ASC,
          m.id_mensaje ASC
      `);

      let mensajes: any[] = [];

      if (
        Array.isArray(
          respuestaMensajes?.recordset
        )
      ) {
        mensajes =
          respuestaMensajes.recordset;
      } else if (
        Array.isArray(
          respuestaMensajes
            ?.recordsets?.[0]
        )
      ) {
        mensajes =
          respuestaMensajes.recordsets[0];
      } else if (
        Array.isArray(
          respuestaMensajes?.[0]
        )
      ) {
        mensajes =
          respuestaMensajes[0];
      } else if (
        Array.isArray(
          respuestaMensajes?.rows
        )
      ) {
        mensajes =
          respuestaMensajes.rows;
      } else if (
        Array.isArray(
          respuestaMensajes
        )
      ) {
        mensajes =
          respuestaMensajes;
      }

      return res
        .status(200)
        .json(mensajes);
    } catch (error: any) {
      console.error(
        'Error al consultar los mensajes:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al consultar los mensajes',
        detalle:
          error?.message ||
          String(error),
        codigo:
          error?.code ?? null,
      });
    }
  }
);


// ==========================================
// CONVERSACIONES DE UN EMPLEADO
// ==========================================
// ==========================================
// CONVERSACIONES DE UN EMPLEADO
// ==========================================
app.get(
  "/api/chat/empleado/:idEmpleado/conversaciones",
  async (req, res) => {
    try {
      const idEmpleado = Number(
        req.params.idEmpleado
      );

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: "ID de empleado inválido",
        });
      }

      const respuesta: any =
        await database.query(`
          SELECT
            cc.id_cliente AS id,

            cl.nombre AS participantName,

            cl.foto_url AS participantAvatar,

            COALESCE(
              (
                SELECT TOP 1
                  cm.mensaje
                FROM chat_mensajes AS cm
                WHERE cm.id_conversacion =
                  cc.id_conversacion
                ORDER BY
                  cm.fecha DESC,
                  cm.id_mensaje DESC
              ),
              ''
            ) AS lastMessage,

            (
              SELECT TOP 1
                cm.fecha
              FROM chat_mensajes AS cm
              WHERE cm.id_conversacion =
                cc.id_conversacion
              ORDER BY
                cm.fecha DESC,
                cm.id_mensaje DESC
            ) AS lastMessageTime,

            (
              SELECT COUNT(*)
              FROM chat_mensajes AS cm
              WHERE cm.id_conversacion =
                cc.id_conversacion
                AND cm.remitente = 'CLIENTE'
                AND cm.leido = 0
            ) AS unreadCount,

            0 AS participantOnline

          FROM chat_conversaciones AS cc

          INNER JOIN clientes AS cl
            ON cl.id_cliente =
              cc.id_cliente

          WHERE cc.id_empleado =
            ${idEmpleado}

          ORDER BY
            lastMessageTime DESC,
            cc.id_conversacion DESC
        `);

      const conversaciones =
        Array.isArray(respuesta?.recordset)
          ? respuesta.recordset
          : Array.isArray(
                respuesta?.recordsets?.[0]
              )
            ? respuesta.recordsets[0]
            : Array.isArray(respuesta?.[0])
              ? respuesta[0]
              : Array.isArray(
                    respuesta?.rows
                  )
                ? respuesta.rows
                : Array.isArray(respuesta)
                  ? respuesta
                  : [];

      return res.status(200).json(
        conversaciones
      );
    } catch (error: any) {
      console.error(
        "Error al consultar conversaciones del empleado:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error al consultar las conversaciones",
        detalle:
          error?.message || String(error),
      });
    }
  }
);

// ==========================================
// CONVERSACIONES DE UN CLIENTE
// ==========================================
// ==========================================
// CONVERSACIONES DE UN CLIENTE
// ==========================================
app.get(
  "/api/chat/cliente/:idCliente/conversaciones",
  async (req, res) => {
    try {
      const idCliente = Number(
        req.params.idCliente
      );

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        return res.status(400).json({
          mensaje: "ID de cliente inválido",
        });
      }

      const respuesta: any =
        await database.query(`
          SELECT
            cc.id_empleado AS id,

            e.nombre AS participantName,

            e.foto_url AS participantAvatar,

            COALESCE(
              (
                SELECT TOP 1
                  cm.mensaje
                FROM chat_mensajes AS cm
                WHERE cm.id_conversacion =
                  cc.id_conversacion
                ORDER BY
                  cm.fecha DESC,
                  cm.id_mensaje DESC
              ),
              ''
            ) AS lastMessage,

            (
              SELECT TOP 1
                cm.fecha
              FROM chat_mensajes AS cm
              WHERE cm.id_conversacion =
                cc.id_conversacion
              ORDER BY
                cm.fecha DESC,
                cm.id_mensaje DESC
            ) AS lastMessageTime,

            (
              SELECT COUNT(*)
              FROM chat_mensajes AS cm
              WHERE cm.id_conversacion =
                cc.id_conversacion
                AND cm.remitente = 'EMPLEADO'
                AND cm.leido = 0
            ) AS unreadCount,

            CASE
              WHEN e.estado = 'Disponible'
                THEN 1
              ELSE 0
            END AS participantOnline

          FROM chat_conversaciones AS cc

          INNER JOIN empleados AS e
            ON e.id_empleado =
              cc.id_empleado

          WHERE cc.id_cliente =
            ${idCliente}

          ORDER BY
            lastMessageTime DESC,
            cc.id_conversacion DESC
        `);

      const conversaciones =
        Array.isArray(respuesta?.recordset)
          ? respuesta.recordset
          : Array.isArray(
                respuesta?.recordsets?.[0]
              )
            ? respuesta.recordsets[0]
            : Array.isArray(respuesta?.[0])
              ? respuesta[0]
              : Array.isArray(
                    respuesta?.rows
                  )
                ? respuesta.rows
                : Array.isArray(respuesta)
                  ? respuesta
                  : [];

      return res.status(200).json(
        conversaciones
      );
    } catch (error: any) {
      console.error(
        "Error al consultar conversaciones del cliente:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error al consultar las conversaciones",
        detalle:
          error?.message || String(error),
      });
    }
  }
);

// ==========================================
// MARCAR MENSAJES COMO LEÍDOS
// ==========================================
/*app.put("/api/chat/leidos", async (req, res) => {
  try {
    const {
      fk_cliente,
      fk_empleado,
      lector,
    } = req.body;

    const idCliente = Number(fk_cliente);
    const idEmpleado = Number(fk_empleado);

    if (
      !Number.isInteger(idCliente) ||
      idCliente <= 0 ||
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      return res.status(400).json({
        mensaje: "Datos inválidos",
      });
    }

    if (
      lector !== "cliente" &&
      lector !== "empleado"
    ) {
      return res.status(400).json({
        mensaje: "Lector inválido",
      });
    }

    return res.status(200).json({
      mensaje: "Mensajes marcados como leídos",
      actualizados: 0,
    });
  } catch (error: any) {
    console.error(
      "Error al marcar mensajes como leídos:",
      error
    );

    return res.status(500).json({
      mensaje: "Error al actualizar mensajes",
      detalle: error.message,
    });
  }
});*/

// ==========================================
// MARCAR MENSAJES COMO LEÍDOS
// ==========================================
app.put(
  '/api/chat/leidos',
  async (req, res) => {
    try {
      const {
        fk_cliente,
        fk_empleado,
        lector,
      } = req.body;

      const idCliente = Number(fk_cliente);
      const idEmpleado = Number(fk_empleado);

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de cliente inválido',
        });
      }

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de empleado inválido',
        });
      }

      if (
        lector !== 'cliente' &&
        lector !== 'empleado'
      ) {
        return res.status(400).json({
          mensaje: 'Lector inválido',
        });
      }

      const respuestaConversacion: any =
        await database.query(`
          SELECT TOP 1
            id_conversacion
          FROM chat_conversaciones
          WHERE id_cliente = ${idCliente}
            AND id_empleado = ${idEmpleado}
        `);

      let conversaciones: any[] = [];

      if (
        Array.isArray(
          respuestaConversacion?.recordset
        )
      ) {
        conversaciones =
          respuestaConversacion.recordset;
      } else if (
        Array.isArray(
          respuestaConversacion
            ?.recordsets?.[0]
        )
      ) {
        conversaciones =
          respuestaConversacion.recordsets[0];
      } else if (
        Array.isArray(
          respuestaConversacion?.[0]
        )
      ) {
        conversaciones =
          respuestaConversacion[0];
      } else if (
        Array.isArray(
          respuestaConversacion?.rows
        )
      ) {
        conversaciones =
          respuestaConversacion.rows;
      } else if (
        Array.isArray(
          respuestaConversacion
        )
      ) {
        conversaciones =
          respuestaConversacion;
      }

      if (conversaciones.length === 0) {
        return res.status(200).json({
          mensaje: 'No existe conversación',
          actualizados: 0,
        });
      }

      const idConversacion = Number(
        conversaciones[0].id_conversacion
      );

      const remitenteContrario =
        lector === 'empleado'
          ? 'CLIENTE'
          : 'EMPLEADO';

      const resultado: any =
        await database.query(`
          UPDATE chat_mensajes
          SET
            entregado = 1,
            leido = 1
          WHERE id_conversacion =
            ${idConversacion}
            AND remitente =
              '${remitenteContrario}'
            AND leido = 0
        `);

      return res.status(200).json({
        mensaje:
          'Mensajes marcados como leídos',
        actualizados:
          resultado?.rowsAffected?.[0] ?? 0,
      });
    } catch (error: any) {
      console.error(
        'Error al marcar mensajes como leídos:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al marcar mensajes como leídos',
        detalle:
          error?.message ||
          String(error),
        codigo:
          error?.code ?? null,
      });
    }
  }
);

// ==========================================
// POSTULACIONES DE UN EMPLEADO
// ==========================================
/*app.get(
  '/api/empleados/:idEmpleado/postulaciones',
  async (req, res) => {
    try {
      const idEmpleado = Number(
        req.params.idEmpleado
      );

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de empleado inválido',
        });
      }

      const [empleados]: any =
        await database.execute(
          `
          SELECT id_empleado
          FROM empleados
          WHERE id_empleado = ?
          LIMIT 1
          `,
          [idEmpleado]
        );

      if (empleados.length === 0) {
        return res.status(404).json({
          mensaje: 'El empleado no existe',
        });
      }

      const [postulaciones]: any =
        await database.execute(
          `
          SELECT
            id_postulacion,
            fk_servicio,
            fk_empleado,
            estado,
            fecha
          FROM postulaciones
          WHERE fk_empleado = ?
          ORDER BY fecha DESC
          `,
          [idEmpleado]
        );

      return res.status(200).json(
        postulaciones
      );
    } catch (error: any) {
      console.error(
        'Error al obtener postulaciones del empleado:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al obtener las postulaciones del empleado',
        detalle: error.message,
      });
    }
  }
);*/
// ==========================================
// POSTULACIONES DE UN EMPLEADO
// ==========================================
app.get(
  '/api/empleados/:idEmpleado/postulaciones',
  async (req, res) => {
    try {
      const idEmpleado = Number(
        req.params.idEmpleado
      );

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de empleado inválido',
        });
      }

      // Comprobar que el empleado existe.
      const respuestaEmpleado: any =
        await database.query(`
          SELECT TOP 1
            id_empleado
          FROM empleados
          WHERE id_empleado = ${idEmpleado}
        `);

      let empleados: any[] = [];

      if (
        Array.isArray(
          respuestaEmpleado?.recordset
        )
      ) {
        empleados =
          respuestaEmpleado.recordset;
      } else if (
        Array.isArray(
          respuestaEmpleado?.recordsets?.[0]
        )
      ) {
        empleados =
          respuestaEmpleado.recordsets[0];
      } else if (
        Array.isArray(
          respuestaEmpleado?.[0]
        )
      ) {
        empleados =
          respuestaEmpleado[0];
      } else if (
        Array.isArray(
          respuestaEmpleado?.rows
        )
      ) {
        empleados =
          respuestaEmpleado.rows;
      } else if (
        Array.isArray(respuestaEmpleado)
      ) {
        empleados = respuestaEmpleado;
      }

      if (empleados.length === 0) {
        return res.status(404).json({
          mensaje: 'El empleado no existe',
        });
      }

      // Obtener las postulaciones guardadas.
      const respuestaPostulaciones: any =
        await database.query(`
          SELECT
            id_postulacion,
            fk_servicio,
            fk_empleado,
            tipo_postulacion,
            estado_negociacion,
            estado,
            fecha
          FROM postulaciones
          WHERE fk_empleado = ${idEmpleado}
          ORDER BY fecha DESC
        `);

      let postulaciones: any[] = [];

      if (
        Array.isArray(
          respuestaPostulaciones?.recordset
        )
      ) {
        postulaciones =
          respuestaPostulaciones.recordset;
      } else if (
        Array.isArray(
          respuestaPostulaciones?.recordsets?.[0]
        )
      ) {
        postulaciones =
          respuestaPostulaciones.recordsets[0];
      } else if (
        Array.isArray(
          respuestaPostulaciones?.[0]
        )
      ) {
        postulaciones =
          respuestaPostulaciones[0];
      } else if (
        Array.isArray(
          respuestaPostulaciones?.rows
        )
      ) {
        postulaciones =
          respuestaPostulaciones.rows;
      } else if (
        Array.isArray(
          respuestaPostulaciones
        )
      ) {
        postulaciones =
          respuestaPostulaciones;
      }

      return res.status(200).json({
        idEmpleado,
        postulaciones,
      });
    } catch (error: any) {
      console.error(
        'Error al obtener postulaciones del empleado:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al obtener las postulaciones del empleado',
        detalle:
          error?.message ||
          String(error),
      });
    }
  }
);

// ==========================================
// SERVICIOS POSTULACIONES DE EMPLEADOS RECIBIDAS
// ==========================================
/*app.get(
  '/api/servicios/:idServicio/postulaciones',
  async (req, res) => {
    try {
      const idServicio = Number(
        req.params.idServicio
      );

      if (
        !Number.isInteger(idServicio) ||
        idServicio <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de servicio inválido',
        });
      }

      const [servicios]: any =
        await database.execute(
          `
          SELECT
            s.id_servicio,
            s.fk_cliente,
            s.fk_categoria,
            s.fk_empleado,
            s.fk_evidencia,
            s.titulo,
            s.descripcion,
            s.direccion,
            s.presupuesto,
            s.fecha,
            s.hora_inicio,
            s.hora_fin,
            s.estado,
            c.nombre_C AS nombre_cliente,
            c.foto AS foto_cliente,
            cat.nombre AS nombre_categoria
          FROM servicios s
          LEFT JOIN clientes c
            ON c.id_cliente = s.fk_cliente
          LEFT JOIN categorias cat
            ON cat.id_categoria = s.fk_categoria
          WHERE s.id_servicio = ?
          LIMIT 1
          `,
          [idServicio]
        );

      if (servicios.length === 0) {
        return res.status(404).json({
          mensaje: 'El servicio no existe',
        });
      }

      const [postulaciones]: any =
        await database.execute(
          `
          SELECT
            p.id_postulacion,
            p.fk_servicio,
            p.fk_empleado,
            p.estado AS estado_postulacion,
            p.fecha AS fecha_postulacion,

            e.id_empleado,
            e.nombre_E,
            e.correo,
            NULL AS celular,
            e.titulo,
            e.direccion,
            e.estado AS estado_empleado,
            0 AS N_trabajos

          FROM postulaciones p

          INNER JOIN empleados e
            ON e.id_empleado = p.fk_empleado

          WHERE p.fk_servicio = ?

          ORDER BY p.fecha DESC
          `,
          [idServicio]
        );

      return res.status(200).json({
        servicio: servicios[0],
        postulaciones,
      });
    } catch (error: any) {
      console.error(
        'Error al obtener postulaciones:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al obtener las postulaciones',
        detalle: error.message,
      });
    }
  }
);*/

// ==========================================
// SERVICIOS POSTULACIONES DE EMPLEADOS RECIBIDAS
// ==========================================
/*app.get(
  '/api/servicios/:idServicio/postulaciones',
  async (req, res) => {
    try {
      const idServicio = Number(
        req.params.idServicio
      );

      if (
        !Number.isInteger(idServicio) ||
        idServicio <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de servicio inválido',
        });
      }

      const [servicios]: any =
        await database.execute(
          `
          SELECT
            s.id_servicio,
            s.fk_cliente,
            s.fk_categoria,
            s.fk_empleado,
            s.fk_evidencia,
            s.titulo,
            s.descripcion,
            s.direccion,
            s.presupuesto,
            s.fecha,
            s.hora_inicio,
            s.hora_fin,
            s.estado,
            c.nombre_C AS nombre_cliente,
            c.foto AS foto_cliente,
            cat.nombre AS nombre_categoria
          FROM servicios s
          LEFT JOIN clientes c
            ON c.id_cliente = s.fk_cliente
          LEFT JOIN categorias cat
            ON cat.id_categoria = s.fk_categoria
          WHERE s.id_servicio = ?
          LIMIT 1
          `,
          [idServicio]
        );

        console.log('ID recibido:', idServicio);
        console.log('Servicio encontrado:', servicios);
        
      if (
        !Array.isArray(servicios) ||
        servicios.length === 0
      ) {
        return res.status(404).json({
          mensaje: 'El servicio no existe',
        });
      }

      const [postulaciones]: any =
        await database.execute(
          `
          SELECT
            p.id_postulacion,
            p.fk_servicio,
            p.fk_empleado,
            p.estado AS estado_postulacion,
            p.fecha AS fecha_postulacion,
            e.id_empleado,
            e.nombre_E,
            e.correo,
            e.titulo,
            e.direccion,
            e.estado AS estado_empleado
          FROM postulaciones p
          INNER JOIN empleados e
            ON e.id_empleado = p.fk_empleado
          WHERE p.fk_servicio = ?
          ORDER BY p.fecha DESC
          `,
          [idServicio]
        );

      return res.status(200).json({
        servicio: servicios[0],
        postulaciones: Array.isArray(
          postulaciones
        )
          ? postulaciones
          : [],
      });
    } catch (error: any) {
      console.error(
        'Error al obtener postulaciones:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al obtener las postulaciones',
        detalle:
          error?.message ||
          'Error desconocido',
      });
    }
  }
);*/

// ==========================================
// SERVICIOS POSTULACIONES DE EMPLEADOS RECIBIDAS
// ==========================================
app.get(
  '/api/servicios/:idServicio/postulaciones',
  async (req, res) => {
    try {
      const idServicio = Number(
        req.params.idServicio
      );

      if (
        !Number.isInteger(idServicio) ||
        idServicio <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de servicio inválido',
        });
      }

      // ======================================
      // OBTENER EL SERVICIO
      // ======================================
      const respuestaServicio: any =
        await database.query(`
          SELECT TOP 1
            s.id_servicio,

            COALESCE(
              s.fk_cliente,
              s.id_cliente
            ) AS fk_cliente,

            COALESCE(
              s.fk_categoria,
              s.id_categoria
            ) AS fk_categoria,

            s.fk_empleado,
            s.fk_evidencia,
            s.titulo,
            s.descripcion,
            s.direccion,
            s.presupuesto,
            s.fecha,
            s.hora_inicio,
            s.hora_fin,
            s.estado,

            c.nombre AS nombre_cliente,
            c.foto_url AS foto_cliente,

            cat.nombre AS nombre_categoria

          FROM servicios AS s

          LEFT JOIN clientes AS c
            ON c.id_cliente = COALESCE(
              s.fk_cliente,
              s.id_cliente
            )

          LEFT JOIN categorias AS cat
            ON cat.id_categoria = COALESCE(
              s.fk_categoria,
              s.id_categoria
            )

          WHERE s.id_servicio = ${idServicio}
        `);

      let servicios: any[] = [];

      if (
        Array.isArray(
          respuestaServicio?.recordset
        )
      ) {
        servicios =
          respuestaServicio.recordset;
      } else if (
        Array.isArray(
          respuestaServicio?.recordsets?.[0]
        )
      ) {
        servicios =
          respuestaServicio.recordsets[0];
      } else if (
        Array.isArray(
          respuestaServicio?.[0]
        )
      ) {
        servicios =
          respuestaServicio[0];
      } else if (
        Array.isArray(
          respuestaServicio?.rows
        )
      ) {
        servicios =
          respuestaServicio.rows;
      } else if (
        Array.isArray(respuestaServicio)
      ) {
        servicios =
          respuestaServicio;
      }

      if (servicios.length === 0) {
        return res.status(404).json({
          mensaje: 'El servicio no existe',
          idServicio,
        });
      }

      // ======================================
      // OBTENER LAS POSTULACIONES
      // ======================================
      const respuestaPostulaciones: any =
        await database.query(`
          SELECT
            p.id_postulacion,
            p.fk_servicio,
            p.fk_empleado,
            p.tipo_postulacion,
            p.estado_negociacion,
            p.estado AS estado_postulacion,
            p.fecha AS fecha_postulacion,

            e.id_empleado,
            e.nombre AS nombre_E,
            e.correo,
            e.telefono AS celular,
            e.titulo,
            e.direccion,
            e.estado AS estado_empleado,

            (
              SELECT COUNT(*)
              FROM servicios AS trabajos
              WHERE trabajos.fk_empleado =
                    e.id_empleado
                AND LOWER(
                  LTRIM(
                    RTRIM(
                      COALESCE(
                        trabajos.estado,
                        ''
                      )
                    )
                  )
                ) IN (
                  'completado',
                  'completada',
                  'completed'
                )
            ) AS N_trabajos,

            e.sobre_mi,
            e.foto_url AS foto

          FROM postulaciones AS p

          INNER JOIN empleados AS e
            ON e.id_empleado =
               p.fk_empleado

          WHERE p.fk_servicio =
                ${idServicio}

          ORDER BY
            p.fecha DESC,
            p.id_postulacion DESC
        `);

      let postulaciones: any[] = [];

      if (
        Array.isArray(
          respuestaPostulaciones?.recordset
        )
      ) {
        postulaciones =
          respuestaPostulaciones.recordset;
      } else if (
        Array.isArray(
          respuestaPostulaciones
            ?.recordsets?.[0]
        )
      ) {
        postulaciones =
          respuestaPostulaciones
            .recordsets[0];
      } else if (
        Array.isArray(
          respuestaPostulaciones?.[0]
        )
      ) {
        postulaciones =
          respuestaPostulaciones[0];
      } else if (
        Array.isArray(
          respuestaPostulaciones?.rows
        )
      ) {
        postulaciones =
          respuestaPostulaciones.rows;
      } else if (
        Array.isArray(
          respuestaPostulaciones
        )
      ) {
        postulaciones =
          respuestaPostulaciones;
      }

      return res.status(200).json({
        servicio: servicios[0],
        postulaciones,
      });
    } catch (error: any) {
      console.error(
        'Error al obtener postulaciones:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al obtener las postulaciones',
        detalle:
          error?.message ||
          String(error),
      });
    }
  }
);

// ==========================================
//  SERVICIOS ACEPTADOS 
// ==========================================

/*app.put(
  '/api/servicios/:idServicio/aceptar',
  async (req, res) => {
    const conexion =
      await database.getConnection();

    try {
      const idServicio = Number(
        req.params.idServicio
      );

      const idEmpleado = Number(
        req.body.fk_empleado
      );

      if (
        !Number.isInteger(idServicio) ||
        idServicio <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de servicio inválido',
        });
      }

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de empleado inválido',
        });
      }

      await conexion.beginTransaction();

      const [servicios]: any =
        await conexion.execute(
          `
          SELECT
            id_servicio,
            estado
          FROM servicios
          WHERE id_servicio = ?
          FOR UPDATE
          `,
          [idServicio]
        );

      if (servicios.length === 0) {
        await conexion.rollback();

        return res.status(404).json({
          mensaje: 'El servicio no existe',
        });
      }

      if (
        servicios[0].estado !== 'Pendiente'
      ) {
        await conexion.rollback();

        return res.status(400).json({
          mensaje:
            'Este servicio ya fue asignado',
        });
      }

      const [postulaciones]: any =
        await conexion.execute(
          `
          SELECT id_postulacion
          FROM postulaciones
          WHERE fk_servicio = ?
            AND fk_empleado = ?
          LIMIT 1
          `,
          [
            idServicio,
            idEmpleado,
          ]
        );

      if (postulaciones.length === 0) {
        await conexion.rollback();

        return res.status(404).json({
          mensaje:
            'El empleado no está postulado a este servicio',
        });
      }

      const [resultado]: any =
        await conexion.execute(
          `
          UPDATE servicios
          SET
            fk_empleado = ?,
            estado = 'Asignado'
          WHERE id_servicio = ?
            AND estado = 'Pendiente'
          `,
          [
            idEmpleado,
            idServicio,
          ]
        );

      if (resultado.affectedRows === 0) {
        await conexion.rollback();

        return res.status(409).json({
          mensaje:
            'El servicio ya fue asignado',
        });
      }

      await conexion.execute(
        `
        UPDATE postulaciones
        SET estado =
          CASE
            WHEN fk_empleado = ?
              THEN 'aceptada'
            ELSE 'rechazada'
          END
        WHERE fk_servicio = ?
        `,
        [
          idEmpleado,
          idServicio,
        ]
      );

      await conexion.commit();

      return res.status(200).json({
        mensaje:
          'Empleado seleccionado correctamente',
        id_servicio: idServicio,
        fk_empleado: idEmpleado,
      });
    } catch (error: any) {
      await conexion.rollback();

      console.error(
        'Error al seleccionar empleado:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al seleccionar al empleado',
        detalle: error.message,
      });
    } finally {
      conexion.release();
    }
  }
);*/

// ==========================================
// ACEPTAR EMPLEADO PARA UN SERVICIO
// Y NOTIFICAR AL EMPLEADO
// ==========================================
app.put(
  '/api/servicios/:idServicio/aceptar',
  async (req, res) => {
    try {
      const idServicio = Number(
        req.params.idServicio
      );

      const idEmpleado = Number(
        req.body?.fk_empleado
      );

      if (
        !Number.isInteger(idServicio) ||
        idServicio <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de servicio inválido',
        });
      }

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de empleado inválido',
        });
      }

      const respuesta: any =
        await database.query(`
          SET XACT_ABORT ON;

          BEGIN TRY
            BEGIN TRANSACTION;

            IF NOT EXISTS (
              SELECT 1
              FROM servicios
              WHERE id_servicio = ${idServicio}
            )
            BEGIN
              THROW 50001,
                'El servicio no existe',
                1;
            END;

            IF EXISTS (
              SELECT 1
              FROM servicios
              WHERE id_servicio = ${idServicio}
                AND LOWER(
                  LTRIM(
                    RTRIM(
                      COALESCE(estado, '')
                    )
                  )
                ) <> 'pendiente'
            )
            BEGIN
              THROW 50002,
                'Este servicio ya fue asignado',
                1;
            END;

            IF NOT EXISTS (
              SELECT 1
              FROM postulaciones
              WHERE fk_servicio = ${idServicio}
                AND fk_empleado = ${idEmpleado}
                AND LOWER(
                  LTRIM(
                    RTRIM(
                      COALESCE(estado, '')
                    )
                  )
                ) = 'pendiente'
            )
            BEGIN
              THROW 50003,
                'El empleado no tiene una postulación pendiente',
                1;
            END;

            UPDATE servicios
            SET
              fk_empleado = ${idEmpleado},
              estado = 'En proceso'
            WHERE id_servicio = ${idServicio}
              AND LOWER(
                LTRIM(
                  RTRIM(
                    COALESCE(estado, '')
                  )
                )
              ) = 'pendiente';

            UPDATE postulaciones
            SET estado =
              CASE
                WHEN fk_empleado = ${idEmpleado}
                  THEN 'aceptada'
                ELSE 'rechazada'
              END
            WHERE fk_servicio = ${idServicio};

            UPDATE empleados
            SET estado = 'Ocupado'
            WHERE id_empleado = ${idEmpleado};

            -- Crear reserva solo si todavía no existe.
            IF NOT EXISTS (
              SELECT 1
              FROM reservas
              WHERE id_servicio = ${idServicio}
            )
            BEGIN
              INSERT INTO reservas (
                id_servicio,
                id_empleado,
                descripcion,
                fecha,
                hora,
                fecha_creacion
              )
              SELECT
                id_servicio,
                ${idEmpleado},
                COALESCE(
                  NULLIF(
                    LTRIM(
                      RTRIM(titulo)
                    ),
                    ''
                  ),
                  NULLIF(
                    LTRIM(
                      RTRIM(descripcion)
                    ),
                    ''
                  ),
                  'Trabajo aceptado'
                ),
                fecha,
                hora_inicio,
                GETDATE()
              FROM servicios
              WHERE id_servicio = ${idServicio};
            END;

            -- Crear notificación solo si todavía no existe.
            IF NOT EXISTS (
              SELECT 1
              FROM notificaciones
              WHERE id_empleado = ${idEmpleado}
                AND fk_servicio = ${idServicio}
                AND tipo = 'postulacion_aceptada'
            )
            BEGIN
              INSERT INTO notificaciones (
                id_cliente,
                id_empleado,
                titulo,
                descripcion,
                tipo,
                leida,
                fecha,
                fk_servicio
              )
              SELECT
                NULL,
                ${idEmpleado},
                '¡Postulación aceptada!',
                CONCAT(
                  'Has sido seleccionado para realizar el trabajo "',
                  COALESCE(
                    NULLIF(
                      LTRIM(
                        RTRIM(titulo)
                      ),
                      ''
                    ),
                    NULLIF(
                      LTRIM(
                        RTRIM(descripcion)
                      ),
                      ''
                    ),
                    'Servicio'
                  ),
                  '".'
                ),
                'postulacion_aceptada',
                0,
                GETDATE(),
                id_servicio
              FROM servicios
              WHERE id_servicio = ${idServicio};
            END;

            COMMIT TRANSACTION;

            SELECT
              s.id_servicio,
              s.fk_empleado,
              s.estado,
              p.id_postulacion,
              p.estado AS estado_postulacion,
              n.id_notificacion,
              n.titulo AS titulo_notificacion,
              n.descripcion AS descripcion_notificacion
            FROM servicios AS s

            LEFT JOIN postulaciones AS p
              ON p.fk_servicio =
                s.id_servicio
              AND p.fk_empleado =
                ${idEmpleado}

            LEFT JOIN notificaciones AS n
              ON n.fk_servicio =
                s.id_servicio
              AND n.id_empleado =
                ${idEmpleado}
              AND n.tipo =
                'postulacion_aceptada'

            WHERE s.id_servicio =
              ${idServicio};

          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      const resultado =
        respuesta?.recordset ??
        respuesta?.recordsets?.[
          respuesta.recordsets.length - 1
        ] ??
        respuesta?.[0] ??
        [];

      console.log(
        'Empleado aceptado y notificado:',
        {
          idServicio,
          idEmpleado,
          resultado,
        }
      );

      return res.status(200).json({
        mensaje:
          'Empleado seleccionado correctamente',
        id_servicio: idServicio,
        fk_empleado: idEmpleado,
        resultado,
      });
    } catch (error: any) {
      console.error(
        'Error al seleccionar empleado:',
        error
      );

      const mensajeError = String(
        error?.message ||
          'Error al seleccionar al empleado'
      );

      if (
        mensajeError.includes(
          'El servicio no existe'
        )
      ) {
        return res.status(404).json({
          mensaje: 'El servicio no existe',
        });
      }

      if (
        mensajeError.includes(
          'Este servicio ya fue asignado'
        )
      ) {
        return res.status(409).json({
          mensaje:
            'Este servicio ya fue asignado',
        });
      }

      if (
        mensajeError.includes(
          'El empleado no tiene una postulación pendiente'
        )
      ) {
        return res.status(404).json({
          mensaje:
            'El empleado no tiene una postulación pendiente',
        });
      }

      return res.status(500).json({
        mensaje:
          'Error al seleccionar al empleado',
        detalle: mensajeError,
        numero: error?.number ?? null,
        codigo: error?.code ?? null,
      });
    }
  }
);

// ==========================================
// RECHAZAR POSTULACION (individual)
// ==========================================
/*app.put('/api/postulaciones/:idPostulacion/rechazar', async (req, res) => {
  try {
    const idPostulacion = Number(req.params.idPostulacion);

    if (!Number.isInteger(idPostulacion) || idPostulacion <= 0) {
      return res.status(400).json({ mensaje: 'ID de postulación inválido' });
    }

    const [resultado]: any = await database.execute(
      `
      UPDATE postulaciones
      SET estado = 'rechazada'
      WHERE id_postulacion = ?
      `,
      [idPostulacion]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Postulación no encontrada' });
    }

    return res.status(200).json({ mensaje: 'Postulación rechazada' });
  } catch (error: any) {
    console.error('Error al rechazar postulación:', error);
    return res.status(500).json({ mensaje: 'Error al rechazar la postulación', detalle: error.message });
  }
});*/

// ==========================================
// RECHAZAR UNA POSTULACIÓN
// ==========================================
app.put(
  '/api/postulaciones/:idPostulacion/rechazar',
  async (req, res) => {
    try {
      const idPostulacion = Number(
        req.params.idPostulacion
      );

      if (
        !Number.isInteger(idPostulacion) ||
        idPostulacion <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'ID de postulación inválido',
        });
      }

      const respuesta: any =
        await database.query(`
          UPDATE postulaciones
          SET estado = 'rechazada'
          WHERE id_postulacion =
                ${idPostulacion}
            AND LOWER(estado) = 'pendiente';

          SELECT @@ROWCOUNT AS actualizadas;
        `);

      const filas =
        respuesta?.recordset ??
        respuesta?.recordsets?.[
          respuesta.recordsets.length - 1
        ] ??
        respuesta?.[0] ??
        [];

      const actualizadas = Number(
        filas?.[0]?.actualizadas ?? 0
      );

      if (actualizadas === 0) {
        return res.status(404).json({
          mensaje:
            'La postulación no existe o ya fue respondida',
        });
      }

      return res.status(200).json({
        mensaje:
          'Postulación rechazada correctamente',
        id_postulacion: idPostulacion,
      });
    } catch (error: any) {
      console.error(
        'Error al rechazar postulación:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al rechazar la postulación',
        detalle:
          error?.message ||
          String(error),
      });
    }
  }
);

// ==========================================
// CAMBIAR ESTADO DEL SERVICIO Y NOTIFICAR
// A LA OTRA PERSONA
// ==========================================
app.put(
  '/api/servicios/:idServicio/estado',
  async (req, res) => {
    try {
      const idServicio = Number(
        req.params.idServicio
      );

      const estadoRecibido = String(
        req.body?.estado ?? ''
      )
        .trim()
        .toLowerCase()
        .replace(/_/g, ' ');

      const responsable = String(
        req.body?.actualizado_por ??
          req.body?.cancelado_por ??
          ''
      )
        .trim()
        .toLowerCase();

      const motivoCancelacion = String(
        req.body?.motivo_cancelacion ?? ''
      ).trim();

      if (
        !Number.isInteger(idServicio) ||
        idServicio <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'ID de servicio inválido',
        });
      }

      const mapaEstados: Record<
        string,
        string
      > = {
        pendiente: 'Pendiente',
        asignado: 'Asignado',
        aceptado: 'Asignado',
        aceptada: 'Asignado',
        'en proceso': 'En proceso',
        iniciado: 'En proceso',
        completado: 'Completado',
        completada: 'Completado',
        finalizado: 'Completado',
        finalizada: 'Completado',
        cancelado: 'Cancelado',
        cancelada: 'Cancelado',
      };

      const estadoNormalizado =
        mapaEstados[estadoRecibido];

      if (!estadoNormalizado) {
        return res.status(400).json({
          mensaje:
            'El estado indicado no es válido',
          estado_recibido:
            req.body?.estado ?? null,
        });
      }

      if (
        responsable !== 'cliente' &&
        responsable !== 'empleado'
      ) {
        return res.status(400).json({
          mensaje:
            'Debes indicar quién actualizó el servicio',
          detalle:
            'Usa "cliente" o "empleado" en actualizado_por o cancelado_por',
        });
      }

      // ======================================
      // OBTENER SERVICIO ANTES DE ACTUALIZARLO
      // ======================================
      const [
        resultadoServicio,
      ]: any = await database.execute(
        `
        SELECT TOP 1
          s.id_servicio,

          COALESCE(
            s.fk_cliente,
            s.id_cliente
          ) AS id_cliente,

          s.fk_empleado AS id_empleado,

          COALESCE(
            NULLIF(
              LTRIM(RTRIM(s.titulo)),
              ''
            ),
            NULLIF(
              LTRIM(RTRIM(s.descripcion)),
              ''
            ),
            'Servicio'
          ) AS titulo,

          COALESCE(
            NULLIF(
              LTRIM(RTRIM(s.estado)),
              ''
            ),
            'Pendiente'
          ) AS estado_actual

        FROM servicios AS s
        WHERE s.id_servicio = ?;
        `,
        [idServicio]
      );

      const servicios =
        obtenerFilas(
          resultadoServicio
        );

      if (servicios.length === 0) {
        return res.status(404).json({
          mensaje:
            'Servicio no encontrado',
        });
      }

      const servicio = servicios[0];

      const idCliente = Number(
        servicio.id_cliente
      );

      const idEmpleado = Number(
        servicio.id_empleado
      );

      const tituloServicio = String(
        servicio.titulo ??
          'Servicio'
      ).trim();

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'El servicio no tiene un cliente válido',
        });
      }

      // Si la acción requiere un trabajador,
      // comprobamos que esté asignado.
      if (
        estadoNormalizado !== 'Pendiente' &&
        (
          !Number.isInteger(idEmpleado) ||
          idEmpleado <= 0
        )
      ) {
        return res.status(400).json({
          mensaje:
            'El servicio no tiene un trabajador asignado',
        });
      }

      // ======================================
      // ACTUALIZAR ESTADO CON OUTPUT
      // ======================================
      const [
        resultadoActualizacion,
      ]: any = await database.execute(
        `
        UPDATE servicios
        SET estado = ?
        OUTPUT
          INSERTED.id_servicio,
          INSERTED.estado
        WHERE id_servicio = ?;
        `,
        [
          estadoNormalizado,
          idServicio,
        ]
      );

      const actualizados =
        obtenerFilas(
          resultadoActualizacion
        );

      if (actualizados.length === 0) {
        return res.status(404).json({
          mensaje:
            'No se pudo actualizar el servicio',
        });
      }

      // ======================================
      // PREPARAR LA NOTIFICACIÓN
      // ======================================
      let tituloNotificacion = '';
      let descripcionNotificacion = '';
      let tipoNotificacion = '';

      if (
        estadoNormalizado ===
        'En proceso'
      ) {
        tituloNotificacion =
          'El trabajo ha comenzado';

        descripcionNotificacion =
          `El trabajador inició el servicio "${tituloServicio}".`;

        tipoNotificacion =
          'servicio_iniciado';
      }

      if (
        estadoNormalizado ===
        'Completado'
      ) {
        tituloNotificacion =
          'Trabajo finalizado';

        descripcionNotificacion =
          `El trabajador completó el servicio "${tituloServicio}".`;

        tipoNotificacion =
          'servicio_completado';
      }

      if (
        estadoNormalizado ===
        'Cancelado'
      ) {
        if (
          responsable === 'empleado'
        ) {
          tituloNotificacion =
            'Trabajo cancelado por el trabajador';

          descripcionNotificacion =
            motivoCancelacion
              ? `El trabajador canceló el servicio "${tituloServicio}". Motivo: ${motivoCancelacion}`
              : `El trabajador canceló el servicio "${tituloServicio}".`;

          tipoNotificacion =
            'cancelado_empleado';
        } else {
          tituloNotificacion =
            'Servicio cancelado por el cliente';

          descripcionNotificacion =
            motivoCancelacion
              ? `El cliente canceló el servicio "${tituloServicio}". Motivo: ${motivoCancelacion}`
              : `El cliente canceló el servicio "${tituloServicio}".`;

          tipoNotificacion =
            'cancelado_cliente';
        }
      }

      let notificacionCreada:
        | any
        | null = null;

      // ======================================
      // ELEGIR A QUIÉN SE NOTIFICA
      // ======================================
      if (
        tituloNotificacion &&
        tipoNotificacion
      ) {
        /*
         * Si actúa el empleado:
         * la notificación pertenece al cliente.
         *
         * Si actúa el cliente:
         * la notificación pertenece al empleado.
         */
        const idClienteDestino =
          responsable === 'empleado'
            ? idCliente
            : null;

        const idEmpleadoDestino =
          responsable === 'cliente'
            ? idEmpleado
            : null;

        // Evitar notificaciones duplicadas.
        const [
          resultadoExistente,
        ]: any =
          await database.execute(
            `
            SELECT TOP 1
              id_notificacion
            FROM notificaciones
            WHERE fk_servicio = ?
              AND tipo = ?
              AND (
                (
                  ? IS NOT NULL
                  AND id_cliente = ?
                  AND id_empleado IS NULL
                )
                OR
                (
                  ? IS NOT NULL
                  AND id_empleado = ?
                  AND id_cliente IS NULL
                )
              )
            ORDER BY
              id_notificacion DESC;
            `,
            [
              idServicio,
              tipoNotificacion,

              idClienteDestino,
              idClienteDestino,

              idEmpleadoDestino,
              idEmpleadoDestino,
            ]
          );

        const existentes =
          obtenerFilas(
            resultadoExistente
          );

        if (
          existentes.length === 0
        ) {
          const [
            resultadoNotificacion,
          ]: any =
            await database.execute(
              `
              INSERT INTO notificaciones (
                id_cliente,
                id_empleado,
                titulo,
                descripcion,
                tipo,
                leida,
                fecha,
                fk_servicio
              )
              OUTPUT
                INSERTED.id_notificacion,
                INSERTED.id_cliente,
                INSERTED.id_empleado,
                INSERTED.titulo,
                INSERTED.descripcion,
                INSERTED.tipo,
                INSERTED.leida,
                INSERTED.fecha,
                INSERTED.fk_servicio
              VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                0,
                SYSDATETIME(),
                ?
              );
              `,
              [
                idClienteDestino,
                idEmpleadoDestino,
                tituloNotificacion,
                descripcionNotificacion,
                tipoNotificacion,
                idServicio,
              ]
            );

          const notificaciones =
            obtenerFilas(
              resultadoNotificacion
            );

          notificacionCreada =
            notificaciones[0] ??
            null;
        }
      }

      // Al terminar o cancelar, el empleado
      // vuelve a estar disponible.
      if (
        Number.isInteger(idEmpleado) &&
        idEmpleado > 0 &&
        (
          estadoNormalizado ===
            'Completado' ||
          estadoNormalizado ===
            'Cancelado'
        )
      ) {
        await database.execute(
          `
          UPDATE empleados
          SET estado = 'Disponible'
          WHERE id_empleado = ?;
          `,
          [idEmpleado]
        );
      }

      console.log(
        'Servicio actualizado y notificado:',
        {
          idServicio,
          estadoNormalizado,
          responsable,
          idCliente,
          idEmpleado,
          destinatario:
            responsable === 'empleado'
              ? {
                  tipo: 'cliente',
                  id: idCliente,
                }
              : {
                  tipo: 'empleado',
                  id: idEmpleado,
                },
          notificacion:
            notificacionCreada,
        }
      );

      return res.status(200).json({
        mensaje:
          notificacionCreada
            ? 'Estado actualizado y notificación enviada'
            : 'Estado actualizado correctamente',

        servicio: {
          id_servicio: idServicio,
          estado:
            estadoNormalizado,
        },

        destinatario:
          responsable === 'empleado'
            ? {
                rol: 'cliente',
                id: idCliente,
              }
            : {
                rol: 'empleado',
                id: idEmpleado,
              },

        notificacion:
          notificacionCreada,
      });
    } catch (error: any) {
      console.error(
        'Error al actualizar estado y notificar:',
        error
      );

      return res.status(500).json({
        mensaje:
          'No se pudo actualizar el estado del servicio',
        detalle:
          error?.message ||
          String(error),
        numero:
          error?.number ?? null,
        codigo:
          error?.code ?? null,
      });
    }
  }
);

// ==========================================
// AGENDA / SERVICIOS ASIGNADOS AL EMPLEADO
// ==========================================
app.get(
  "/api/empleados/:idEmpleado/servicios",
  async (req, res) => {
    try {
      const idEmpleado = Number(req.params.idEmpleado);

      if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
        return res.status(400).json({
          mensaje: "ID de empleado inválido",
        });
      }

      const [empleados]: any = await database.query(
        `
        SELECT id_empleado
        FROM empleados
        WHERE id_empleado = ?
        LIMIT 1
        `,
        [idEmpleado]
      );

      if (empleados.length === 0) {
        return res.status(404).json({
          mensaje: "El empleado no existe",
        });
      }

      const [servicios] = await database.query(
        `
        SELECT
          s.id_servicio,
          s.fk_cliente,
          s.fk_categoria,
          s.fk_empleado,
          s.fk_evidencia,
          s.titulo,
          s.descripcion,
          s.direccion,
          s.presupuesto,
          s.fecha,
          s.hora_inicio,
          s.hora_fin,
          COALESCE(
            NULLIF(LTRIM(RTRIM(s.estado)), ''),
            'Pendiente'
          ) AS estado,

          c.nombre_C AS nombre_cliente,
          c.foto AS foto_cliente,

          cat.nombre AS nombre_categoria

        FROM servicios s

        LEFT JOIN clientes c
          ON c.id_cliente = s.fk_cliente

        LEFT JOIN categorias cat
          ON cat.id_categoria = s.fk_categoria

        WHERE s.fk_empleado = ?

        ORDER BY
          s.fecha ASC,
          s.hora_inicio ASC,
          s.id_servicio ASC
        `,
        [idEmpleado]
      );

      return res.status(200).json(servicios);
    } catch (error) {
      console.error(
        "Error al consultar agenda del empleado:",
        error
      );

      return res.status(500).json({
        mensaje: "Error al consultar la agenda",
      });
    }
  }
);


// ==========================================
// AGENDA / RESERVAS
// ==========================================
app.get('/api/agenda/empleados/:idEmpleado', async (req, res) => {
  try {
    const idEmpleado = Number(req.params.idEmpleado);

    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      return res.status(400).json({ mensaje: 'ID de empleado inválido' });
    }

    const [reservas] = await database.query(
      `
      SELECT
        r.id_reserva,
        r.id_servicio,
        r.id_empleado,
        r.descripcion,
        r.fecha,
        r.hora,
        r.fecha_creacion
      FROM reservas r
      WHERE r.id_empleado = ?
      ORDER BY r.fecha ASC, r.hora ASC, r.id_reserva ASC
      `,
      [idEmpleado]
    );

    return res.status(200).json(Array.isArray(reservas) ? reservas : []);
  } catch (error: any) {
    console.error('Error al consultar reservas de agenda:', error);
    return res.status(500).json({ mensaje: 'Error al consultar la agenda', detalle: error.message });
  }
});

app.get('/api/reservas/:id', async (req, res) => {
  try {
    const idReserva = Number(req.params.id);

    if (!Number.isInteger(idReserva) || idReserva <= 0) {
      return res.status(400).json({ mensaje: 'ID de reserva inválido' });
    }

    const [rows]: any = await database.query(
      `
      SELECT
        r.id_reserva,
        r.id_empleado,
        r.descripcion,
        r.fecha,
        r.hora,
        e.nombre AS nombre_empleado,
        e.foto_url AS foto_empleado
      FROM reservas r
      LEFT JOIN empleados e ON e.id_empleado = r.id_empleado
      WHERE r.id_reserva = ?
      LIMIT 1
      `,
      [idReserva]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ mensaje: 'Reserva no encontrada' });
    }

    return res.json({ reserva: rows[0] });
  } catch (error: any) {
    console.error('Error al obtener reserva:', error);
    return res.status(500).json({ mensaje: 'Error al consultar la reserva', detalle: error.message });
  }
});

app.get('/api/reservas/servicio/:idServicio', async (req, res) => {
  try {
    const idServicio = Number(req.params.idServicio);

    if (!Number.isInteger(idServicio) || idServicio <= 0) {
      return res.status(400).json({ mensaje: 'ID de servicio inválido' });
    }

    const [rows]: any = await database.query(
      `
      SELECT TOP 1
        r.id_reserva,
        r.id_servicio,
        r.id_empleado,
        r.descripcion,
        r.fecha,
        r.hora,
        e.nombre AS nombre_empleado,
        e.foto_url AS foto_empleado
      FROM reservas r
      LEFT JOIN empleados e ON e.id_empleado = r.id_empleado
      WHERE r.id_servicio = ?
      ORDER BY r.fecha_creacion DESC, r.id_reserva DESC
      `,
      [idServicio]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ mensaje: 'No existe una reserva para este servicio' });
    }

    return res.status(200).json({ reserva: rows[0] });
  } catch (error: any) {
    console.error('Error al obtener reserva por servicio:', error);
    return res.status(500).json({ mensaje: 'Error al consultar la reserva por servicio', detalle: error.message });
  }
});

app.post('/api/resenas', async (req, res) => {
  try {
    const {
      id_reserva,
      id_empleado,
      calificacion_general,
      puntualidad,
      calidad,
      comunicacion,
      comentario,
    } = req.body;

    const idReserva = Number(id_reserva);
    const idEmpleado = Number(id_empleado);
    const calificacionGeneral = Number(calificacion_general);

    if (!Number.isInteger(idReserva) || idReserva <= 0) {
      return res.status(400).json({ mensaje: 'Falta un id_reserva válido' });
    }

    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      return res.status(400).json({ mensaje: 'Falta un id_empleado válido' });
    }

    if (!Number.isInteger(calificacionGeneral) || calificacionGeneral < 1 || calificacionGeneral > 5) {
      return res.status(400).json({ mensaje: 'La calificación general debe estar entre 1 y 5' });
    }

    const parseOpcional = (valor: unknown) => {
      if (valor === undefined || valor === null || valor === '') return null;

      const numero = Number(valor);
      return Number.isInteger(numero) && numero >= 1 && numero <= 5 ? numero : null;
    };

    const puntualidadValue = parseOpcional(puntualidad);
    const calidadValue = parseOpcional(calidad);
    const comunicacionValue = parseOpcional(comunicacion);
    const comentarioValue = typeof comentario === 'string' ? comentario.trim() || null : null;

    const [resultado]: any = await database.execute(
      `
      INSERT INTO resenas (
        id_reserva,
        id_empleado,
        calificacion_general,
        puntualidad,
        calidad,
        comunicacion,
        comentario,
        fecha
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())
      `,
      [
        idReserva,
        idEmpleado,
        calificacionGeneral,
        puntualidadValue,
        calidadValue,
        comunicacionValue,
        comentarioValue,
      ]
    );

    return res.status(201).json({ mensaje: 'Reseña registrada correctamente', resultado });
  } catch (error: any) {
    console.error('Error al registrar reseña:', error);
    return res.status(500).json({ mensaje: 'Error al registrar la reseña', detalle: error.message });
  }
});

app.put(
  "/api/usuarios/actividad",
  async (req, res) => {
    try {
      const rol = String(req.body.rol);
      const idUsuario = Number(req.body.idUsuario);

      if (
        !Number.isInteger(idUsuario) ||
        idUsuario <= 0
      ) {
        return res.status(400).json({
          mensaje: "ID de usuario inválido",
        });
      }

      if (rol === "client") {
        await database.query(`
          UPDATE clientes
          SET ultima_actividad = GETDATE()
          WHERE id_cliente = ${idUsuario}
        `);
      } else if (rol === "worker") {
        await database.query(`
          UPDATE empleados
          SET ultima_actividad = GETDATE()
          WHERE id_empleado = ${idUsuario}
        `);
      } else {
        return res.status(400).json({
          mensaje: "Rol inválido",
        });
      }

      return res.status(200).json({
        mensaje: "Actividad actualizada",
      });
    } catch (error: any) {
      return res.status(500).json({
        mensaje: "Error al actualizar actividad",
        detalle: error?.message || String(error),
      });
    }
  }
);

// ==========================================
// CONTACTOS DISPONIBLES PARA INICIAR CHAT
// ==========================================
app.get(
  "/api/chat/contactos/:rol/:idUsuario",
  async (req, res) => {
    try {
      const rol = String(req.params.rol);
      const idUsuario = Number(req.params.idUsuario);

      if (
        !Number.isInteger(idUsuario) ||
        idUsuario <= 0
      ) {
        return res.status(400).json({
          mensaje: "ID de usuario inválido",
        });
      }

      if (rol === "client") {
        const respuesta: any = await database.query(`
          SELECT
            id_empleado AS id,
            nombre AS nombre,
            foto_url AS foto,
            titulo AS descripcion,
            CASE
              WHEN ultima_actividad >= DATEADD(SECOND, -90, GETDATE())
                THEN 1
              ELSE 0
            END AS conectado
          FROM empleados
          ORDER BY nombre ASC
        `);

        const contactos =
          respuesta?.recordset ??
          respuesta?.recordsets?.[0] ??
          respuesta?.[0] ??
          respuesta?.rows ??
          [];

        return res.status(200).json(contactos);
      }

      if (rol === "worker") {
        const respuesta: any = await database.query(`
        SELECT
          id_cliente AS id,
          nombre AS nombre,
          foto_url AS foto,
          correo AS descripcion,
          CASE
            WHEN ultima_actividad >= DATEADD(SECOND, -90, GETDATE())
              THEN 1
            ELSE 0
          END AS conectado
        FROM clientes
        ORDER BY nombre ASC
      `);

        const contactos =
          respuesta?.recordset ??
          respuesta?.recordsets?.[0] ??
          respuesta?.[0] ??
          respuesta?.rows ??
          [];

        return res.status(200).json(contactos);
      }

      return res.status(400).json({
        mensaje: "Rol inválido",
      });
    } catch (error: any) {
      console.error(
        "Error al consultar contactos:",
        error
      );

      return res.status(500).json({
        mensaje: "Error al consultar los contactos",
        detalle: error?.message || String(error),
      });
    }
  }
);
// ==========================================
// MÉTODOS DE PAGO (simple storage)
// ==========================================
app.post('/api/payment-methods', async (req, res) => {
  try {
    const { fk_usuario, tipo, titular, numero_enmascarado, expiracion } = req.body;

    if (!fk_usuario || !tipo || !titular || !numero_enmascarado) {
      return res.status(400).json({ mensaje: 'Faltan datos del método de pago' });
    }

    const [resultado]: any = await database.execute(
      `
      INSERT INTO payment_methods (
        fk_usuario,
        tipo,
        titular,
        numero_enmascarado,
        expiracion,
        fecha_creacion
      ) VALUES (?, ?, ?, ?, ?, GETDATE())
      `,
      [fk_usuario, tipo, titular, numero_enmascarado, expiracion || null]
    );

    return res.status(201).json({ mensaje: 'Método de pago agregado', resultado });
  } catch (error: any) {
    console.error('Error al agregar método de pago:', error);
    return res.status(500).json({ mensaje: 'Error al guardar el método de pago', detalle: error.message });
  }
});

app.get('/api/payment-methods/:fk_usuario', async (req, res) => {
  try {
    const fk_usuario = Number(req.params.fk_usuario);

    if (!Number.isInteger(fk_usuario) || fk_usuario <= 0) {
      return res.status(400).json({ mensaje: 'ID de usuario inválido' });
    }

    const [methods] = await database.query(
      `SELECT id_payment_method, fk_usuario, tipo, titular, numero_enmascarado, expiracion, fecha_creacion FROM payment_methods WHERE fk_usuario = ? ORDER BY fecha_creacion DESC`,
      [fk_usuario]
    );

    return res.status(200).json(methods);
  } catch (error: any) {
    console.error('Error al consultar métodos de pago:', error);
    return res.status(500).json({ mensaje: 'Error al consultar métodos de pago', detalle: error.message });
  }
});

// ==========================================
// RESERVAS: crear reserva (opcional)
// ==========================================
app.post('/api/reservas', async (req, res) => {
  try {
    const { id_servicio, id_empleado, fecha, hora, descripcion } = req.body;

    if (!id_servicio || !id_empleado || !fecha) {
      return res.status(400).json({ mensaje: 'Faltan datos obligatorios de la reserva' });
    }

    const [resultado]: any = await database.execute(
      `
      INSERT INTO reservas (
        id_servicio,
        id_empleado,
        descripcion,
        fecha,
        hora,
        fecha_creacion
      ) VALUES (?, ?, ?, ?, ?, GETDATE())
      `,
      [id_servicio, id_empleado, descripcion || null, fecha, hora || null]
    );

    return res.status(201).json({ mensaje: 'Reserva creada', resultado });
  } catch (error: any) {
    console.error('Error al crear reserva:', error);
    return res.status(500).json({ mensaje: 'Error al crear la reserva', detalle: error.message });
  }
});

// ==========================================
// HISTORIAL DE CONTRATACIONES DEL CLIENTE
// SOLO SERVICIOS COMPLETADOS
// ==========================================
app.get(
  '/api/clientes/:idCliente/historial',
  async (req, res) => {
    try {
      const idCliente = Number(
        req.params.idCliente,
      );

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de cliente inválido',
        });
      }

      const respuesta: any =
        await database.query(`
          SELECT
            s.id_servicio,

            COALESCE(
              s.fk_cliente,
              s.id_cliente
            ) AS id_cliente,

            COALESCE(
              s.fk_categoria,
              s.id_categoria
            ) AS id_categoria,

            s.fk_empleado,
            s.titulo,
            s.descripcion,
            s.direccion,
            s.presupuesto,
            s.fecha,
            s.hora_inicio,
            s.hora_fin,

            'completed' AS estado,

            cat.nombre AS nombre_categoria,

            e.id_empleado,
            e.nombre AS nombre_empleado,
            e.foto_url AS foto_empleado,

            reserva.id_reserva,

            resena.id_resena,
            resena.calificacion_general,
            resena.comentario AS comentario_resena,
            resena.fecha AS fecha_resena,

            CASE
              WHEN resena.id_resena IS NULL
                THEN 0
              ELSE 1
            END AS tiene_resena

          FROM servicios AS s

          LEFT JOIN categorias AS cat
            ON cat.id_categoria =
              COALESCE(
                s.fk_categoria,
                s.id_categoria
              )

          LEFT JOIN empleados AS e
            ON e.id_empleado =
              s.fk_empleado

          OUTER APPLY (
            SELECT TOP 1
              r.id_reserva,
              r.id_empleado
            FROM reservas AS r
            WHERE r.id_servicio =
              s.id_servicio
            ORDER BY
              r.fecha_creacion DESC,
              r.id_reserva DESC
          ) AS reserva

          OUTER APPLY (
            SELECT TOP 1
              re.id_resena,
              re.calificacion_general,
              re.comentario,
              re.fecha
            FROM resenas AS re
            WHERE re.id_reserva =
              reserva.id_reserva
            ORDER BY
              re.fecha DESC,
              re.id_resena DESC
          ) AS resena

          WHERE COALESCE(
            s.fk_cliente,
            s.id_cliente
          ) = ${idCliente}

          AND LOWER(
            LTRIM(
              RTRIM(
                COALESCE(
                  s.estado,
                  ''
                )
              )
            )
          ) IN (
            'completado',
            'completada',
            'completed'
          )

          ORDER BY
            s.fecha DESC,
            s.hora_inicio DESC,
            s.id_servicio DESC;
        `);

      const servicios: any[] =
        Array.isArray(
          respuesta?.recordset,
        )
          ? respuesta.recordset
          : Array.isArray(
                respuesta?.recordsets?.[0],
              )
            ? respuesta.recordsets[0]
            : Array.isArray(
                  respuesta?.[0],
                )
              ? respuesta[0]
              : Array.isArray(
                    respuesta?.rows,
                  )
                ? respuesta.rows
                : Array.isArray(
                      respuesta,
                    )
                  ? respuesta
                  : [];

      const resenas = servicios
        .filter(
          (servicio) =>
            Number(
              servicio.tiene_resena,
            ) === 1,
        )
        .map((servicio) => ({
          id:
            servicio.id_resena,

          bookingId:
            servicio.id_servicio,

          reviewerName:
            servicio.nombre_empleado ||
            'Trabajador',

          rating:
            Number(
              servicio.calificacion_general,
            ) || 0,

          comment:
            servicio.comentario_resena ||
            '',

          date:
            servicio.fecha_resena ||
            '',
        }));

      return res.status(200).json({
        servicios,
        resenas,
        total_servicios:
          servicios.length,
        total_resenas:
          resenas.length,
      });
    } catch (error: any) {
      console.error(
        'Error al consultar historial del cliente:',
        error,
      );

      return res.status(500).json({
        mensaje:
          'Error al consultar el historial de contrataciones',

        detalle:
          error?.message ||
          String(error),
      });
    }
  },
);

// ==========================================
// RESUMEN DEL PERFIL DEL EMPLEADO
// ==========================================
app.get(
  '/api/empleados/:idEmpleado/resumen-perfil',
  async (req, res) => {
    try {
      const idEmpleado = Number(
        req.params.idEmpleado,
      );

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de empleado inválido',
        });
      }

      const respuestaResumen: any =
        await database.query(`
          SELECT
            e.id_empleado,

            COUNT(
              DISTINCT CASE
                WHEN LOWER(
                  LTRIM(
                    RTRIM(
                      COALESCE(s.estado, '')
                    )
                  )
                ) IN (
                  'completado',
                  'completada',
                  'completed'
                )
                THEN s.id_servicio
              END
            ) AS total_trabajos,

            COUNT(
              DISTINCT r.id_resena
            ) AS total_resenas,

            COALESCE(
              AVG(
                CAST(
                  r.calificacion_general
                  AS DECIMAL(10, 2)
                )
              ),
              0
            ) AS promedio_calificacion

          FROM empleados AS e

          LEFT JOIN servicios AS s
            ON s.fk_empleado =
              e.id_empleado

          LEFT JOIN reservas AS re
            ON re.id_servicio =
              s.id_servicio

          LEFT JOIN resenas AS r
            ON r.id_reserva =
              re.id_reserva
            AND r.id_empleado =
              e.id_empleado

          WHERE e.id_empleado =
            ${idEmpleado}

          GROUP BY
            e.id_empleado;
        `);

      const resumen =
        respuestaResumen?.recordset?.[0] ??
        respuestaResumen?.recordsets?.[0]?.[0] ??
        respuestaResumen?.[0]?.[0] ??
        respuestaResumen?.rows?.[0] ??
        null;

      if (!resumen) {
        return res.status(404).json({
          mensaje: 'Empleado no encontrado',
        });
      }

      const respuestaResenas: any =
        await database.query(`
          SELECT
            r.id_resena,
            r.id_reserva,
            r.calificacion_general,
            r.puntualidad,
            r.calidad,
            r.comunicacion,
            r.comentario,
            r.fecha,

            re.id_servicio,

            COALESCE(
              NULLIF(c.nombre, ''),
              NULLIF(c.nombre_C, ''),
              'Cliente'
            ) AS nombre_cliente,

            COALESCE(
              c.foto_url,
              c.foto
            ) AS foto_cliente

          FROM resenas AS r

          INNER JOIN reservas AS re
            ON re.id_reserva =
              r.id_reserva

          INNER JOIN servicios AS s
            ON s.id_servicio =
              re.id_servicio

          LEFT JOIN clientes AS c
            ON c.id_cliente =
              COALESCE(
                s.fk_cliente,
                s.id_cliente
              )

          WHERE r.id_empleado =
            ${idEmpleado}

          ORDER BY
            r.fecha DESC,
            r.id_resena DESC;
        `);

      const resenas: any[] =
        Array.isArray(
          respuestaResenas?.recordset,
        )
          ? respuestaResenas.recordset
          : Array.isArray(
                respuestaResenas
                  ?.recordsets?.[0],
              )
            ? respuestaResenas.recordsets[0]
            : Array.isArray(
                  respuestaResenas?.[0],
                )
              ? respuestaResenas[0]
              : Array.isArray(
                    respuestaResenas?.rows,
                  )
                ? respuestaResenas.rows
                : Array.isArray(
                      respuestaResenas,
                    )
                  ? respuestaResenas
                  : [];

      return res.status(200).json({
        total_trabajos:
          Number(
            resumen.total_trabajos,
          ) || 0,

        total_resenas:
          Number(
            resumen.total_resenas,
          ) || 0,

        promedio_calificacion:
          Number(
            resumen.promedio_calificacion,
          ) || 0,

        resenas,
      });
    } catch (error: any) {
      console.error(
        'Error al consultar resumen del empleado:',
        error,
      );

      return res.status(500).json({
        mensaje:
          'Error al consultar el perfil del empleado',

        detalle:
          error?.message ||
          String(error),
      });
    }
  },
);


// ==========================================
// PERFIL PÚBLICO DEL CLIENTE
// ==========================================
app.get(
  '/api/clientes/:idCliente/perfil-publico',
  async (req, res) => {
    try {
      const idCliente = Number(
        req.params.idCliente
      );

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'ID de cliente inválido',
        });
      }

      // ======================================
      // OBTENER INFORMACIÓN BÁSICA DEL CLIENTE
      // ======================================
      const resultadoCliente: any =
        await database.query(`
          SELECT TOP 1
            c.id_cliente,
            c.nombre AS nombre_C,
            c.foto_url AS foto,
            c.direccion,
            c.fecha_creacion,

            (
              SELECT COUNT(*)
              FROM servicios AS s
              WHERE COALESCE(
                s.fk_cliente,
                s.id_cliente
              ) = c.id_cliente
            ) AS total_servicios,

            CAST(
              0 AS DECIMAL(10, 2)
            ) AS promedio_calificacion,

            0 AS cantidad_resenas

          FROM clientes AS c
          WHERE c.id_cliente =
            ${idCliente};
        `);

      const resultadoClienteReal =
        Array.isArray(resultadoCliente)
          ? resultadoCliente[0]
          : resultadoCliente;

      const clientes =
        obtenerFilas(
          resultadoClienteReal
        );

      if (clientes.length === 0) {
        return res.status(404).json({
          mensaje:
            'El cliente no existe',
        });
      }

      // ======================================
      // OBTENER ÚLTIMOS SERVICIOS PUBLICADOS
      // ======================================
      const resultadoServicios: any =
        await database.query(`
          SELECT TOP 3
            s.id_servicio,

            COALESCE(
              NULLIF(
                LTRIM(RTRIM(s.titulo)),
                ''
              ),
              NULLIF(
                LTRIM(RTRIM(s.descripcion)),
                ''
              ),
              'Solicitud de servicio'
            ) AS titulo,

            COALESCE(
              NULLIF(
                LTRIM(RTRIM(cat.nombre)),
                ''
              ),
              'Sin categoría'
            ) AS categoria,

            COALESCE(
              NULLIF(
                LTRIM(RTRIM(s.estado)),
                ''
              ),
              'Pendiente'
            ) AS estado,

            s.fecha

          FROM servicios AS s

          LEFT JOIN categorias AS cat
            ON cat.id_categoria =
              COALESCE(
                s.fk_categoria,
                s.id_categoria
              )

          WHERE COALESCE(
            s.fk_cliente,
            s.id_cliente
          ) = ${idCliente}

          ORDER BY
            s.fecha DESC,
            s.id_servicio DESC;
        `);

      const resultadoServiciosReal =
        Array.isArray(resultadoServicios)
          ? resultadoServicios[0]
          : resultadoServicios;

      const ultimosServicios =
        obtenerFilas(
          resultadoServiciosReal
        );

      return res.status(200).json({
        ...clientes[0],
        ultimosServicios,
      });
    } catch (error: any) {
      console.error(
        'Error al obtener perfil público del cliente:',
        error
      );

      return res.status(500).json({
        mensaje:
          'No se pudo cargar el perfil público del cliente',
        detalle:
          error?.message ||
          String(error),
      });
    }
  }
);

// ==========================================
// BORRAR NOTIFICACIONES DEL CLIENTE
// ==========================================
app.delete(
  '/api/clientes/:idCliente/notificaciones',
  async (req, res) => {
    try {
      const idCliente = Number(
        req.params.idCliente,
      );

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'ID de cliente inválido',
        });
      }

      await database.execute(
        `
        DELETE FROM notificaciones
        WHERE id_cliente = ?;
        `,
        [idCliente],
      );

      return res.status(200).json({
        mensaje:
          'Notificaciones eliminadas correctamente',
      });
    } catch (error: any) {
      console.error(
        'Error al eliminar notificaciones del cliente:',
        error,
      );

      return res.status(500).json({
        mensaje:
          'No se pudieron eliminar las notificaciones',
        detalle:
          error?.message ||
          String(error),
      });
    }
  },
);

// ==========================================
// BORRAR NOTIFICACIONES DEL EMPLEADO
// ==========================================
app.delete(
  '/api/empleados/:idEmpleado/notificaciones',
  async (req, res) => {
    try {
      const idEmpleado = Number(
        req.params.idEmpleado,
      );

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return res.status(400).json({
          mensaje:
            'ID de empleado inválido',
        });
      }

      await database.execute(
        `
        DELETE FROM notificaciones
        WHERE id_empleado = ?;
        `,
        [idEmpleado],
      );

      return res.status(200).json({
        mensaje:
          'Notificaciones eliminadas correctamente',
      });
    } catch (error: any) {
      console.error(
        'Error al eliminar notificaciones del empleado:',
        error,
      );

      return res.status(500).json({
        mensaje:
          'No se pudieron eliminar las notificaciones',
        detalle:
          error?.message ||
          String(error),
      });
    }
  },
);

//presupuesto
app.put(
  '/api/servicios/:idServicio/presupuesto',
  async (req, res) => {
    try {
      const idServicio = Number(
        req.params.idServicio
      );

      const presupuestoNuevo = Number(
        req.body?.presupuesto
      );

      if (
        !Number.isInteger(idServicio) ||
        idServicio <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de servicio inválido',
        });
      }

      if (
        !Number.isFinite(presupuestoNuevo) ||
        presupuestoNuevo <= 0
      ) {
        return res.status(400).json({
          mensaje: 'Presupuesto inválido',
        });
      }

      // 1. Obtener datos actuales del servicio
      const [resultadoServicio]: any =
        await database.execute(
          `
          SELECT TOP 1
            s.id_servicio,
            s.titulo,
            s.presupuesto,
            s.fk_empleado,
            c.nombre AS nombre_cliente
          FROM servicios AS s
          LEFT JOIN clientes AS c
            ON c.id_cliente = COALESCE(
              s.fk_cliente,
              s.id_cliente
            )
          WHERE s.id_servicio = ?
          `,
          [idServicio]
        );

      const servicios =
        obtenerFilas(resultadoServicio);

      if (servicios.length === 0) {
        return res.status(404).json({
          mensaje: 'Servicio no encontrado',
        });
      }

      const servicio = servicios[0];

      const nombreCliente = String(
        servicio.nombre_cliente || 'El cliente'
      ).trim();

      const presupuestoAnterior = Number(
        servicio.presupuesto
      );

      const idEmpleado = Number(
        req.body?.fk_empleado ??
          servicio.fk_empleado
      );

      const tituloServicio = String(
        servicio.titulo ||
          'Solicitud de servicio'
      ).trim();

      // 2. Actualizar presupuesto
      await database.execute(
        `
        UPDATE servicios
        SET presupuesto = ?
        WHERE id_servicio = ?
        `,
        [
          presupuestoNuevo,
          idServicio,
        ]
      );

      const [resultadoEstado]: any =
        await database.execute(
          `
          UPDATE postulaciones
          SET estado_negociacion  = 'EsperandoConfirmacion'
          OUTPUT
            INSERTED.id_postulacion,
            INSERTED.estado_negociacion
          WHERE fk_servicio = ?
            AND fk_empleado = ?
            AND tipo_postulacion = 'negociar'
          `,
          [
            idServicio,
            idEmpleado,
          ]
        );

      // 3. Notificar al trabajador si ya está asignado - Crear notificación para el trabajador
      if (
        Number.isInteger(idEmpleado) &&
        idEmpleado > 0
      ) {
        await database.execute(
          `
          INSERT INTO notificaciones (
            id_cliente,
            id_empleado,
            titulo,
            descripcion,
            tipo,
            leida,
            fecha,
            fk_servicio
          )
          VALUES (
            NULL,
            ?,
            ?,
            ?,
            ?,
            0,
            SYSDATETIME(),
            ?
          )
          `,
          [
            idEmpleado,
            'Presupuesto actualizado',
            `El cliente ${nombreCliente} actualizó el presupuesto de la solicitud "${tituloServicio}" de L${presupuestoAnterior.toLocaleString()} a L${presupuestoNuevo.toLocaleString()}.`,
            'presupuesto_actualizado',
            idServicio,
          ]
        );
      }

      return res.status(200).json({
        mensaje:
          'Presupuesto actualizado correctamente',
        presupuestoAnterior,
        presupuestoNuevo,
      });
    } catch (error: any) {
      console.error(
        'Error al actualizar presupuesto:',
        error
      );

      return res.status(500).json({
        mensaje:
          'No se pudo actualizar el presupuesto',
        detalle:
          error?.message ??
          String(error),
      });
    }
  }
);

app.put(
  '/api/postulaciones/:idPostulacion/aceptar-negociacion',
  async (req, res) => {
    try {
      const idPostulacion = Number(
        req.params.idPostulacion
      );

      if (
        !Number.isInteger(idPostulacion) ||
        idPostulacion <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de postulación inválido',
        });
      }

      const [resultadoPostulacion]: any =
        await database.execute(
          `
          SELECT TOP 1
            p.id_postulacion,
            p.fk_servicio,
            p.fk_empleado,
            p.tipo_postulacion,
            p.estado_negociacion,
            s.id_cliente,
            s.titulo,
            s.presupuesto,
            e.nombre AS nombre_empleado
          FROM postulaciones AS p
          INNER JOIN servicios AS s
            ON s.id_servicio = p.fk_servicio
          INNER JOIN empleados AS e
            ON e.id_empleado = p.fk_empleado
          WHERE p.id_postulacion = ?
          `,
          [idPostulacion]
        );

      const postulaciones =
        obtenerFilas(resultadoPostulacion);

      if (postulaciones.length === 0) {
        return res.status(404).json({
          mensaje: 'Esta negociación no está pendiente de confirmación',
        });
      }

      const postulacion = postulaciones[0];

      const tipoPostulacion = String(
        postulacion.tipo_postulacion ?? ''
      )
        .trim()
        .toLowerCase();

      const estadoNegociacion = String(
        postulacion.estado_negociacion ?? ''
      )
        .trim()
        .toLowerCase();

      if (
        tipoPostulacion !== 'negociar' ||
        estadoNegociacion !==
          'esperandoconfirmacion'
      ) {
        return res.status(400).json({
          mensaje:
            'Esta negociaci├│n no est├í pendiente de confirmaci├│n',
        });
      }

      await database.execute(
        `
        UPDATE postulaciones
        SET estado_negociacion = 'Aceptado'
        WHERE id_postulacion = ?
        `,
        [idPostulacion]
      );

      const idCliente = Number(
        postulacion.id_cliente
      );

      if (
        Number.isInteger(idCliente) &&
        idCliente > 0
      ) {
        const nombreEmpleado = String(
          postulacion.nombre_empleado ||
            'El trabajador'
        ).trim();

        const tituloServicio = String(
          postulacion.titulo ||
            'Solicitud de servicio'
        ).trim();

        const presupuesto = Number(
          postulacion.presupuesto
        );

        await database.execute(
          `
          INSERT INTO notificaciones (
            id_cliente,
            id_empleado,
            titulo,
            descripcion,
            tipo,
            leida,
            fecha,
            fk_servicio
          )
          VALUES (
            ?,
            NULL,
            ?,
            ?,
            ?,
            0,
            SYSDATETIME(),
            ?
          )
          `,
          [
            idCliente,
            'Presupuesto aceptado',
            `${nombreEmpleado} aceptó el nuevo presupuesto de L ${presupuesto.toLocaleString()} para "${tituloServicio}".`,
            'presupuesto_aceptado',
            Number(postulacion.fk_servicio),
          ]
        );
      }

      return res.status(200).json({
        mensaje:
          'Nuevo presupuesto aceptado correctamente',
        estado_negociacion: 'Aceptado',
      });
    } catch (error: any) {
      console.error(
        'Error al aceptar negociación:',
        error
      );

      return res.status(500).json({
        mensaje:
          'No se pudo aceptar el nuevo presupuesto',
        detalle:
          error?.message ?? String(error),
      });
    }
  }
);

// ==========================================
// RESPUESTA JSON PARA RUTAS NO ENCONTRADAS
// ==========================================
app.use((req, res) => {
  return res.status(404).json({
    mensaje: 'Ruta no encontrada',
    metodo: req.method,
    ruta: req.originalUrl,
  });
});


console.log(
  'NOTIFICACIONES CORREGIDAS: cliente y empleado separados'
);

app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

// ==========================================
// ELIMINAR CUENTA (requiere sesión)
// ==========================================
app.delete('/api/account', async (req, res) => {
  try {
    const sid = req.cookies?.[COOKIE_NAME];
    if (!sid || !sessions.has(sid)) {
      return res.status(401).json({ mensaje: 'No autenticado' });
    }

    const sess = sessions.get(sid)!;
    const user = sess.user;
    if (!user) {
      sessions.delete(sid);
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({ mensaje: 'Sesión inválida' });
    }

    // Determinar rol: se puede pasar en query/body, o inferir del objeto user
    let role = (req.body && req.body.role) || req.query?.role;
    if (!role) {
      if (user.id_empleado || user.idEmpleado) role = 'worker';
      else role = 'client';
    }

    const userId = Number(user.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ mensaje: 'ID de usuario inválido' });
    }

    if (role === 'client') {
      await database.execute('DELETE FROM clientes WHERE id_cliente = ?', [userId]);
    } else if (role === 'worker') {
      await database.execute('DELETE FROM empleados WHERE id_empleado = ?', [userId]);
    } else {
      return res.status(400).json({ mensaje: 'Rol no válido' });
    }

    // limpiar sesión y cookie
    sessions.delete(sid);
    res.clearCookie(COOKIE_NAME);

    logSecurity('account_deleted', { userId, role });

    return res.status(200).json({ mensaje: 'Cuenta eliminada correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar cuenta:', error);
    return res.status(500).json({ mensaje: 'Error interno al eliminar cuenta', detalle: error?.message ?? String(error) });
  }
});