import express from "express";
import cors from "cors";
import "dotenv/config";
import bcrypt from "bcryptjs";
import { BlobServiceClient } from "@azure/storage-blob";

import { database } from "./config/database.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!AZURE_STORAGE_CONNECTION_STRING) {
  console.warn("AZURE_STORAGE_CONNECTION_STRING no definida. Subidas a Azure fallarán si no se configura.");
}
const AZURE_BLOB_CONTAINER = process.env.AZURE_BLOB_CONTAINER ?? "fotosclientesyempleados";
const AZURE_ANTECEDENTES_CONTAINER = process.env.AZURE_ANTECEDENTES_CONTAINER ?? "antecedentes";
const AZURE_EVIDENCIAS_CONTAINER = process.env.AZURE_EVIDENCIAS_CONTAINER ?? "evidencias";
const blobServiceClient: BlobServiceClient | null = AZURE_STORAGE_CONNECTION_STRING
  ? BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING)
  : null;
const SALT_ROUNDS = 10;

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

  if (!blobServiceClient) {
    throw new Error("Azure storage no está configurado (AZURE_STORAGE_CONNECTION_STRING faltante)");
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
app.use(express.json({ limit: "10mb" }));

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
    const [empleados] = await database.execute(
    `
    SELECT
      id_empleado,
      nombre_E,
      correo,
      celular,
      titulo,
      direccion,
      fk_categoria,
      estado,
      N_trabajos,
      sobre_mi,
      fechaCreacion
    FROM empleados
    WHERE LOWER(TRIM(estado)) = 'disponible'
    `
    );

    res.json(empleados);
  } catch (error) {
    console.error('Error al consultar empleados disponibles:', error);

    res.status(500).json({
      mensaje: 'Error al consultar los empleados disponibles',
    });
  }
});

