import express from "express";
import sql from "mssql";
import { dbSQLiteWetISE, sqlConfigCIMA } from "../config/dbConnections.js"; // Import centralized configs

const router = express.Router();

// Función auxiliar para calcular la hora límite y sumar las 6 horas para la BD
const getDbTimeString = (dateBase, hours) => {
    let tempDate = new Date(dateBase);
    tempDate.setHours(hours, 0, 0, 0);

    // Sumamos las 6 horas exactas
    tempDate = new Date(tempDate.getTime() + (6 * 60 * 60 * 1000));

    const yyyy = tempDate.getFullYear();
    const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
    const dd = String(tempDate.getDate()).padStart(2, '0');
    const hh = String(tempDate.getHours()).padStart(2, '0');
    const min = String(tempDate.getMinutes()).padStart(2, '0');
    const ss = String(tempDate.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

// Función para formatear fechas a YYYY-MM-DD HH:MM:SS para SQLite
const formatSqlite = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

router.get("/produccion-real", (req, res) => {
    const { fecha, turno } = req.query;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros fecha o turno" });
    }

    try {
        console.log(`CONSULTANDO ROTOR ISE`); // Changed from ROTOR WET

        // Determinar el rango local del turno
        let startYear = parseInt(fecha.split('-')[0]);
        let startMonth = parseInt(fecha.split('-')[1]) - 1;
        let startDay = parseInt(fecha.split('-')[2]);

        let startLocal = new Date(startYear, startMonth, startDay);
        let endLocal = new Date(startYear, startMonth, startDay);

        if (turno === '1') {
            startLocal.setHours(6, 0, 0, 0);
            endLocal.setHours(14, 0, 0, 0);
        } else if (turno === '2') {
            startLocal.setHours(14, 0, 0, 0);
            endLocal.setHours(23, 0, 0, 0);
        } else if (turno === '3') {
            startLocal.setDate(startLocal.getDate() - 1);
            startLocal.setHours(23, 0, 0, 0);
            endLocal.setHours(6, 0, 0, 0);
        }

        // Sumar las 6 horas de desfase para empatar con datetime_created en la BD
        const startDb = new Date(startLocal.getTime() + (6 * 60 * 60 * 1000));
        const endDb = new Date(endLocal.getTime() + (6 * 60 * 60 * 1000));

        const startStr = formatSqlite(startDb);
        const endStr = formatSqlite(endDb);

        console.log(`Rango Local Rotor ISE: ${startLocal.getHours()}:00 a ${endLocal.getHours()}:00`); // Changed from ROTOR WET
        console.log(`Buscando en SQLite Rotor ISE (+6h): ${startStr} hasta ${endStr}`); // Changed from ROTOR WET

        // Consulta SQL
        const query = `
            SELECT
                strftime('%H', datetime_created) as HoraBD,
                SUM(quantity) as Total,
                MAX(product) as Modelo
            FROM pallets_pallet
            WHERE workstation = 'MX8RO040'
              AND datetime_created >= ?
              AND datetime_created < ?
            GROUP BY strftime('%H', datetime_created)
            ORDER BY HoraBD ASC
        `;

        //Ejecutar consulta en la instancia correcta de DB
        dbSQLiteWetISE.all(query, [startStr, endStr], (error, rows) => {
            if (error) {
                console.error("Error en SQLite Rotor ISE:", error.message); // Changed from ROTOR WET
                return res.status(500).json({ error: "Error al consultar SQLite de Rotor ISE" }); // Changed from ROTOR WET
            }

            console.log(`Filas encontradas en SQLite Rotor ISE: ${rows.length}`); // Changed from ROTOR WET

            //Mapear la hora de la BD de vuelta a la hora local para el FrontEnd
            const formattedData = rows.map(row => {
                // Restamos 6 horas y usamos módulo 24 para manejar el cruce de medianoche
                const horaLocal = (parseInt(row.HoraBD, 10) - 6 + 24) % 24;
                const horaFin = (horaLocal + 1) % 24;

                const strInicio = `${horaLocal.toString().padStart(2, '0')}:00`;
                const strFin = `${horaFin.toString().padStart(2, '0')}:00`;
                const slot = `${strInicio}-${strFin}`;

                return {
                    time_slot: slot,
                    piezas_reales: row.Total || 0,
                    Modelo: row.Modelo || ''
                };
            });

            res.json(formattedData);
        });

    } catch (err) {
        console.error("Error general en el endpoint de Rotor ISE:", err); // Changed from ROTOR WET
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

router.get("/total-dia", async (req, res) => {
    const { fecha } = req.query;

    if (!fecha) {
        return res.status(400).json({ error: "Falta parámetro fecha" });
    }

    try {
        console.log(`--- CALCULANDO TOTAL DÍA Y DESGLOSE ROTOR ISE ---`); // Changed from ROTOR WET

        //Parsear la fecha local exacta que viene del frontend
        let startYear = parseInt(fecha.split('-')[0]);
        let startMonth = parseInt(fecha.split('-')[1]) - 1;
        let startDay = parseInt(fecha.split('-')[2]);

        let dateObj = new Date(startYear, startMonth, startDay);
        let yesterdayObj = new Date(startYear, startMonth, startDay);
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);

        const t3Start = getDbTimeString(yesterdayObj, 23);
        const t3End = getDbTimeString(dateObj, 6);

        const t1Start = getDbTimeString(dateObj, 6);
        const t1End = getDbTimeString(dateObj, 14);

        const t2Start = getDbTimeString(dateObj, 14);
        const t2End = getDbTimeString(dateObj, 23);

        // promesa para ejecutar las consultas a SQLite sumando 'quantity'
        const countRangeLite = (startStr, endStr) => {
            return new Promise((resolve, reject) => {
                const query = `
                    SELECT SUM(quantity) as Cantidad
                    FROM pallets_pallet
                    WHERE workstation = 'MX8RO040'
                      AND datetime_created >= ?
                      AND datetime_created < ?
                `;
                dbSQLiteWetISE.get(query, [startStr, endStr], (err, row) => {
                    if (err) reject(err);
                    else resolve(row && row.Cantidad ? row.Cantidad : 0);
                });
            });
        };

        //Ejecutar las 3 consultas al mismo tiempo
        const [cntT3, cntT1, cntT2] = await Promise.all([
            countRangeLite(t3Start, t3End),
            countRangeLite(t1Start, t1End),
            countRangeLite(t2Start, t2End)
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
        console.error("Error al consultar Total Día Rotor ISE:", err); // Changed from ROTOR WET
        res.status(500).json({ error: "Error al consultar SQLite" });
    }
});

// Endpoint para guardar el reporte en CIMA (Rotor ISE)
router.post("/guardar-reporte", async (req, res) => {
    let poolCIMA;

    try {
        const reportData = req.body;

        if (!Array.isArray(reportData) || reportData.length === 0) {
            return res.status(400).json({ error: "Datos de reporte inválidos o vacíos." });
        }

        poolCIMA = new sql.ConnectionPool(sqlConfigCIMA);
        await poolCIMA.connect();

        // Agrupar por hora
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

            // Borrar registros previos para evitar duplicados en actualizaciones
            await poolCIMA.request()
                .input('Fecha', sql.Date, Fecha)
                .input('Turno', sql.Int, Turno)
                .input('Hora', sql.VarChar, horaSlot)
                .query(`
                    DELETE FROM tbl_HistProdRotIse
                    WHERE CAST(fecha AS DATE) = @Fecha
                      AND turno = @Turno
                      AND hora = @Hora
                `);

            // Insertar los nuevos datos
            for (const row of filasDeEstaHora) {
                await poolCIMA.request()
                    .input('Fecha', sql.Date, row.Fecha)
                    .input('Turno', sql.Int, row.Turno)
                    .input('Hora_Slot', sql.VarChar, row.Hora_Slot)
                    .input('Supervisor', sql.VarChar, row.Supervisor)
                    .input('Lider', sql.VarChar, row.Lider)
                    .input('Perdidas', sql.Int, row.Perdidas || 0)
                    .input('Observaciones', sql.VarChar, row.Observaciones || '')
                    .input('Motivo', sql.VarChar, row.Batch || '')
                    .query(`
                        INSERT INTO tbl_HistProdRotIse (fecha, hora, turno, supervisor, lider, perdidas, observaciones, motivo)
                        VALUES (@Fecha, @Hora_Slot, @Turno, @Supervisor, @Lider, @Perdidas, @Observaciones, @Motivo)
                    `);
            }
        }

        res.status(200).json({ message: "Reporte de Rotor ISE guardado correctamente en CIMA." }); // Changed from ROTOR WET

    } catch (err) {
        console.error("Error al guardar el reporte Rotor ISE:", err); // Changed from ROTOR WET
        res.status(500).json({ error: "Error interno del servidor al guardar en CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

// Endpoint para recuperar el reporte guardado (Rotor Ise)
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
                supervisor,
                lider
            FROM tbl_HistProdRotIse
            WHERE CAST(fecha AS DATE) = @fecha
              AND turno = @turno
        `;

        const result = await poolCIMA.request()
            .input('fecha', sql.Date, fecha)
            .input('turno', sql.Int, turno)
            .query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error al consultar historial Rotor ISE:", err); // Changed from ROTOR WET
        res.status(500).json({ error: "Error al consultar la base de datos CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

export default router;