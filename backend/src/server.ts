import express from "express";
import cors from "cors";
import "dotenv/config";

import { database } from "./config/database.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

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
        nombre_E,
        password_E,
        correo,
        celular,
        titulo,
        dni,
        antecedente,
        direccion,
        fk_categoria,
        estado,
        N_trabajos,
        fechaCreacion
      )
      VALUES
      (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?, NOW())
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
        nombre_E,
        correo,
        celular,
        titulo,
        dni,
        direccion,
        fk_categoria,
        estado,
        N_trabajos,
        fechaCreacion
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
      (nombre_C, password_C, correo, celular, dni, fechaCreacion, foto)
      VALUES (?, ?, ?, ?, NULL, NOW(), NULL)
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
      "SELECT id_cliente, nombre_C, correo, celular, dni, fechaCreacion FROM clientes"
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
        "SELECT id_cliente AS id, nombre_C AS nombre, correo, celular FROM clientes WHERE correo = ? AND password_C = ?",
        [correo, password]
      );
      if (rows.length > 0) usuario = rows[0];
    } else if (rol === 'worker') {
      const [rows]: any = await database.execute(
        "SELECT id_empleado AS id, nombre_E AS nombre, correo, celular FROM empleados WHERE correo = ? AND password_E = ?",
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
      fecha
    } = req.body;

    if (!fk_cliente || !fk_categoria || !descripcion || !direccion || !presupuesto || !fecha) {
      return res.status(400).json({
        mensaje: "Faltan datos obligatorios para crear la solicitud"
      });
    }

    const [resultado] = await database.execute(
      `
      INSERT INTO servicios 
      (fk_cliente, fk_categoria, fk_evidencia, descripcion, direccion, presupuesto, fecha) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        fk_cliente,
        fk_categoria,
        fk_evidencia || null, // Si no viene, guardamos null
        descripcion,
        direccion,
        presupuesto,
        fecha
      ]
    );

    res.status(201).json({
      mensaje: "Solicitud publicada correctamente",
      resultado
    });
  } catch (error) {
    console.error("Error al registrar servicio:", error);
    res.status(500).json({
      mensaje: "Error al publicar la solicitud"
    });
  }
});

app.get("/api/servicios", async (_req, res) => {
  try {
    const [servicios] = await database.query(
      "SELECT * FROM servicios ORDER BY fecha DESC"
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
app.get("/api/servicios/:id", async (req, res) => {
  try {
    const idServicio = Number(req.params.id);

    const [resultado]: any = await database.execute(
      `
      SELECT *
      FROM servicios
      WHERE id_servicio = ?
      `,
      [idServicio]
    );

    if (resultado.length === 0) {
      return res.status(404).json({
        mensaje: "Servicio no encontrado",
      });
    }

    res.json(resultado[0]);
  } catch (error) {
    console.error("Error al consultar servicio:", error);

    res.status(500).json({
      mensaje: "Error al consultar el servicio",
    });
  }
});

// ==========================================
// RUTAS DE SERVICIOS / SOLICITUDES (UPDATE)
// ==========================================
app.put("/api/servicios/:id", async (req, res) => {
  try {
    const idServicio = Number(req.params.id);

    const {
      fk_cliente,
      fk_categoria,
      fk_evidencia,
      descripcion,
      direccion,
      presupuesto,
      fecha,
    } = req.body;

    const [resultado]: any = await database.execute(
      `
      UPDATE servicios
      SET
        fk_cliente = ?,
        fk_categoria = ?,
        fk_evidencia = ?,
        descripcion = ?,
        direccion = ?,
        presupuesto = ?,
        fecha = ?
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
        idServicio,
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Servicio no encontrado",
      });
    }

    res.json({
      mensaje: "Servicio actualizado correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar servicio:", error);

    res.status(500).json({
      mensaje: "Error al actualizar el servicio",
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
      "SELECT id_categoria, nombre, subCatgeoria FROM categorias"
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
// RUTA PARA ACTUALIZAR DISPONIBILIDAD (WORKER)
// ==========================================
app.patch('/api/workers/:id/disponibilidad', async (req, res) => {
  const { id } = req.params;
  const { disponible } = req.body; // Se espera un booleano: true (Disponible) o false (No disponible)

  try {
    // Definimos el valor del estado basado en el booleano
    // Ajusta los strings 'Disponible' y 'No disponible' según los valores que uses en tu DB
    const nuevoEstado = disponible ? 'Disponible' : 'No disponible';

    const [resultado]: any = await database.execute(
      "UPDATE empleados SET estado = ? WHERE id_empleado = ?",
      [nuevoEstado, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Trabajador no encontrado" });
    }

    res.json({
      mensaje: "Disponibilidad actualizada correctamente",
      nuevoEstado
    });
  } catch (error) {
    console.error("Error al actualizar disponibilidad:", error);
    res.status(500).json({
      mensaje: "Error interno al actualizar disponibilidad"
    });
  }
});

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

