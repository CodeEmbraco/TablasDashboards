import express from "express";
import sql from "mssql";
import { sqlConfig, sqlConfigCIMA } from "../config/dbConnections.js"; // Import centralized configs

const router = express.Router();

// Función auxiliar para calcular timestamps de los turnos
const getShiftTimestamps = (fechaStr, turno) => {
    const start = new Date(`${fechaStr}T00:00:00`);
    const end = new Date(`${fechaStr}T00:00:00`);

    if (turno === '1') {
        start.setHours(6, 0, 0, 0);
        end.setHours(14, 0, 0, 0);
    } else if (turno === '2') {
        start.setHours(14, 0, 0, 0);
        end.setHours(23, 0, 0, 0);
    } else if (turno === '3') {
        start.setDate(start.getDate() - 1);
        start.setHours(23, 0, 0, 0);
        end.setHours(6, 0, 0, 0);
    }
    return { start, end };
};

//endpoint para llenar la tabla y hacer la consulta
router.get("/produccion-real", async (req, res) => {
    const { fecha, turno } = req.query;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros fecha o turno" });
    }

    try {
        console.log(`--- CONSULTANDO CDU (SOLUCIÓN HORA LOCAL EXACTA) ---`);

        const { start, end } = getShiftTimestamps(fecha, turno);

        const formatDateLocal = (date) => {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            const ss = String(date.getSeconds()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
        };

        const startStr = formatDateLocal(start);
        const endStr = formatDateLocal(end);

        console.log(`Buscando exactamente desde: ${startStr} hasta ${endStr}`);

        let pool = await sql.connect(sqlConfig);

        const query = `
            SELECT
                DATEPART(hour, Date_Tested) as HoraBD,
                COUNT(DISTINCT BARCODE) as Total,
                MAX(Model_ID) as Modelo
            FROM Results_Header
            WHERE
                Date_Tested >= CAST(@startStr as DATETIME)
                AND Date_Tested < CAST(@endStr as DATETIME)
                AND Status = 1
                AND BARCODE NOT LIKE '515380100%'
                AND UNIT_ID = 67
            GROUP BY DATEPART(hour, Date_Tested)
            ORDER BY HoraBD ASC
        `;

        const result = await pool.request()
            .input('startStr', sql.VarChar, startStr)
            .input('endStr', sql.VarChar, endStr)
            .query(query);

        console.log(`Filas encontradas: ${result.recordset.length}`);

        const formattedData = result.recordset.map(row => {
            const horaLocal = row.HoraBD;
            const horaFin = (horaLocal + 1) % 24;
            const strInicio = `${horaLocal.toString().padStart(2, '0')}:00`;
            const strFin = `${horaFin.toString().padStart(2, '0')}:00`;
            const slot = `${strInicio}-${strFin}`;

            return {
                time_slot: slot,
                piezas_reales: row.Total,
                Modelo: row.Modelo
            };
        });

        res.json(formattedData);

    } catch (err) {
        console.error("Error en SQL Server CDU:", err);
        res.status(500).json({ error: "Error al consultar SQL Server" });
    }
});

