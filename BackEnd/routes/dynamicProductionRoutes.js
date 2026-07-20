import express from "express";
import sql from "mssql";
import axios from "axios";
import { poolCIMA } from "../config/dbConnections.js";
import { linesRegistry } from "../config/linesRegistry.js";

const router = express.Router();

// ============================================================================
// ENDPOINTS EXCLUSIVOS DE PRE-ENSAMBLE
// ============================================================================

router.get("/preensamble/get_api_data", async (req, res) => {
    try {
        const response = await axios.get('http://10.13.225.20:3430/get_plc_data?IP=192.168.32.2&COUNTER=008&MATNR=130');
        res.json(response.data);
    } catch (error) {
        console.error("Error al obtener datos de API PLC:", error);
        res.status(500).send('Error al obtener los datos');
    }
});

router.get("/preensamble/register_data", async (req, res) => {
    const { counter, product_id } = req.query;
    const now = new Date();
    const queryDate = now.toISOString().split('T')[0];
    const hour = now.getHours();

    let turno;
    if (hour >= 6 && hour < 14) {
        turno = 1;
    } else if (hour >= 14 && hour < 23) {
        turno = 2;
    } else {
        turno = 3;
    }

    try {
        await poolCIMA.request()
            .input("COUNTER", sql.Int, counter)
            .input("PRODUCT_ID", sql.VarChar, product_id)
            .input("FECHA", sql.Date, queryDate)
            .input("TURNO", sql.Int, turno)
            .execute("preEnsam_sp_insert");

        res.status(200).json({ success: true, message: 'Register Success!' });
    } catch (err) {
        console.error("Error al registrar datos PLC en CIMA:", err);
        res.status(500).json({ success: false, message: 'An internal server error occurred' });
    }
});

router.get("/preensamble/get_cima_data", async (req, res) => {
    try {
        const result = await poolCIMA.request().execute("preEnsam_sp_query");
        res.json(result.recordset);
    } catch (error) {
        console.error("Error al obtener datos CIMA de preensamble:", error);
        res.status(500).send('Error al obtener los datos');
    }
});

// ============================================================================
// MIDDLEWARE DE VALIDACIÓN DE LÍNEA DE PRODUCCIÓN
// ============================================================================

router.use("/:line", (req, res, next) => {
    const { line } = req.params;
    const config = linesRegistry[line];
    if (!config) {
        return res.status(404).json({ error: `La línea de producción '${line}' no está configurada.` });
    }
    req.lineConfig = config;
    next();
});

// ============================================================================
// ENDPOINTS DINÁMICOS POR LÍNEA
// ============================================================================

// 1. GET /:line/hourly
router.get("/:line/hourly", async (req, res) => {
    const { fecha, turno, lineNo } = req.query;
    const config = req.lineConfig;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros requeridos: fecha y turno" });
    }

    try {
        let production_data = [];

        // Consultar producción según el tipo de base de datos
        if (config.dbType === "mssql") {
            const request = config.prodPool.request();
            request.input(config.params.date, sql.Date, fecha);
            request.input(config.params.shift, sql.Int, turno);

            if (config.hasLineNo && lineNo) {
                request.input("TableName", sql.NVarChar(128), `EIN_0${lineNo}`);
            }

            const result = await request.execute(config.procedures.hourly);
            production_data = result.recordset;

        } else if (config.dbType === "mysql") {
            const queryParams = [fecha, turno];
            const [mysqlResult] = await config.prodPool.query(
                `CALL ${config.procedures.hourly}(?, ?)`,
                queryParams
            );
            production_data = mysqlResult[0];
        }

        // Consultar metas en SQL Server (CIMA)
        const metasRequest = config.goalsPool.request()
            .input("LineId", sql.VarChar(20), config.lineId)
            .input("Fecha", sql.Date, fecha)
            .input("Turno", sql.Int, turno);

        if (config.hasLineNo && lineNo) {
            metasRequest.input("NumeroLinea", sql.Int, lineNo);
        }

        const hourly_goals = await metasRequest.execute("SP_OBTENER_METAS_EFECTIVAS");
        const goals_data = hourly_goals.recordset;

        // Unificar resultados
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

        res.json(final_result);

    } catch (error) {
        console.error(`Error en /:line/hourly para ${config.lineId}:`, error);
        res.status(500).json({ error: "Error al obtener los datos de producción horaria." });
    }
});

