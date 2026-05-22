import express from "express";
import { mysqlPool } from "../config/dbConnections.js";

const router = express.Router();

router.get("/productividad", async (req, res) => {
    try {
        const [rows] = await mysqlPool.execute("select Station, CH, Model, Lot, TestTime, SN, TestResult, Firmware_Download from tinyfct order by TestTime desc limit 10");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Error MySQL" });
    }
});

router.get("/produccion-real", async (req, res) => {
    try {
        const { fecha, turno } = req.query;
        const [rows] = await mysqlPool.execute("CALL GetProduccionRealPorHora(?, ?)", [fecha, turno]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Error SP Electronics" });
    }
});

router.post("/guardar-reporte", async (req, res) => {
    try {
        const reportData = req.body;
        for (const row of reportData) {
            const { Fecha, Turno, Hora_Slot, Supervisor, Lider, Batch, Modelo, Perdidas, Observaciones } = row;
            await mysqlPool.execute(
                "CALL GuardarReporteTablaProd(?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [Fecha, Turno, Hora_Slot, Supervisor, Lider, Batch, Modelo, Perdidas || 0, Observaciones || '']
            );
        }
        res.status(200).json({ message: "Guardado exitoso" });
    } catch (err) {
        res.status(500).json({ error: "Error al guardar" });
    }
});

router.get("/getModeloElectronics", async (req, res) => {
    try{
        const [rows] = await mysqlPool.execute("select Model from tinyfct order by TestTime desc limit 1");
        res.json(rows);
    }catch(err){
        console.error("Error al conectar con MySQL Server:", err);
        res.status(500).json({ error: "Error al conectar con MySQL Server. Por favor, verifica la conexión y credenciales." });
    }
});

export default router;
