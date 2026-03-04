//BackEnd desarrollado por Jorge Barrón
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Configuración para obtener __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

app.use(cors({
     origin: 'http://10.13.225.156:96' //  URL del frontend en prod
}));

const dbConfig = {
    host: process.env.DB_SERVER, 
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

let connection;

// ===========================================================
// RUTAS DE LA API PARA LA TABLA DE PRODUCCION DE ELECTRONICS
// ===========================================================

app.get("/api/productividad", async (req, res) => {
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("select Station, CH, Model, Lot, TestTime, SN, TestResult, Firmware_Download from tinyfct order by TestTime desc limit 10");
        res.json(rows);
    } catch (err) {
        console.error("Error al conectar con MySQL Server:", err);
        res.status(500).json({ error: "Error al conectar con MySQL Server." });
    } finally {
        if (connection) await connection.end();
    }
});

app.get("/api/getModeloElectronics", async (req, res) => {
    let connection;
    try{
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("select Model from tinyfct order by TestTime desc limit 1");
        res.json(rows);
    }catch(err){
        console.error("Error al conectar con MySQL Server:", err);
        res.status(500).json({ error: "Error al conectar con MySQL Server." });
    }finally{
        if (connection) await connection.end();
    }
});

app.get("/api/produccion-real", async (req, res) => {
    let connection;
    try {
        const { fecha, turno } = req.query;
        if (!fecha || !turno) {
            return res.status(400).json({ error: "Faltan parámetros: fecha y turno son requeridos." });
        }
        connection = await mysql.createConnection(dbConfig);
        const query = "CALL GetProduccionRealPorHora(?, ?)";
        const [rows] = await connection.execute(query, [fecha, turno]);
        res.json(rows[0]); 
    } catch (err) {
        console.error("Error al ejecutar Stored Procedure:", err);
        res.status(500).json({ error: "Error interno del servidor." });
    } finally {
        if (connection) await connection.end();
    }
});

app.post("/api/guardar-reporte", async (req, res) => {
    let connection;
    try {
        const reportData = req.body;
        if (!Array.isArray(reportData) || reportData.length === 0) {
            return res.status(400).json({ error: "Datos de reporte inválidos o vacíos." });
        }
        connection = await mysql.createConnection(dbConfig);
        for (const row of reportData) {
            const { Fecha, Turno, Hora_Slot, Supervisor, Lider, Batch, Modelo, Perdidas, Observaciones } = row;
            const query = "CALL GuardarReporteTablaProd(?, ?, ?, ?, ?, ?, ?, ?, ?)";
            await connection.execute(query, [
                Fecha, Turno, Hora_Slot, Supervisor, Lider, Batch, Modelo, Perdidas || 0, Observaciones || '' 
            ]);
        }
        res.status(200).json({ message: "Datos de reporte guardados exitosamente." });
    } catch (err) {
        console.error("Error al guardar el reporte:", err);
        res.status(500).json({ error: "Error interno del servidor." });
    } finally {
        if (connection) await connection.end();
    }
});

// ==========================================
// SERVIR EL FRONTEND (REACT)
// ==========================================

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server corriendo en el puerto ${PORT}`));