// 2. GET /:line/total-day
router.get("/:line/total-day", async (req, res) => {
    const { fecha, lineNo } = req.query;
    const config = req.lineConfig;

    if (!fecha) {
        return res.status(400).json({ error: "Falta el parámetro requerido: fecha" });
    }

    try {
        if (config.dbType === "mssql") {
            const request = config.prodPool.request();
            request.input(config.params.date, sql.Date, fecha);

            if (config.hasLineNo && lineNo) {
                request.input("TableName", sql.NVarChar(128), `EIN_0${lineNo}`);
            }

            const result = await request.execute(config.procedures.totalDay);
            const row = result.recordset[0];
            res.json({ TOTAL_DIA: row ? row.TOTAL_DIA : 0 });

        } else if (config.dbType === "mysql") {
            const [result] = await config.prodPool.query(`CALL ${config.procedures.totalDay}(?)`, [fecha]);
            res.json(result[0][0] || { TOTAL_DIA: 0 });
        }
    } catch (error) {
        console.error(`Error en /:line/total-day para ${config.lineId}:`, error);
        res.status(500).json({ error: "Error al obtener los datos del total del día." });
    }
});

// 3. GET /:line/total-shift
router.get("/:line/total-shift", async (req, res) => {
    const { fecha, lineNo } = req.query;
    const config = req.lineConfig;

    if (!fecha) {
        return res.status(400).json({ error: "Falta el parámetro requerido: fecha" });
    }

    try {
        let production_rows = [];

        if (config.dbType === "mssql") {
            const request = config.prodPool.request();
            request.input(config.params.date, sql.Date, fecha);

            if (config.hasLineNo && lineNo) {
                request.input("TableName", sql.NVarChar(128), `EIN_0${lineNo}`);
            }

            const result = await request.execute(config.procedures.totalShift);
            production_rows = result.recordset;

        } else if (config.dbType === "mysql") {
            const [mysqlResult] = await config.prodPool.query(`CALL ${config.procedures.totalShift}(?)`, [fecha]);
            production_rows = mysqlResult[0];
        }

        const turnosRequeridos = [1, 2, 3];
        const dataFinal = await Promise.all(turnosRequeridos.map(async (idTurno) => {
            const metasRequest = config.goalsPool.request()
                .input("LineId", sql.VarChar(20), config.lineId)
                .input("Fecha", sql.Date, fecha)
                .input("Turno", sql.Int, idTurno);

            if (config.hasLineNo && lineNo) {
                metasRequest.input("NumeroLinea", sql.Int, lineNo);
            }

            const metas = await metasRequest.execute("SP_OBTENER_METAS_EFECTIVAS");
            const totalMetaTurno = metas.recordset.reduce((acc, curr) => acc + (curr.MetaEfectiva || 0), 0);
            const registro = production_rows.find(r => r.TURNO === idTurno);

            return {
                TURNO: idTurno,
                CONTADOR: registro ? registro.CONTADOR : 0,
                MetaEfectivaTurno: totalMetaTurno
            };
        }));

        res.json(dataFinal);

    } catch (error) {
        console.error(`Error en /:line/total-shift para ${config.lineId}:`, error);
        res.status(500).json({ error: "Error al obtener los datos de los totales por turno." });
    }
});

// 4. GET /:line/shift
router.get("/:line/shift", async (req, res) => {
    const { fecha, turno, lineNo } = req.query;
    const config = req.lineConfig;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros requeridos: fecha y turno" });
    }

    try {
        if (config.dbType === "mssql") {
            const request = config.prodPool.request();
            request.input(config.params.date, sql.Date, fecha);
            request.input(config.params.shift, sql.Int, turno);

            if (config.hasLineNo && lineNo) {
                request.input("TableName", sql.NVarChar(128), `EIN_0${lineNo}`);
            }

            const result = await request.execute(config.procedures.shift);
            const row = result.recordset[0];
            res.json({ TOTAL_TURNO: row ? row.TOTAL_TURNO : 0 });

        } else if (config.dbType === "mysql") {
            const [result] = await config.prodPool.query(`CALL ${config.procedures.shift}(?, ?)`, [fecha, turno]);
            res.json(result[0][0] || { TOTAL_TURNO: 0 });
        }
    } catch (error) {
        console.error(`Error en /:line/shift para ${config.lineId}:`, error);
        res.status(500).json({ error: "Error al obtener el total de producción del turno." });
    }
});

