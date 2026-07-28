//server.ts
import express from "express";
import cors from "cors";
import "dotenv/config";
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
        password_E,
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

    const [empleados]: any = await database.execute(
      `
      SELECT
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

    res.json(empleados[0]);
  } catch (error) {
    console.error("Error al consultar empleado:", error);

    res.status(500).json({
      mensaje: "Error al consultar empleado",
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

    const [resultado] = await database.execute(
      `
      INSERT INTO clientes
      (nombre, password_hash, correo, telefono, dni, foto_url)
      VALUES (?, ?, ?, ?, NULL, NULL);
      SELECT SCOPE_IDENTITY() AS insertId;
      `,
      [
        nombre_C,
        password_C,
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

app.get("/api/clientes", async (_req, res) => {
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
});

// ==========================================
// ACTUALIZAR CLIENTE
// ==========================================
app.put("/api/clientes/:id", async (req, res) => {
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

    const [resultado]: any = await database.execute(
      `
      UPDATE clientes
      SET
        nombre = ?,
        correo = ?,
        telefono = ?,
        dni = ?,
        password_hash = ?,
        foto_url = ?
      WHERE id_cliente = ?
      `,
      [
        nombre_C,
        correo,
        celular || null,
        dni || null,
        password_C || null,
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
        "SELECT id_cliente AS id, nombre AS nombre, correo, telefono AS celular, NULL AS estado, foto_url AS foto FROM clientes WHERE correo = ? AND password_hash = ?",
        [correo, password]
      );
      if (rows.length > 0) usuario = rows[0];
    } else if (rol === 'worker') {
      const [rows]: any = await database.execute(
        "SELECT id_empleado AS id, nombre AS nombre, correo, telefono AS celular, estado, foto_url AS foto FROM empleados WHERE correo = ? AND password_hash = ?",
        [correo, password]
      );
      if (rows.length > 0) usuario = rows[0];
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

    c.nombre_C AS nombre_cliente,
    c.foto AS foto_cliente,

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

    const [resultado]: any =
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

          e.nombre_E AS nombre_empleado,

          cat.nombre AS nombre_categoria

        FROM servicios s

        LEFT JOIN clientes c
          ON c.id_cliente = s.fk_cliente

        LEFT JOIN empleados e
          ON e.id_empleado = s.fk_empleado

        LEFT JOIN categorias cat
          ON cat.id_categoria = s.fk_categoria

        WHERE s.id_servicio = ?
        LIMIT 1
        `,
        [idServicio]
      );

    if (resultado.length === 0) {
      return res.status(404).json({
        mensaje: 'Servicio no encontrado',
      });
    }

    return res.json(resultado[0]);
  } catch (error) {
    console.error(
      'Error al consultar servicio:',
      error
    );

    return res.status(500).json({
      mensaje:
        'Error al consultar el servicio',
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
app.get("/api/empleados/:id/categorias", async (req, res) => {
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
});



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
    const nuevoEstado = valorDisponible ? 'Activo' : 'Descansando';

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
});

// ==========================================
// OBTENER MENSAJES ENTRE CLIENTE Y EMPLEADO
// ==========================================
app.get(
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

      const [servicios]: any =
        await database.execute(
          `
          SELECT
            id_servicio,
            estado
          FROM servicios
          WHERE id_servicio = ?
          LIMIT 1
          `,
          [idServicio]
        );

      if (servicios.length === 0) {
        return res.status(404).json({
          mensaje: 'El servicio no existe',
        });
      }

      if (
        servicios[0].estado !== 'Pendiente'
      ) {
        return res.status(400).json({
          mensaje:
            'Este servicio ya no acepta postulaciones',
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

      await database.execute(
        `
        INSERT INTO postulaciones (
          fk_servicio,
          fk_empleado,
          estado
        )
        VALUES (?, ?, 'pendiente')
        `,
        [
          idServicio,
          idEmpleado,
        ]
      );

      return res.status(201).json({
        mensaje:
          'Postulación registrada correctamente',
      });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          mensaje:
            'Ya te postulaste a este servicio',
        });
      }

      console.error(
        'Error al registrar postulación:',
        error
      );

      return res.status(500).json({
        mensaje:
          'Error al registrar la postulación',
        detalle: error.message,
      });
    }
  }
);

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
);

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
            e.celular,
            e.titulo,
            e.direccion,
            e.estado AS estado_empleado,
            e.N_trabajos

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
);

// ==========================================
//  SERVICIOS ACEPTADOS 
// ==========================================

app.put(
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
);

// ==========================================
// RECHAZAR POSTULACION (individual)
// ==========================================
app.put('/api/postulaciones/:idPostulacion/rechazar', async (req, res) => {
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
});

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
