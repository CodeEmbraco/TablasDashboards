import express from "express";
import sql from "mssql";
import { poolCIMA } from '../config/dbConnections.js';
const router = express.Router();

router.get("/shift-status", async (req, res) => {
    const { fecha, lineId, lineNo} = req.query;
    try {
        const result = await poolCIMA.request()
        .input('FechaConsulta', sql.Date, fecha)
        .input('LineId', sql.VarChar(20), lineId)
        .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
        .execute("SHIFT_STATUS");

        return res.json(result.recordset);
    }
    catch(err){
        console.error("Error al obtener shift status:", err);
        res.status(500).json({ error: "Error al obtener shift status" });
    }

});

router.post("/shift-toggle", async (req, res) => {
    const { fecha, lineId, turno, nuevoEstado, lineNo } = req.body;

    //DEBUG:
    //console.log("Info del body:",req.body,"\n", fecha, lineId, turno, nuevoEstado, lineNo);
    //----------------
    if (!fecha || !lineId || !turno || nuevoEstado === undefined) {
            return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try{
        const result = await poolCIMA.request().
        input('Fecha', sql.Date, fecha)
        .input('LineId', sql.VarChar(20), lineId)
        .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
        .input('Turno', sql.Int, turno)
        .input('NuevoEstado', sql.Bit, nuevoEstado ? 1 : 0)
        .execute("SHIFT_TOGGLE");

        res.status(200).json({
            message:`Estado del turno ${turno} cambiado a ${nuevoEstado} en ${lineId}${lineNo}`,
            success: true
        });
    }
    catch{
        console.error("Error en /toggle-shift:", error);
        res.status(500).json({ 
            success: false, 
            error: "Error interno del servidor al actualizar el turno"
        });
    }
});

export default router;