//endpoint para guardar el registro en la bd de CIMA
router.post("/guardar-reporte", async (req, res) => {
    let poolCIMA;

    try {
        const reportData = req.body;

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
                    DELETE FROM tbl_HistProdCDU
                    WHERE CAST(fecha AS DATE) = @Fecha
                      AND turno = @Turno
                      AND hora = @Hora
                `);

            for (const row of filasDeEstaHora) {
                await poolCIMA.request()
                    .input('Fecha', sql.Date, row.Fecha)
                    .input('Turno', sql.Int, row.Turno)
                    .input('Hora_Slot', sql.VarChar, row.Hora_Slot)
                    .input('Supervisor', sql.VarChar, row.Supervisor)
                    .input('Lider', sql.VarChar, row.Lider)
                    .input('Batch', sql.VarChar, row.Batch)
                    .input('Modelo', sql.VarChar, row.Modelo)
                    .input('Perdidas', sql.Int, row.Perdidas || 0)
                    .input('Observaciones', sql.VarChar, row.Observaciones || '')
                    .input('Motivo', sql.VarChar, row.Motivo || '')
                    .query(`
                        INSERT INTO tbl_HistProdCDU (fecha, turno, hora, supervisor, lider, batch, modelo, perdidas, observaciones, motivo)
                        VALUES (@Fecha, @Turno, @Hora_Slot, @Supervisor, @Lider, @Batch, @Modelo, @Perdidas, @Observaciones, @Motivo)
                    `);
            }
        }

        res.status(200).json({ message: "Reporte guardado con desglose correctamente." });

    } catch (err) {
        console.error("Error al guardar el reporte CDU:", err);
        res.status(500).json({ error: "Error interno del servidor al guardar." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

//endpoint para saber si ya hay datos de la fecha y turno consultados
router.get("/reporte-guardado", async (req, res) => {
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
                hora as time_slot,
                perdidas,
                observaciones,
                motivo,
                batch,
                supervisor,
                lider,
                modelo
            FROM tbl_HistProdCDU
            WHERE
                CAST(fecha AS DATE) = @fecha
                AND turno = @turno
        `;

        const result = await poolCIMA.request()
            .input('fecha', sql.Date, fecha)
            .input('turno', sql.Int, turno)
            .query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error al consultar historial CDU:", err);
        res.status(500).json({ error: "Error al consultar la base de datos CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

//Endpoint para Obtener SOLO los DETALLES de Pérdidas
router.get("/detalles-perdidas", async (req, res) => {
    const { fecha, turno } = req.query;
    if (!fecha || !turno) return res.status(400).json({ error: "Faltan parámetros" });

    let poolCIMA;
    try {
        poolCIMA = new sql.ConnectionPool(sqlConfigCIMA);
        await poolCIMA.connect();
        const query = `
            SELECT h.hora as time_slot, d.idDetalle, d.motivo, d.minutos, d.observacion
            FROM tbl_HistProdCDU h
            INNER JOIN tbl_DetallePerdidasCDU d ON h.idCDU = d.idCDU
            WHERE CAST(h.fecha AS DATE) = @fecha AND h.turno = @turno
        `;
        const result = await poolCIMA.request().input('fecha', sql.Date, fecha).input('turno', sql.Int, turno).query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Error detalles." });
    } finally {
        if (poolCIMA) await poolCIMA.close();
    }
});


//Endpoint para obtener el TOTAL DEL DÍA
router.get("/total-dia", async (req, res) => {
    const { fecha } = req.query;

    if (!fecha) {
        return res.status(400).json({ error: "Falta parámetro fecha" });
    }

    try {
        console.log(`--- CALCULANDO TOTAL DÍA Y DESGLOSE ---`);

        const dateObj = new Date(`${fecha}T00:00:00`);
        const yesterdayObj = new Date(dateObj);
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);

        const fmt = (d, h) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${h}`;
        };

        const t3Start = fmt(yesterdayObj, '23:00:00');
        const t3End = fmt(dateObj, '06:00:00');
        const t1Start = fmt(dateObj, '06:00:00');
        const t1End = fmt(dateObj, '14:00:00');
        const t2Start = fmt(dateObj, '14:00:00');
        const t2End = fmt(dateObj, '23:00:00');

        let pool = await sql.connect(sqlConfig);

        const countRange = async (start, end) => {
            const query = `
                SELECT COUNT(DISTINCT BARCODE) as Cantidad
                FROM Results_Header
                WHERE Date_Tested >= CAST(@start as DATETIME)
                  AND Date_Tested < CAST(@end as DATETIME)
                  AND Status = 1
                  AND BARCODE NOT LIKE '515380100%'
                  AND UNIT_ID = 67
            `;
            const result = await pool.request()
                .input('start', sql.VarChar, start)
                .input('end', sql.VarChar, end)
                .query(query);
            return result.recordset[0]?.Cantidad || 0;
        };

        const [cntT3, cntT1, cntT2] = await Promise.all([
            countRange(t3Start, t3End),
            countRange(t1Start, t1End),
            countRange(t2Start, t2End)
        ]);

        const total = cntT3 + cntT1 + cntT2;

        res.json({
            totalDia: total,
            breakdown: {
                t3: cntT3,
                t1: cntT1,
                t2: cntT2
            }
        });

    } catch (err) {
        console.error("Error al consultar Total Día CDU:", err);
        res.status(500).json({ error: "Error al consultar SQL Server" });
    }
});

export default router;