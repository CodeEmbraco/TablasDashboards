import express from "express";
import axios from 'axios';
import sql from "mssql";
import { sqlConfigINSI } from "../config/dbConnections.js";

const router = express.Router();

//? ----------------------
//? --Autor: Sean Garcia--
//? ----------------------
//ENDPOINTS DE INSINKERATOR

router.get("/hourly", async (req, res) => {
    const {fecha, turno, lineNo} = req.query;
    const tablename = "EIN_0" + lineNo;
    //*Abrimos una conexion con ES_INSI_TESTER
    let pool = await sql.connect(sqlConfigINSI);
    try {
        //*Se hace la consulta de la info de la tabla de logs del tester de insinkerator
        const result = await pool.request()
        .input("FECHA", sql.Date, fecha)
        .input("TURNO", sql.Int, turno)
        .input("TableName", sql.NVarChar(128), tablename)
        .execute("INSINK_sp_prodByHour");

        // Normalizar para que el FrontEnd encuentre la propiedad 'REAL'
        const normalizedData = result.recordset.map(row => ({
            ...row,
            REAL: row.REAL ?? row.CONTADOR ?? row.CANTIDAD ?? 0
        }));
        res.json(normalizedData);

    } catch (error) {
        res.status(500).send('Error al obtener los datos');
    }finally {
        if (pool) {
            await pool.close();
        }
    }
});


router.get("/total-day", async (req, res) => {
    const {fecha, lineNo} = req.query;
    const tablename = "EIN_0" + lineNo;
    //*Abrimos una conexion con CIMA
    let pool = await sql.connect(sqlConfigINSI);
    try {
        //*Se hace la consulta de la info de la tabla de logs del tester de insinkerator
        const result = await pool.request()
        .input("FECHA", sql.Date, fecha)
        .input("TableName", sql.NVarChar(128), tablename)
        .execute("INSINK_sp_totalProdByDate");

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
    const { fecha, lineNo } = req.query;
    const tablename = "EIN_0" + lineNo;
    let pool;

    try {
        pool = await sql.connect(sqlConfigINSI);

        const result = await pool.request()
            .input("FECHA", sql.Date, fecha)
            .input("TableName", sql.NVarChar(128), tablename)   
            .execute("INSINK_sp_queryByDateAndShift");

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
    const { fecha, turno, lineNo } = req.query;
    const tablename = "EIN_0" + lineNo;
    //console.log("^backend^ fecha: ", fecha, "\nturno: ", turno);
    let pool;
    try{
        pool = await sql.connect(sqlConfigINSI);
        const result = await pool.request()
        .input("FECHA", sql.Date, fecha)
        .input("TURNO", sql.Int, turno)
        .input("TableName", sql.NVarChar(128), tablename)
        .execute("INSINK_sp_ShiftTotalByDate");

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
    let pool;
    try {
        const { lineNo } = req.query;
        const reportData = req.body;

        if (!Array.isArray(reportData) || reportData.length === 0) {
            return res.status(400).json({ error: "Datos de reporte inválidos o vacíos." });
        }

        pool = new sql.ConnectionPool(sqlConfigINSI);
        await pool.connect();

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

            await pool.request()
                .input('Fecha', sql.Date, Fecha)
                .input('Turno', sql.Int, Turno)
                .input('Hora', sql.VarChar, horaSlot)
                .input('Linea', sql.Int, lineNo)
                .query(`
                    DELETE FROM EIN_PERDIDAS
                    WHERE CAST(FECHA AS DATE) = @Fecha
                      AND TURNO = @Turno
                      AND HORA = @Hora
                      AND LINEA = @Linea
                `);

            for (const row of filasDeEstaHora) {
                await pool.request()
                    .input('Fecha', sql.Date, row.Fecha)
                    .input('Turno', sql.Int, row.Turno)
                    .input('Hora_Slot', sql.VarChar, row.Hora_Slot)
                    .input('Supervisor', sql.VarChar, row.Supervisor)
                    .input('Lider', sql.VarChar, row.Lider)
                    .input('Perdidas', sql.Int, row.Perdidas || 0)
                    .input('Observaciones', sql.VarChar, row.Observaciones || '')
                    .input('Modelo', sql.VarChar, row.Modelo)
                    .input('Motivo', sql.VarChar, row.Motivo || '')
                    .input('Linea', sql.Int, lineNo)
                    .query(`
                        INSERT INTO EIN_PERDIDAS (FECHA, TURNO, HORA, SUPERVISOR, LIDER, PERDIDAS, OBSERVACIONES, MODELO, MOTIVO, LINEA)
                        VALUES (@Fecha, @Turno, @Hora_Slot, @Supervisor, @Lider, @Perdidas, @Observaciones, @Modelo, @Motivo, @Linea)
                    `);
            }
        }

        res.status(200).json({ message: "Reporte guardado con desglose correctamente." });

    } catch (err) {
        console.error("Error al guardar el reporte Insinkerator:", err);
        res.status(500).json({ error: "Error interno del servidor al guardar." });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

router.get("/reports", async (req, res) => {
    const { fecha, turno, lineNo } = req.query;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros fecha o turno" });
    }

    let pool;

    try {
        pool = new sql.ConnectionPool(sqlConfigINSI);
        await pool.connect();

        const query = `
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

        const result = await pool.request()
            .input('fecha', sql.Date, fecha)
            .input('turno', sql.Int, turno)
            .input('lineNo', sql.Int, lineNo)
            .query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error al consultar historial Insinkerator:", err);
        res.status(500).json({ error: "Error al consultar la base de datos." });
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

export default router;