// 5. POST /:line/save
router.post("/:line/save", async (req, res) => {
    const config = req.lineConfig;
    const reportData = req.body;
    const { lineNo } = req.query;

    if (!Array.isArray(reportData) || reportData.length === 0) {
        return res.status(400).json({ error: "Datos de reporte inválidos o vacíos." });
    }

    try {
        const dataPorHora = {};
        reportData.forEach(row => {
            if (!dataPorHora[row.Hora_Slot]) {
                dataPorHora[row.Hora_Slot] = [];
            }
            dataPorHora[row.Hora_Slot].push(row);
        });

        const pool = config.histPool;

        for (const horaSlot in dataPorHora) {
            const filasDeEstaHora = dataPorHora[horaSlot];
            const { Fecha, Turno } = filasDeEstaHora[0];

            const deleteRequest = pool.request()
                .input('Fecha', sql.Date, Fecha)
                .input('Turno', sql.Int, Turno)
                .input('Hora', sql.VarChar, horaSlot);

            if (config.lineId === "insi") {
                deleteRequest.input('Linea', sql.Int, lineNo);
                await deleteRequest.query(`
                    DELETE FROM EIN_PERDIDAS
                    WHERE CAST(FECHA AS DATE) = @Fecha
                      AND TURNO = @Turno
                      AND HORA = @Hora
                      AND LINEA = @Linea
                `);
            } else {
                await deleteRequest.query(`
                    DELETE FROM ${config.histTable}
                    WHERE CAST(FECHA AS DATE) = @Fecha
                      AND TURNO = @Turno
                      AND HORA = @Hora
                `);
            }

            for (const row of filasDeEstaHora) {
                const insertRequest = pool.request()
                    .input('Fecha', sql.Date, row.Fecha)
                    .input('Turno', sql.Int, row.Turno)
                    .input('Hora_Slot', sql.VarChar, row.Hora_Slot)
                    .input('Supervisor', sql.VarChar, row.Supervisor)
                    .input('Lider', sql.VarChar, row.Lider)
                    .input('Perdidas', sql.Int, row.Perdidas || 0)
                    .input('Observaciones', sql.VarChar, row.Observaciones || '')
                    .input('Modelo', sql.VarChar, row.Modelo)
                    .input('Motivo', sql.VarChar, row.Motivo || '');

                if (config.lineId === "insi") {
                    insertRequest.input('Linea', sql.Int, lineNo);
                    await insertRequest.query(`
                        INSERT INTO EIN_PERDIDAS (FECHA, TURNO, HORA, SUPERVISOR, LIDER, PERDIDAS, OBSERVACIONES, MODELO, MOTIVO, LINEA)
                        VALUES (@Fecha, @Turno, @Hora_Slot, @Supervisor, @Lider, @Perdidas, @Observaciones, @Modelo, @Motivo, @Linea)
                    `);
                } else {
                    await insertRequest.query(`
                        INSERT INTO ${config.histTable} (FECHA, TURNO, HORA, SUPERVISOR, LIDER, PERDIDAS, OBSERVACIONES, MODELO, MOTIVO)
                        VALUES (@Fecha, @Turno, @Hora_Slot, @Supervisor, @Lider, @Perdidas, @Observaciones, @Modelo, @Motivo)
                    `);
                }
            }
        }

        res.status(200).json({ message: "Reporte guardado con desglose correctamente." });

    } catch (err) {
        console.error(`Error al guardar reporte para ${config.lineId}:`, err);
        res.status(500).json({ error: "Error interno del servidor al guardar." });
    }
});

// 6. GET /:line/reports
router.get("/:line/reports", async (req, res) => {
    const { fecha, turno, lineNo } = req.query;
    const config = req.lineConfig;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros fecha o turno" });
    }

    try {
        const pool = config.histPool;
        const request = pool.request()
            .input('fecha', sql.Date, fecha)
            .input('turno', sql.Int, turno);

        let query = "";
        if (config.lineId === "insi") {
            request.input('lineNo', sql.Int, lineNo);
            query = `
                SELECT
                    HORA as time_slot,
                    PERDIDAS,
                    OBSERVACIONES,
                    MOTIVO,
                    SUPERVISOR,
                    LIDER,
                    MODELO,
                    LINEA
                FROM EIN_PERDIDAS
                WHERE
                    CAST(FECHA AS DATE) = @fecha
                    AND TURNO = @turno
                    AND LINEA = @lineNo
            `;
        } else {
            query = `
                SELECT
                    HORA as time_slot,
                    PERDIDAS,
                    OBSERVACIONES,
                    MOTIVO,
                    SUPERVISOR,
                    LIDER,
                    MODELO
                FROM ${config.histTable}
                WHERE
                    CAST(FECHA AS DATE) = @fecha
                    AND TURNO = @turno
            `;
        }

        const result = await request.query(query);
        res.json(result.recordset);

    } catch (err) {
        console.error(`Error al consultar historial para ${config.lineId}:`, err);
        res.status(500).json({ error: "Error al consultar la base de datos de historial." });
    }
});

export default router;
