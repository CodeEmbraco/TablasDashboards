import express from "express";
import sql from "mssql";
import { sqlConfig, sqlConfigCIMA } from "../config/dbConnections.js";

const router = express.Router();
//? ----------------------
//? --Autor: Sean Garcia--
//? ----------------------
//ENDPOINTS DE CDU
router.get("/hourly", async (req, res) => {
    const {fecha, turno} = req.query;
    //*Abrimos una conexion con CIMA
    let pool = await sql.connect(sqlConfig);
    try {
        const result = await pool.request()
        .input("fechaParam", sql.Date, fecha)
        .input("turnoParam", sql.Int, turno)
        .execute("CDU_HOURLY");

        res.json(result.recordset);

    } catch (error) {
        res.status(500).send('Error al obtener los datos');
    }finally {
        if (pool) {
            await pool.close();
        }
    }
});


router.get("/total-day", async (req, res) => {
    const {fecha} = req.query;
    //*Abrimos una conexion con CIMA
    let pool = await sql.connect(sqlConfig);
    try {
        const result = await pool.request()
        .input("fechaParam", sql.Date, fecha)
        .execute("CDU_TOTALDAY");

        const row = result.recordset[0];
        res.json({ TOTAL_DIA: row ? row.TOTAL_DIA : 0 })

    } catch (error) {
        res.status(500).send('Error al obtener los datos');
    }finally {
        if (pool) {
            await pool.close();
        }
    }
});

router.get("/total-shift", async (req, res) => {
    const { fecha } = req.query;
    let pool;

    try {
        pool = await sql.connect(sqlConfig);

        const result = await pool.request()
            .input("fechaParam", sql.Date, fecha)
            .execute("CDU_TOTALSHIFT");

        const rows = result.recordset;

        const turnosRequeridos = [1, 2, 3];
        const dataFinal = turnosRequeridos.map(idTurno => {
            // Buscamos si el turno existe en los resultados de la DB
            const registro = rows.find(r => r.TURNO === idTurno);

            // Si existe, lo usamos. Si no, creamos el objeto con CONTADOR 0
            return registro ? registro : { CONTADOR: 0, TURNO: idTurno };
        });

        res.json(dataFinal);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener los datos');
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

router.get("/shift", async(req,res) => {
    const { fecha, turno } = req.query;
    //console.log("^backend^ fecha: ", fecha, "\nturno: ", turno);
    let pool;
    try{
        pool = await sql.connect(sqlConfig);
        const result = await pool.request()
        .input("fechaParam", sql.Date, fecha)
        .input("turnoParam", sql.Int, turno)
        .execute("CDU_SHIFT");

        const row = result.recordset[0];
        res.json({TOTAL_TURNO : row ? row.TOTAL_TURNO : 0});
    }
    catch(err){
        console.log(err);
        res.status(500).send('Error al obtener los datos');
    }
    finally{
        if(pool){
            await pool.close;
        }
    }
});

router.post("/save", async(req, res) =>{
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
                        INSERT INTO tbl_HistProdCDU (FECHA, TURNO, HORA, SUPERVISOR, LIDER, PERDIDAS, OBSERVACIONES, MODELO, MOTIVO)
                        VALUES (@Fecha, @Turno, @Hora_Slot, @Supervisor, @Lider, @Perdidas, @Observaciones, @Modelo, @Motivo)
                    `);
            }
        }

        res.status(200).json({ message: "Reporte guardado con desglose correctamente." });

    } catch (err) {
        console.error("Error al guardar el reporte Ensamble:", err);
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
            FROM tbl_HistProdCDU
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
        console.error("Error al consultar historial Pre-Ensamble:", err);
        res.status(500).json({ error: "Error al consultar la base de datos CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

export default router;