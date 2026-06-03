import express from "express";
import sql from "mssql";
import { sqlConfigCIMA } from "../config/dbConnections.js";
import { mysqlPool } from "../config/dbConnections.js";

const router = express.Router();
/**
 * 1. OBTENER PRODUCCIÓN POR HORA
 * URL ejemplo: /hourly?fecha=2026-05-20&turno=1
 */
router.get('/hourly', async (req, res) => {
    const { fecha, turno } = req.query;

    if (!fecha || !turno) {
        return res.status(400).json({ error: 'Faltan los parámetros requeridos: fecha y turno' });
    }

    try {
        // En MySQL, los Stored Procedures se ejecutan con CALL
        const [result] = await mysqlPool.query('CALL ELECTRO_HOURLY(?, ?)', [fecha, turno]);
        
        // MySQL devuelve un array de arrays para los SPs; las filas reales están en la primera posición
        res.json(result[0]);
    } catch (error) {
        console.error('Error en /hourly:', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar la producción por hora' });
    }
});

/**
 * 2. OBTENER PRODUCCIÓN TOTAL DEL DÍA
 * URL ejemplo: /total-day?fecha=2026-05-20
 */
router.get('/total-day', async (req, res) => {
    const { fecha } = req.query;

    if (!fecha) {
        return res.status(400).json({ error: 'Falta el parámetro requerido: fecha' });
    }

    try {
        const [result] = await mysqlPool.query('CALL ELECTRO_TOTALDAY(?)', [fecha]);
        
        // Como este SP devuelve una sola fila, puedes enviar result[0][0] o todo el array
        res.json(result[0][0] || { TOTAL_DIA: 0 });
    } catch (error) {
        console.error('Error en /total-day:', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar el total del día' });
    }
});

/**
 * 3. OBTENER TOTAL POR TURNOS DEL DÍA
 * URL ejemplo: /total-shift?fecha=2026-05-20
 */
router.get('/total-shift', async (req, res) => {
    const { fecha } = req.query;

    if (!fecha) {
        return res.status(400).json({ error: 'Falta el parámetro requerido: fecha' });
    }

    try {
        const [result] = await mysqlPool.query('CALL ELECTRO_TOTALSHIFT(?)', [fecha]);
        res.json(result[0]);
    } catch (error) {
        console.error('Error en /total-shift:', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar los totales por turno' });
    }
});

/**
 * 4. OBTENER TOTAL DE UN TURNO ESPECÍFICO
 * URL ejemplo: /shift?fecha=2026-05-20&turno=1
 */
router.get('/shift', async (req, res) => {
    const { fecha, turno } = req.query;

    if (!fecha || !turno) {
        return res.status(400).json({ error: 'Faltan los parámetros requeridos: fecha y turno' });
    }

    try {
        const [result] = await mysqlPool.query('CALL ELECTRO_SHIFT(?, ?)', [fecha, turno]);
        res.json(result[0][0] || { TOTAL_TURNO: 0 });
    } catch (error) {
        console.error('Error en /shift:', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar el total del turno' });
    }
});

router.post("/save", async(req, res) =>{
    let poolCIMA;
    try {
        const reportData = req.body;
        //----------------------
        //DEBUG
        console.log("Que recibimos, Electronics?", reportData);
        //----------------------

        if (!Array.isArray(reportData) || reportData.length === 0) {
            return res.status(400).json({ error: "Datos de reporte inválidos o vacíos." });
        }

        poolCIMA = new sql.ConnectionPool(sqlConfigCIMA);
        await poolCIMA.connect();

        const dataPorHora = {};

        reportData.forEach(row => {
            if (!dataPorHora[row.Hora_Slot]) {
                dataPorHora[row.Hora_Slot] = [];
            }
            dataPorHora[row.Hora_Slot].push(row);
        });

        for (const horaSlot in dataPorHora) {
            const filasDeEstaHora = dataPorHora[horaSlot];
            const { Fecha, Turno } = filasDeEstaHora[0];

            await poolCIMA.request()
                .input('Fecha', sql.Date, Fecha)
                .input('Turno', sql.Int, Turno)
                .input('Hora', sql.VarChar, horaSlot)
                .query(`
                    DELETE FROM tbl_HistProdElectro
                    WHERE CAST(FECHA AS DATE) = @Fecha
                      AND TURNO = @Turno
                      AND HORA = @Hora
                `);

            for (const row of filasDeEstaHora) {
                await poolCIMA.request()
                    .input('Fecha', sql.Date, row.Fecha)
                    .input('Turno', sql.Int, row.Turno)
                    .input('Hora_Slot', sql.VarChar, row.Hora_Slot)
                    .input('Supervisor', sql.VarChar, row.Supervisor)
                    .input('Lider', sql.VarChar, row.Lider)
                    .input('Perdidas', sql.Int, row.Perdidas || 0)
                    .input('Observaciones', sql.VarChar, row.Observaciones || '')
                    .input('Modelo', sql.VarChar, row.Modelo)
                    .input('Motivo', sql.VarChar, row.Motivo || '')
                    .query(`
                        INSERT INTO tbl_HistProdElectro (FECHA, TURNO, HORA, SUPERVISOR, LIDER, PERDIDAS, OBSERVACIONES, MODELO, MOTIVO)
                        VALUES (@Fecha, @Turno, @Hora_Slot, @Supervisor, @Lider, @Perdidas, @Observaciones, @Modelo, @Motivo)
                    `);
            }
        }

        res.status(200).json({ message: "Reporte guardado con desglose correctamente." });

    } catch (err) {
        console.error("Error al guardar el reporte Electronics:", err);
        res.status(500).json({ error: "Error interno del servidor al guardar." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

router.get("/reports", async (req, res) => {
    const { fecha, turno } = req.query;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros fecha o turno" });
    }

    let poolCIMA;

    try {
        poolCIMA = new sql.ConnectionPool(sqlConfigCIMA);
        await poolCIMA.connect();

        const query = `
            SELECT
                HORA as time_slot,
                PERDIDAS,
                OBSERVACIONES,
                MOTIVO,
                SUPERVISOR,
                LIDER,
                MODELO
            FROM tbl_HistProdElectro
            WHERE
                CAST(FECHA AS DATE) = @fecha
                AND TURNO = @turno
        `;

        const result = await poolCIMA.request()
            .input('fecha', sql.Date, fecha)
            .input('turno', sql.Int, turno)
            .query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error al consultar historial Electronics:", err);
        res.status(500).json({ error: "Error al consultar la base de datos CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

export default router;