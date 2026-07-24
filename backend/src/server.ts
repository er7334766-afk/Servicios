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
        nombre_E,
        correo,
        celular,
        titulo,
        dni,
        antecedente,
        direccion,
        estado,
        N_trabajos,
        fechaCreacion
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
    } = req.body;

    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      return res.status(400).json({
        mensaje: "ID de empleado inválido",
      });
    }

    const [resultado]: any = await database.execute(
      `
      UPDATE empleados
      SET
        nombre_E = ?,
        correo = ?,
        celular = ?,
        titulo = ?,
        dni = ?,
        antecedente = ?,
        direccion = ?
      WHERE id_empleado = ?
      `,
      [
        nombre_E,
        correo,
        celular,
        titulo,
        dni,
        antecedente,
        direccion,
        idEmpleado,
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensaje: "Empleado no encontrado",
      });
    }

    res.json({
      mensaje: "Perfil actualizado correctamente",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
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
        nombre_C = ?,
        correo = ?,
        celular = ?,
        dni = ?,
        password_C = ?,
        foto = ?
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
        nombre_C,
        correo,
        celular,
        dni,
        foto,
        fechaCreacion
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
        e.nombre_E,
        e.correo,
        e.celular,
        e.titulo,
        e.direccion,
        e.estado,
        e.N_trabajos,
        c.id_categoria,
        c.nombre AS categoria
      FROM empleados e
      INNER JOIN empleado_categorias ec
        ON ec.id_empleado = e.id_empleado
      INNER JOIN categorias c
        ON c.id_categoria = ec.id_categoria
      WHERE c.id_categoria = ?
      ORDER BY e.nombre_E ASC
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
  SELECT
    c.id_categoria,
    c.nombre,
    c.subCatgeoria
  FROM categorias c
  INNER JOIN empleado_categorias ec
    ON ec.id_categoria = c.id_categoria
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

    const [resultado]: any = await database.execute(
      `
      INSERT INTO chat
      (
        fk_cliente,
        fk_empleado,
        remitente,
        mensaje,
        fecha
      )
      VALUES (?, ?, ?, ?, NOW())
      `,
      [
        idCliente,
        idEmpleado,
        remitente,
        textoMensaje,
      ]
    );

    return res.status(201).json({
      mensaje: "Mensaje enviado correctamente",
      chat: {
        id_chat: resultado.insertId,
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
      const idCliente = Number(
        req.params.idCliente
      );

      const idEmpleado = Number(
        req.params.idEmpleado
      );

      const [mensajes]: any =
        await database.execute(
          `
          SELECT
            id_chat,
            fk_cliente,
            fk_empleado,
            remitente,
            mensaje,
            leido,
            fecha
          FROM chat
          WHERE fk_cliente = ?
            AND fk_empleado = ?
          ORDER BY fecha ASC, id_chat ASC
          `,
          [idCliente, idEmpleado]
        );

      return res.status(200).json(
        mensajes
      );
    } catch (error: any) {
      return res.status(500).json({
        mensaje:
          'Error al consultar los mensajes',
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
          c.fk_cliente AS id,
          cl.nombre_C AS participantName,
          cl.foto AS participantAvatar,
          c.mensaje AS lastMessage,
          c.fecha AS lastMessageTime,
          0 AS unreadCount,
          0 AS participantOnline
        FROM chat c
        INNER JOIN clientes cl
          ON cl.id_cliente = c.fk_cliente
        INNER JOIN (
          SELECT
            fk_cliente,
            MAX(id_chat) AS ultimoMensaje
          FROM chat
          WHERE fk_empleado = ?
          GROUP BY fk_cliente
        ) ultimos
          ON ultimos.ultimoMensaje = c.id_chat
        WHERE c.fk_empleado = ?
        ORDER BY c.fecha DESC
        `,
        [idEmpleado, idEmpleado]
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
          c.fk_empleado AS id,
          e.nombre_E AS participantName,
          NULL AS participantAvatar,
          c.mensaje AS lastMessage,
          c.fecha AS lastMessageTime,
          0 AS unreadCount,
          CASE
            WHEN e.estado = 'Disponible' THEN 1
            ELSE 0
          END AS participantOnline
        FROM chat c
        INNER JOIN empleados e
          ON e.id_empleado = c.fk_empleado
        INNER JOIN (
          SELECT
            fk_empleado,
            MAX(id_chat) AS ultimoMensaje
          FROM chat
          WHERE fk_cliente = ?
          GROUP BY fk_empleado
        ) ultimos
          ON ultimos.ultimoMensaje = c.id_chat
        WHERE c.fk_cliente = ?
        ORDER BY c.fecha DESC
        `,
        [idCliente, idCliente]
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

    /*
     * Si lee el empleado, se marcan como leídos
     * los mensajes que envió el cliente.
     *
     * Si lee el cliente, se marcan como leídos
     * los mensajes que envió el empleado.
     */
    const remitenteMensaje =
      lector === "empleado"
        ? "cliente"
        : "empleado";

    const [resultado]: any =
      await database.execute(
        `
        UPDATE chat
        SET leido = 1
        WHERE fk_cliente = ?
          AND fk_empleado = ?
          AND remitente = ?
          AND leido = 0
        `,
        [
          idCliente,
          idEmpleado,
          remitenteMensaje,
        ]
      );

    return res.status(200).json({
      mensaje: "Mensajes marcados como leídos",
      actualizados: resultado.affectedRows,
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
            id_servicio,
            fk_cliente,
            fk_empleado,
            titulo,
            descripcion,
            direccion,
            presupuesto,
            fecha,
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

console.log('RUTA ACEPTAR CARGADA');
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
// INICIO DEL SERVIDOR
// ==========================================
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});

