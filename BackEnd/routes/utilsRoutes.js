import express from "express";
import sql from "mssql";
import { poolCIMA } from '../config/dbConnections.js';
const router = express.Router();

//LINES CONFIG

router.get("/get-lines-config", async (req, res) => {
    const { lineId } = req.query;
    try {
        const result = await poolCIMA.request()
            .input('LineId', sql.VarChar(20), lineId)
            .execute("sp_GetLinesConfig");

        return res.json(result.recordset);
    }
    catch (err) {
        console.error("Error:", err);
        return res.status(500).json({
            message: "get-lines-config : Error al obtener shift status",
            success: false
        });
    }
});

router.get("/shift-status", async (req, res) => {
    const { fecha, lineId, lineNo } = req.query;
    try {
        const result = await poolCIMA.request()
            .input('FechaConsulta', sql.Date, fecha)
            .input('LineId', sql.VarChar(20), lineId)
            .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
            .execute("SHIFT_STATUS");

        return res.json(result.recordset);
    }
    catch (err) {
        console.error("Error al obtener shift status:", err);
        return res.status(500).json({ error: "Error al obtener shift status" });
    }

});

//TURNOS

router.post("/shift-toggle", async (req, res) => {
    const { fecha, lineId, turno, nuevoEstado, lineNo } = req.body;

    if (!fecha || !lineId || !turno || nuevoEstado === undefined) {
        return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    try {
        const result = await poolCIMA.request().
            input('Fecha', sql.Date, fecha)
            .input('LineId', sql.VarChar(20), lineId)
            .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
            .input('Turno', sql.Int, turno)
            .input('NuevoEstado', sql.Bit, nuevoEstado ? 1 : 0)
            .execute("SHIFT_TOGGLE");

        return res.status(200).json({
            message: `toggle-shift: Estado de turno actualizado correctamente`,
            success: true
        });
    }
    catch (err) {
        console.error("/toggle-shift:", err);
        return res.status(500).json({
            success: false,
            error: "Error interno del servidor al actualizar el turno"
        });
    }
});

//METAS DEFAULT
router.post("/default-goal-update-shift", async (req, res) => {
    const { lineId, turno, metaDefault, lineNo } = req.body;
    try {
        const result = await poolCIMA.request()
            .input('LineId', sql.VarChar(20), lineId)
            .input('Turno', sql.Int, turno)
            .input('MetaDefault', sql.Int, metaDefault)
            .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
            .execute("SP_METAS_DEFAULT_UPDATE_SHIFT");

        return res.status(200).json({
            success: true,
            message: "default-goal-update-shift: Metas actualizada correctamente"
        })
    }
    catch (err) {
        console.error("default-goal-update-shift:", err);
        return res.status(500).json({
            success: false,
            error: "Error interno del servidor al actualizar la meta"
        });
    }
});

router.post("/default-goal-update-timeslot", async (req, res) => {
    const { lineId, horaSlot, metaDefault, lineNo } = req.body;
    try {
        const result = await poolCIMA.request()
            .input('LineId', sql.VarChar(20), lineId)
            .input('Hora_slot', sql.VarChar(13), horaSlot)
            .input('MetaDefault', sql.Int, metaDefault)
            .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
            .execute("SP_METAS_DEFAULT_UPDATE_TIMESLOT");

        return res.status(200).json({
            success: true,
            message: "default-goal-update-shift: Metas actualizada correctamente"
        })
    }
    catch (err) {
        console.error("default-goal-update-timeslot:", err);
        return res.status(500).json({
            success: false,
            error: "Error interno del servidor al actualizar la meta"
        });
    }
});

//METAS CUSTOM

router.post("/custom-goal-update", async (req, res) => {
    const { lineId, fecha, turno, horaSlot, metaCustom, user, lineNo } = req.body;
    try {
        const result = await poolCIMA.request()
            .input('LineId', sql.VarChar(20), lineId)
            .input('Fecha', sql.Date, fecha)
            .input('Turno', sql.Int, turno)
            .input('Hora_Slot', sql.VarChar(13), horaSlot)
            .input('MetaCustom', sql.Int, metaCustom)
            .input('UsuarioModifico', sql.VarChar(50), user)
            .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
            .execute("SP_METAS_CUSTOM_UPSERT");

        return res.status(200).json({
            success: true,
            message: "custom-goal-update: Meta actualizada correctamente"
        });
    }
    catch (err) {
        console.error("custom-goal-update:", err);
        return res.status(500).json({
            success: false,
            error: "Error interno del servidor al actualizar la meta"
        })
    }
});

//METAS EFECTIVAS PARA EL DASHBOARD CONSOLIDADO POR LINEA

router.get("/line-effective-goal-shift", async (req, res) => {
    const { lineId, fecha, turno, lineNo } = req.query;
    try {
        const fechaActual = new Date();
        const horaActual = fechaActual.toTimeString().split(' ')[0];
        //console.log("horaActual: ", horaActual);

        const result = await poolCIMA.request()
            .input('LineId', sql.VarChar(20), lineId)
            .input('Fecha', sql.Date, fecha)
            .input('Turno', sql.Int, turno)
            .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
            .input('HoraActual', sql.VarChar, horaActual)
            .execute("SP_OBTENER_METAS_EFECTIVAS_ACUMULADAS");

        return res.status(200).json({
            success: true,
            message: "line-effective-goal: Meta obtenida correctamente",
            data: result.recordset
        });
    }
    catch (err) {
        console.error("line-effective-goal:", err);
        return res.status(500).json({
            success: false,
            error: "Error interno del servidor al obtener la meta efectiva"
        })
    }
});

router.get("/line-effective-goal-day", async (req, res) => {
    const { lineId, fecha, lineNo } = req.query;
    try {
        const fechaActual = new Date();
        const horaActual = fechaActual.toTimeString().split(' ')[0];
        //console.log("horaActual: ", horaActual);

        const result = await poolCIMA.request()
            .input('LineId', sql.VarChar(20), lineId)
            .input('Fecha', sql.Date, fecha)
            .input('NumeroLinea', sql.Int, lineNo ? lineNo : 1)
            .input('HoraActual', sql.VarChar, horaActual)
            .execute("SP_OBTENER_METAS_EFECTIVAS_DIA_COMPLETO");

        return res.status(200).json({
            success: true,
            message: "line-effective-goal-day: Meta obtenida correctamente",
            data: result.recordset
        });
    }
    catch (err) {
        console.error("line-effective-goal-day:", err);
        return res.status(500).json({
            success: false,
            error: "Error interno del servidor al obtener la meta efectiva"
        })
    }
});

export default router;