//empleados destacados
app.get('/api/empleados/destacados', async (_req, res) => {
  try {
    const [empleados] = await database.execute(
      `
      SELECT
        id_empleado,
        nombre_E,
        correo,
        celular,
        titulo,
        direccion,
        fk_categoria,
        estado,
        N_trabajos,
        sobre_mi,
        fechaCreacion
      FROM empleados
      ORDER BY N_trabajos DESC, nombre_E ASC
      LIMIT 5
      `
    );

    res.json(empleados);
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
app.get("/api/categorias/:id/empleados", async (req, res) => {
  try {
    const idCategoria = Number(req.params.id);

    if (!Number.isInteger(idCategoria) || idCategoria <= 0) {
      return res.status(400).json({
        mensaje: "ID de categoría inválido",
      });
    }

    const [empleados]: any = await database.execute(
      `
      SELECT
        e.id_empleado,
        e.nombre AS nombre_E,
        e.correo,
        e.telefono AS celular,
        e.titulo,
        e.direccion,
        e.estado,
        e.numero_trabajos AS N_trabajos,
        c.id_categoria,
        c.nombre AS categoria
      FROM empleados e
      INNER JOIN empleado_categorias ec
        ON ec.id_empleado = e.id_empleado
      INNER JOIN categorias c
        ON c.id_categoria = ec.id_categoria
      WHERE c.id_categoria = ?
      ORDER BY e.nombre ASC
      `,
      [idCategoria]
    );

    return res.status(200).json(empleados);
  } catch (error) {
    console.error("Error al consultar empleados por categoría:", error);

    return res.status(500).json({
      mensaje: "Error al consultar los trabajadores",
    });
  }
});

// ==========================================
// RUTA DE LOGIN (NUEVA)
// ==========================================
app.post("/api/login", async (req, res) => {
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
      const [rows]: any = await database.execute(
        "SELECT id_cliente AS id, nombre AS nombre, correo, telefono AS celular, NULL AS estado, foto_url AS foto, password_hash FROM clientes WHERE correo = ?",
        [correo]
      );
      if (rows.length > 0) {
        const cliente = rows[0];
        const valid = await bcrypt.compare(password, cliente.password_hash);
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
        const valid = await bcrypt.compare(password, empleado.password_hash);
        if (valid) {
          const { password_hash, ...usuarioSinPassword } = empleado;
          usuario = usuarioSinPassword;
        }
      }
    } else {
      return res.status(400).json({ mensaje: "Rol no válido" });
    }

    if (!usuario) {
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
});

// ==========================================
// RUTAS DE SERVICIOS / SOLICITUDES (NUEVAS)
// ==========================================
app.post("/api/servicios", async (req, res) => {
  try {
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
          "Faltan datos obligatorios para crear la solicitud",
      });
    }

    if (String(hora_fin) <= String(hora_inicio)) {
      return res.status(400).json({
        mensaje:
          "La hora final debe ser posterior a la hora inicial",
      });
    }

    // Insert into both id_* (non-null legacy columns) and fk_* (newer columns)
    // so the row satisfies schemas that have duplicate naming.
    const [resultado] = await database.execute(
      `
      INSERT INTO servicios
      (
        id_cliente,
        id_categoria,
        fk_cliente,
        fk_categoria,
        fk_evidencia,
        descripcion,
        direccion,
        presupuesto,
        fecha,
        hora_inicio,
        hora_fin
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        fk_cliente, // id_cliente
        fk_categoria, // id_categoria
        fk_cliente, // fk_cliente
        fk_categoria, // fk_categoria
        fk_evidencia || null,
        descripcion,
        direccion,
        presupuesto,
        fecha,
        hora_inicio,
        hora_fin,
      ]
    );

    return res.status(201).json({
      mensaje: "Solicitud publicada correctamente",
      resultado,
    });
  } catch (error) {
    console.error(
      "Error al registrar servicio:",
      error
    );

    return res.status(500).json({
      mensaje: "Error al publicar la solicitud",
    });
  }
});



app.get("/api/servicios", async (_req, res) => {
  try {
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
    s.estado,

    c.nombre AS nombre_cliente,
    c.foto_url AS foto_cliente,

    cat.nombre AS nombre_categoria

  FROM servicios s

  LEFT JOIN clientes c
    ON c.id_cliente = s.fk_cliente

  LEFT JOIN categorias cat
    ON cat.id_categoria = s.fk_categoria

  ORDER BY s.fecha DESC
  `
);

    res.json(servicios);
  } catch (error) {
    console.error("Error al consultar servicios:", error);
    res.status(500).json({
      mensaje: "Error al consultar los servicios",
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
          s.estado,

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
  "/api/empleados/:idEmpleado/servicios",
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

    const mensajeSeguro =
      textoMensaje.replace(/'/g, "''");

    const respuestaMensaje: any =
      await database.query(`
        INSERT INTO chat_mensajes
        (
          id_conversacion,
          remitente,
          mensaje,
          fecha
        )
        OUTPUT
          INSERTED.id_mensaje,
          INSERTED.fecha
        VALUES
        (
          ${idConversacion},
          '${remitenteBD}',
          N'${mensajeSeguro}',
          GETDATE()
        )
      `);

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
            id_mensaje AS id_chat,
            ${idCliente} AS fk_cliente,
            ${idEmpleado} AS fk_empleado,
            CASE remitente
              WHEN 'EMPLEADO'
                THEN 'empleado'
              ELSE 'cliente'
            END AS remitente,
            mensaje,
            0 AS leido,
            fecha
          FROM chat_mensajes
          WHERE id_conversacion =
            ${idConversacion}
          ORDER BY
            fecha ASC,
            id_mensaje ASC
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
app.get(
  "/api/chat/empleado/:idEmpleado/conversaciones",
  async (req, res) => {
    try {
      const idEmpleado = Number(req.params.idEmpleado);

      if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
        return res.status(400).json({
          mensaje: "ID de empleado inválido",
        });
      }

      const [conversaciones]: any = await database.execute(
        `
        SELECT
          cc.id_cliente AS id,
          cl.nombre_C AS participantName,
          cl.foto AS participantAvatar,
          (
            SELECT TOP 1 cm.mensaje
            FROM chat_mensajes cm
            WHERE cm.id_conversacion = cc.id_conversacion
            ORDER BY cm.fecha DESC, cm.id_mensaje DESC
          ) AS lastMessage,
          (
            SELECT TOP 1 cm.fecha
            FROM chat_mensajes cm
            WHERE cm.id_conversacion = cc.id_conversacion
            ORDER BY cm.fecha DESC, cm.id_mensaje DESC
          ) AS lastMessageTime,
          0 AS unreadCount,
          0 AS participantOnline
        FROM chat_conversaciones cc
        LEFT JOIN clientes cl ON cl.id_cliente = cc.id_cliente
        WHERE cc.id_empleado = ?
        ORDER BY lastMessageTime DESC, cc.id_conversacion DESC
        `,
        [idEmpleado]
      );

      return res.status(200).json(conversaciones);
    } catch (error) {
      console.error(
        "Error al consultar conversaciones del empleado:",
        error
      );

      return res.status(500).json({
        mensaje: "Error al consultar las conversaciones",
      });
    }
  }
);

// ==========================================
// CONVERSACIONES DE UN CLIENTE
// ==========================================
app.get(
  "/api/chat/cliente/:idCliente/conversaciones",
  async (req, res) => {
    try {
      const idCliente = Number(req.params.idCliente);

      if (!Number.isInteger(idCliente) || idCliente <= 0) {
        return res.status(400).json({
          mensaje: "ID de cliente inválido",
        });
      }

      const [conversaciones]: any = await database.execute(
        `
        SELECT
          cc.id_empleado AS id,
          e.nombre AS participantName,
          NULL AS participantAvatar,
          (
            SELECT TOP 1 cm.mensaje
            FROM chat_mensajes cm
            WHERE cm.id_conversacion = cc.id_conversacion
            ORDER BY cm.fecha DESC, cm.id_mensaje DESC
          ) AS lastMessage,
          (
            SELECT TOP 1 cm.fecha
            FROM chat_mensajes cm
            WHERE cm.id_conversacion = cc.id_conversacion
            ORDER BY cm.fecha DESC, cm.id_mensaje DESC
          ) AS lastMessageTime,
          0 AS unreadCount,
          CASE
            WHEN e.estado = 'Disponible' THEN 1
            ELSE 0
          END AS participantOnline
        FROM chat_conversaciones cc
        LEFT JOIN empleados e ON e.id_empleado = cc.id_empleado
        WHERE cc.id_cliente = ?
        ORDER BY lastMessageTime DESC, cc.id_conversacion DESC
        `,
        [idCliente]
      );

      return res.status(200).json(conversaciones);
    } catch (error: any) {
      console.error(
        "Error al consultar conversaciones del cliente:",
        error
      );

      return res.status(500).json({
        mensaje: "Error al consultar las conversaciones",
        detalle: error.message,
        codigo: error.code,
      });
    }
  }
);

// ==========================================
// MARCAR MENSAJES COMO LEÍDOS
// ==========================================
app.put("/api/chat/leidos", async (req, res) => {
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
});

app.post(
  '/api/servicios/:idServicio/postular',
  async (req, res) => {
    try {
      const idServicio = Number(req.params.idServicio);
      const idEmpleado = Number(req.body?.fk_empleado);

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

      // Comprobar que el servicio existe y sigue pendiente.
      const respuestaServicio: any =
        await database.query(
          `
          SELECT TOP 1
            id_servicio,
            estado
          FROM servicios
          WHERE id_servicio = ${idServicio}
          `
        );

      const servicios: any[] =
        Array.isArray(respuestaServicio?.recordset)
          ? respuestaServicio.recordset
          : Array.isArray(
                respuestaServicio?.recordsets?.[0]
              )
            ? respuestaServicio.recordsets[0]
            : Array.isArray(respuestaServicio?.[0])
              ? respuestaServicio[0]
              : [];

      if (servicios.length === 0) {
        return res.status(404).json({
          mensaje: 'El servicio no existe',
        });
      }

      if (
        String(servicios[0].estado).trim() !==
        'Pendiente'
      ) {
        return res.status(400).json({
          mensaje:
            'Este servicio ya no acepta postulaciones',
        });
      }

      // Comprobar que el empleado existe.
      const respuestaEmpleado: any =
        await database.query(
          `
          SELECT TOP 1
            id_empleado
          FROM empleados
          WHERE id_empleado = ${idEmpleado}
          `
        );

      const empleados: any[] =
        Array.isArray(respuestaEmpleado?.recordset)
          ? respuestaEmpleado.recordset
          : Array.isArray(
                respuestaEmpleado?.recordsets?.[0]
              )
            ? respuestaEmpleado.recordsets[0]
            : Array.isArray(respuestaEmpleado?.[0])
              ? respuestaEmpleado[0]
              : [];

      if (empleados.length === 0) {
        return res.status(404).json({
          mensaje: 'El empleado no existe',
        });
      }

      // Evitar que el mismo empleado se postule dos veces.
      const respuestaExistente: any =
        await database.query(
          `
          SELECT TOP 1
            id_postulacion,
            estado
          FROM postulaciones
          WHERE fk_servicio = ${idServicio}
            AND fk_empleado = ${idEmpleado}
          `
        );

      const postulacionesExistentes: any[] =
        Array.isArray(
          respuestaExistente?.recordset
        )
          ? respuestaExistente.recordset
          : Array.isArray(
                respuestaExistente?.recordsets?.[0]
              )
            ? respuestaExistente.recordsets[0]
            : Array.isArray(
                  respuestaExistente?.[0]
                )
              ? respuestaExistente[0]
              : [];

      if (postulacionesExistentes.length > 0) {
        return res.status(409).json({
          mensaje:
            'Ya te postulaste a este servicio',
          postulacion:
            postulacionesExistentes[0],
        });
      }

      const respuestaInsertar: any =
        await database.query(
          `
          INSERT INTO postulaciones (
            fk_servicio,
            fk_empleado,
            estado,
            fecha
          )
          OUTPUT
            INSERTED.id_postulacion,
            INSERTED.fk_servicio,
            INSERTED.fk_empleado,
            INSERTED.estado,
            INSERTED.fecha
          VALUES (
            ${idServicio},
            ${idEmpleado},
            'Pendiente',
            GETDATE()
          )
          `
        );

      const postulacionesInsertadas: any[] =
        Array.isArray(
          respuestaInsertar?.recordset
        )
          ? respuestaInsertar.recordset
          : Array.isArray(
                respuestaInsertar?.recordsets?.[0]
              )
            ? respuestaInsertar.recordsets[0]
            : Array.isArray(
                  respuestaInsertar?.[0]
                )
              ? respuestaInsertar[0]
              : [];

      return res.status(201).json({
        mensaje:
          'Postulación registrada correctamente',
        postulacion:
          postulacionesInsertadas[0] ?? {
            fk_servicio: idServicio,
            fk_empleado: idEmpleado,
            estado: 'Pendiente',
          },
      });
    } catch (error: any) {
      console.error(
        'Error al registrar postulación:',
        error
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
            p.estado AS estado_postulacion,
            p.fecha AS fecha_postulacion,

            e.id_empleado,
            e.nombre AS nombre_E,
            e.correo,
            e.telefono AS celular,
            e.titulo,
            e.direccion,
            e.estado AS estado_empleado,
            e.numero_trabajos AS N_trabajos,
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
                AND estado <> 'Pendiente'
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
                AND LOWER(estado) = 'pendiente'
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
              AND estado = 'Pendiente';

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

            COMMIT TRANSACTION;

            SELECT
              ${idServicio} AS id_servicio,
              ${idEmpleado} AS fk_empleado;
          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0
              ROLLBACK TRANSACTION;

            THROW;
          END CATCH;
        `);

      return res.status(200).json({
        mensaje:
          'Empleado seleccionado correctamente',
        id_servicio: idServicio,
        fk_empleado: idEmpleado,
        resultado:
          respuesta?.recordset ??
          respuesta?.recordsets?.[0] ??
          respuesta?.[0] ??
          [],
      });
    } catch (error: any) {
      console.error(
        'Error al seleccionar empleado:',
        error
      );

      const mensajeError =
        error?.message ||
        'Error al seleccionar al empleado';

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
// AGENDA / SERVICIOS ESTADOS
// ==========================================
app.put(
  '/api/servicios/:idServicio/estado',
  async (req, res) => {
    try {
      const idServicio = Number(
        req.params.idServicio
      );

      const estadoNuevo = String(
        req.body.estado ?? ''
      ).trim();

      const motivoCancelacion = String(
        req.body.motivo_cancelacion ?? ''
      ).trim();

      const canceladoPor = String(
        req.body.cancelado_por ?? ''
      ).trim();

      if (
        !Number.isInteger(idServicio) ||
        idServicio <= 0
      ) {
        return res.status(400).json({
          mensaje: 'ID de servicio inválido',
        });
      }

      const estadosPermitidos = [
        'Asignado',
        'En proceso',
        'Completado',
        'Cancelado',
      ];

      if (
        !estadosPermitidos.includes(
          estadoNuevo
        )
      ) {
        return res.status(400).json({
          mensaje:
            'El estado indicado no es válido',
        });
      }

      if (
        estadoNuevo === 'Cancelado' &&
        motivoCancelacion.length < 5
      ) {
        return res.status(400).json({
          mensaje:
            'Debes indicar el motivo de la cancelación',
        });
      }

      if (
        estadoNuevo === 'Cancelado' &&
        canceladoPor !== 'cliente' &&
        canceladoPor !== 'empleado'
      ) {
        return res.status(400).json({
          mensaje:
            'No se pudo identificar quién canceló el servicio',
        });
      }

      const [servicios]: any =
        await database.execute(
          `
          SELECT
            id_servicio,
            estado,
            fk_empleado
          FROM servicios
          WHERE id_servicio = ?
          LIMIT 1
          `,
          [idServicio]
        );

      if (servicios.length === 0) {
        return res.status(404).json({
          mensaje: 'Servicio no encontrado',
        });
      }

      const estadoActual = String(
        servicios[0].estado ?? ''
      )
        .trim()
        .toLowerCase()
        .replace('_', ' ');

      const nuevoNormalizado =
        estadoNuevo
          .trim()
          .toLowerCase()
          .replace('_', ' ');

      const transicionesPermitidas: Record<
        string,
        string[]
      > = {
        asignado: [
          'en proceso',
          'cancelado',
        ],
        'en proceso': [
          'completado',
          'cancelado',
        ],
        completado: [],
        cancelado: [],
      };

      const siguientes =
        transicionesPermitidas[
          estadoActual
        ];

      if (
        !siguientes ||
        !siguientes.includes(
          nuevoNormalizado
        )
      ) {
        return res.status(409).json({
          mensaje: `No se puede cambiar el servicio de "${servicios[0].estado}" a "${estadoNuevo}"`,
        });
      }

      if (
        estadoNuevo !== 'Cancelado'
      ) {
        const [resultado]: any =
          await database.execute(
            `
            UPDATE servicios
            SET
              estado = ?,
              motivo_cancelacion = NULL,
              cancelado_por = NULL
            WHERE id_servicio = ?
            `,
            [
              estadoNuevo,
              idServicio,
            ]
          );

        return res.status(200).json({
          mensaje:
            'Estado actualizado correctamente',
          estado: estadoNuevo,
          actualizados:
            resultado.affectedRows,
        });
      }

      const [resultado]: any =
        await database.execute(
          `
          UPDATE servicios
          SET
            estado = 'Cancelado',
            motivo_cancelacion = ?,
            cancelado_por = ?
          WHERE id_servicio = ?
          `,
          [
            motivoCancelacion,
            canceladoPor,
            idServicio,
          ]
        );

      return res.status(200).json({
        mensaje:
          'Servicio cancelado correctamente',
        estado: 'Cancelado',
        motivo_cancelacion:
          motivoCancelacion,
        cancelado_por: canceladoPor,
        actualizados:
          resultado.affectedRows,
      });
    } catch (error: any) {
      console.error(
        'Error al actualizar estado:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al actualizar el estado del servicio',
        detalle: error.message,
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
          mensaje: "El empleado no existe",
        });
      }

      const [servicios] = await database.execute(
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

        WHERE s.fk_empleado = ?
          AND LOWER(TRIM(s.estado)) IN (
            'asignado',
            'en proceso',
            'en_proceso',
            'completado'
          )

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

/*app.get(
  "/api/empleados/:idEmpleado/servicios",
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

      const [servicios] =
        await database.execute(
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
            s.estado,
            c.nombre_C AS nombre_cliente,
            c.foto AS foto_cliente,
            cat.nombre AS nombre_categoria
          FROM servicios s
          LEFT JOIN clientes c
            ON c.id_cliente = s.fk_cliente
          LEFT JOIN categorias cat
            ON cat.id_categoria = s.fk_categoria
          WHERE s.fk_empleado = ?
            AND LOWER(s.estado) IN (
              'asignado',
              'en proceso',
              'en_proceso',
              'completado'
            )
          ORDER BY
            s.fecha ASC,
            s.hora_inicio ASC
          `,
          [idEmpleado]
        );

      return res.status(200).json(servicios);
    } catch (error) {
      console.error(
        "Error al consultar agenda:",
        error
      );

      return res.status(500).json({
        mensaje:
          "Error al consultar la agenda",
      });
    }
  }
);*/

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

// ==========================================
// RESERVAS Y RESEÑAS
// ==========================================
app.get('/api/reservas/:id', async (req, res) => {
  try {
    const idReserva = Number(req.params.id);

    if (!Number.isInteger(idReserva) || idReserva <= 0) {
      return res.status(400).json({ mensaje: 'ID de reserva inválido' });
    }

    const [rows]: any = await database.execute(
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

    if (!id_reserva || !id_empleado || !calificacion_general) {
      return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
    }

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
        id_reserva,
        id_empleado,
        calificacion_general,
        puntualidad || null,
        calidad || null,
        comunicacion || null,
        comentario || null,
      ]
    );

    return res.status(201).json({ mensaje: 'Reseña registrada correctamente', resultado });
  } catch (error: any) {
    console.error('Error al registrar reseña:', error);
    return res.status(500).json({ mensaje: 'Error al registrar la reseña', detalle: error.message });
  }
});

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
            estado
          FROM empleados
          WHERE id_empleado <> ${idUsuario}
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
            'Cliente' AS estado
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