import express from "express";
import sql from "mssql";
import { poolCIMA } from '../config/dbConnections.js';
const router = express.Router();

//LINES CONFIG

router.get("/get-lines-config", async (req, res) => {
    const {lineId} = req.query;
    try {
        const result = await poolCIMA.request()
        .input('LineId', sql.VarChar(20), lineId)
        .execute("sp_GetLinesConfig");

        return res.json(result.recordset);
    }
    catch(err){
        console.error("Error:", err);
    }
});

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

//TURNOS

router.post("/shift-toggle", async (req, res) => {
    const { fecha, lineId, turno, nuevoEstado, lineNo } = req.body;

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
            message:`toggle-shift: Estado de turno actualizado correctamente`,
            success: true
        });
    }
    catch(err){
        console.error("/toggle-shift:", err);
        res.status(500).json({ 
            success: false, 
            error: "Error interno del servidor al actualizar el turno"
        });
    }
});

//METAS DEFAULT
router.post("/default-goal-update-shift", async (req, res) =>{
    const {lineID, turno, metaDefault, lineNo} = req.body;
    try{
        const result = await poolCIMA.request()
        .input('LineId', sql.VarChar(20), lineID)
        .input('Turno', sql.Int, turno)
        .input('MetaDefault', sql.Int, metaDefault)
        .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
        .execute("SP_METAS_DEFAULT_UPDATE_SHIFT");

        res.status(200).json({
            success :true,
            message: "default-goal-update-shift: Metas actualizada correctamente"
        })
    }
    catch(err){
        console.error("default-goal-update-shift:", err);
        res.status(500).json({
            success: false,
            error: "Error interno del servidor al actualizar la meta"
        });
    }
});

router.post("/default-goal-update-timeslot", async (req, res) =>{
    const {lineID, horaSlot, metaDefault, lineNo} = req.body;
    try{
        const result = await poolCIMA.request()
        .input('LineId', sql.VarChar(20), lineID)
        .input('Hora_slot', sql.VarChar(13), horaSlot)
        .input('MetaDefault', sql.Int, metaDefault)
        .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
        .execute("SP_METAS_DEFAULT_UPDATE_TIMESLOT");

        res.status(200).json({
            success :true,
            message: "default-goal-update-shift: Metas actualizada correctamente"
        })
    }
    catch(err){
        console.error("default-goal-update-shift:", err);
        res.status(500).json({
            success: false,
            error: "Error interno del servidor al actualizar la meta"
        });
    }
});

//METAS CUSTOM

router.post("/custom-goal-update", async (req, res) => {
    const {lineId, fecha, turno, horaSlot, metaCustom, user, lineNo} = req.body;
    try{
        const result = await poolCIMA.request()
        .input('LineId',sql.VarChar(20), lineId)
        .input('Fecha', sql.Date, fecha)
        .input('Turno', sql.Int, turno)
        .input('Hora_Slot', sql.VarChar(13), horaSlot)
        .input('MetaCustom', sql.Int, metaCustom)
        .input('UsuarioModifico', sql.VarChar(50), user)
        .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
        .execute("SP_METAS_CUSTOM_UPSERT");

        res.status(200).json({
            success: true,
            message: "custom-goal-update: Meta actualizada correctamente"
        });
    }
    catch(err){
        console.error("custom-goal-update:", err);
        res.status(500).json({
            success: false,
            error: "Error interno del servidor al actualizar la meta"
        })
    }
});

export default router;