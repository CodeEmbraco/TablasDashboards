import express from "express";
import sql from "mssql";
import { mysqlPool, poolCIMA } from "../config/dbConnections.js";

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
        // 1. Obtener la producción real desde MySQL
        const [mysqlResult] = await mysqlPool.query('CALL ELECTRO_HOURLY(?, ?)', [fecha, turno]);
        // Recuerda que MySQL devuelve la data dentro del primer arreglo cuando usas CALL
        const production_data = mysqlResult[0]; 

        const hourly_goals = await poolCIMA.request()
            .input("LineId", sql.VarChar(20), "electronics")
            .input("Fecha", sql.Date, fecha)
            .input("Turno", sql.Int, turno)
            .execute("SP_OBTENER_METAS_EFECTIVAS");

        const goals_data = hourly_goals.recordset;

        const final_result = goals_data.map(m => {
            const HoraInicioSlot = parseInt(m.Hora_Slot.split(':')[0], 10);
        
            const ProduccionDeEstaHora = production_data.find(p => p.Hora === HoraInicioSlot);

            return {
                Hora: HoraInicioSlot,
                ProduccionTotal: ProduccionDeEstaHora ? ProduccionDeEstaHora.ProduccionTotal : 0, 
                Modelos: ProduccionDeEstaHora ? ProduccionDeEstaHora.Modelos : "",
                MetaEfectiva: m.MetaEfectiva,
            };
        });

        // 4. Enviar el resultado unificado al frontend
        res.json(final_result);

    } catch (error) {
        console.error('Error en /hourly (MySQL + SQL Server):', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar la producción y metas por hora' });
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
        // 1. Obtener producción real por turno desde MySQL
        const [mysqlResult] = await mysqlPool.query('CALL ELECTRO_TOTALSHIFT(?)', [fecha]);
        const production_data = mysqlResult[0]; 

        const turnosRequeridos = [1, 2, 3];
        
        const dataFinal = await Promise.all(turnosRequeridos.map(async (idTurno) => {
            const metas = await poolCIMA.request()
                .input("LineId", sql.VarChar(20), "electronics")
                .input("Fecha", sql.Date, fecha)
                .input("Turno", sql.Int, idTurno)
                .execute("SP_OBTENER_METAS_EFECTIVAS");

            const totalMetaTurno = metas.recordset.reduce((acc, curr) => acc + (curr.MetaEfectiva || 0), 0);

            const registro = production_data.find(r => r.TURNO === idTurno);

            return {
                TURNO: idTurno,
                CONTADOR: registro ? registro.CONTADOR : 0,
                MetaEfectivaTurno: totalMetaTurno
            };
        }));
        
        // 3. Enviar el resultado unificado
        res.json(dataFinal);

    } catch (error) {
        console.error('Error en /total-shift (MySQL + SQL Server):', error);
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
    try {
        const reportData = req.body;
        //----------------------
        //DEBUG
        //console.log("Que recibimos, Electronics?", reportData);
        //----------------------

        if (!Array.isArray(reportData) || reportData.length === 0) {
            return res.status(400).json({ error: "Datos de reporte inválidos o vacíos." });
        }

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
    }
});

router.get("/reports", async (req, res) => {
    const { fecha, turno } = req.query;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros fecha o turno" });
    }

    try {
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
    }
});

export default router;