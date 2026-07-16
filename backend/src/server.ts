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



app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});