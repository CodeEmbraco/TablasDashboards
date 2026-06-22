import express from "express";
import axios from 'axios';
import sql from "mssql";

import { poolCIMA } from '../config/dbConnections.js';

const router = express.Router();

//? ----------------------
//? --Autor: Sean Garcia--
//? ----------------------
//ENDPOINTS DE ENSAMBLE
router.get("/get_api_data", async (req, res) => {
    try {
        const response = await axios.get('http://10.13.225.20:3430/get_plc_data?IP=192.168.32.2&COUNTER=008&MATNR=130');
        res.json(response.data);
    } catch (error) {
        res.status(500).send('Error al obtener los datos');
    }
});

router.get("/register_data", async (req, res) => {
    const { counter, product_id } = req.query;

    //Fecha Completa con Horas
    const now = new Date();

    //Fecha sin hora
    const queryDate = now.toISOString().split('T')[0];

    //Hora
    const hour = now.getHours();
    console.log("Fecha Completa:\t", now,"\nQuery Date:\t", queryDate,"\nQuery Hours:\t", hour);

    //Logica de turno
    let turno
    if (hour >= 6 && hour < 14) {
        turno = 1; // 6:00 AM - 1:59 PM
    } else if (hour >= 14 && hour < 23) {
        turno = 2; // 2:00 PM - 10:59 PM
    } else {
        turno = 3; // 11:00 PM - 5:59 AM
    }

    try {
        //*Comprobamos que datos estamos recibiendo del Front
        console.log("counter:\t", counter,"\n","product_id:\t", product_id, "\n","fecha:\t", queryDate,"\n","turno:\t", turno);
        //*Mandaremos el contador, el modelo/product id, la hora de la consulta se hara directamente en el insert
        const result = await poolCIMA.request()
        .input("COUNTER", sql.Int, counter)
        .input("PRODUCT_ID", sql.VarChar, product_id)
        .input("FECHA", sql.Date, queryDate)
        .input("TURNO", sql.Int, turno)
        .execute("preEnsam_sp_insert");

        res.status(200).json({success: true, message: 'Register Success!'});
    }
    catch(err){
        console.error("Error al conectar con SQL Server:", err);
        res.status(500).json({ success: false, message: 'An internal server error occurred' });
    }
});

router.get("/get_cima_data", async (req, res) => {
    try {
        //*Se hace la consulta de la info de la tabla de registros de Pre-Ensamble
        const result = await poolCIMA.request().execute("preEnsam_sp_query");

        res.json(result.recordset);
    } catch (error) {
        res.status(500).send('Error al obtener los datos');
    }
});

router.get("/hourly", async (req, res) => {
    const {fecha, turno} = req.query;

    //DEBUG---------------
    // console.log("Entre a hourly!");
    // console.log("fecha:\t", fecha,"\nturno:\t", turno);
    //--------------------
    try {
        //*Se hace la consulta de la info de la tabla de registros de Pre-Ensamble
        const hourly_production = await poolCIMA.request()
        .input("FECHA", sql.Date, fecha)
        .input("TURNO", sql.Int, turno)
        .execute("preEnsam_sp_prodByHour");

        //DEBUG---------------
        // console.log("Pasó la consulta de ensamble!");
        //--------------------

        const hourly_goals = await poolCIMA.request()
        .input("LineId", sql.VarChar(20), "preensamble")
        .input("Fecha", sql.Date, fecha)
        .input("Turno", sql.Int, turno)
        .execute("SP_OBTENER_METAS_EFECTIVAS");

        //DEBUG---------------
        //console.log("Pasó la consulta de metas!");
        //-------
        
        const production_data = hourly_production.recordset;
        const goals_data = hourly_goals.recordset;
        
        //DEBUG---------------
        // console.log("production_data!\n", production_data);
        // console.log("goals_data!\n",goals_data);
        //--------------------

        const final_result = goals_data.map(m =>{
            const HoraInicioSlot = parseInt(m.Hora_Slot.split(':')[0], 10);
            const ProduccionDeEstaHora = production_data.find(p => p.Hora === HoraInicioSlot);

            //DEBUG---------------
            // console.log("HoraInicioSlot!", HoraInicioSlot);
            // console.log("ProduccionDeEstaHora!",ProduccionDeEstaHora);
            // console.log("MetaEfectiva!",m.MetaEfectiva);
            // console.log("---------------------------------")
            //--------------------
            
            return {
                Hora: HoraInicioSlot,
                ProduccionTotal: ProduccionDeEstaHora ? ProduccionDeEstaHora.ProduccionTotal : 0, 
                Modelos: ProduccionDeEstaHora ? ProduccionDeEstaHora.Modelos : "",
                MetaEfectiva: m.MetaEfectiva,
            };
        });

        //DEBUG---------------
        //console.log("Final Result, hourly:  \n", final_result);
        //--------------------
        
        res.json(final_result);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener los datos');
    }
});


router.get("/total-day", async (req, res) => {
    const {fecha} = req.query;
    try {
        //*Se hace la consulta de la info de la tabla de registros de Pre-Ensamble
        const result = await poolCIMA.request()
        .input("FECHA", sql.Date, fecha)
        .execute("preEnsam_sp_totalProdByDate");

        const row = result.recordset[0];
        res.json({ TOTAL_DIA: row ? row.TOTAL_DIA : 0 })

    } catch (error) {
        res.status(500).send('Error al obtener los datos');
    }
});

router.get("/total-shift", async (req, res) => {
    const { fecha } = req.query;

    try {
        const conexionCIMA = await poolCIMA;

        // 1. Obtener producción real por turno
        const result = await conexionCIMA.request()
            .input("FECHA", sql.Date, fecha)
            .execute("preEnsam_sp_queryByDateAndShift");
        const rows = result.recordset;

        // 2. Obtener las metas de todos los turnos para esa fecha
        const turnosRequeridos = [1, 2, 3];
        
        const dataFinal = await Promise.all(turnosRequeridos.map(async (idTurno) => {
            // Consulta las metas para este turno específico
            const metas = await poolCIMA.request()
                .input("LineId", sql.VarChar(20), "preensamble")
                .input("Fecha", sql.Date, fecha)
                .input("Turno", sql.Int, idTurno)
                .execute("SP_OBTENER_METAS_EFECTIVAS");

            // Sumamos las metas de todas las horas de este turno
            const totalMetaTurno = metas.recordset.reduce((acc, curr) => acc + (curr.MetaEfectiva || 0), 0);

            // Buscamos producción real
            const registro = rows.find(r => r.TURNO === idTurno);

            //--DEBUG------------------------
            //console.log("TURNO: ",idTurno,"| CONTADOR:", registro.CONTADOR, "| META: ", totalMetaTurno);
            //-------------------------------

            return {
                TURNO: idTurno,
                CONTADOR: registro ? registro.CONTADOR : 0,
                MetaEfectivaTurno: totalMetaTurno // Nueva columna con la meta sumada
            };
        }));

        //--DEBUG------------------------
        //console.log("dataFinal: ", dataFinal);
        //-------------------------------

        res.json(dataFinal);

    } catch (error) {
        console.error("Error en /total-shift:", error);
        res.status(500).send('Error al obtener los datos');
    }
});

router.get("/shift", async(req,res) => {
    const { fecha, turno } = req.query;
    try{
        const result = await poolCIMA.request()
        .input("FECHA", sql.Date, fecha)
        .input("TURNO", sql.Int, turno)
        .execute("preEnsam_sp_ShiftTotalByDate");

        const row = result.recordset[0];
        res.json({TOTAL_TURNO : row ? row.TOTAL_TURNO : 0});
    }
    catch(err){
        console.log(err);
        res.status(500).send('Error al obtener los datos');
    }
});

router.post("/save", async(req, res) =>{
    try {
        const reportData = req.body;

        if (!Array.isArray(reportData) || reportData.length === 0) {
            return res.status(400).json({ error: "Datos de reporte inválidos o vacíos." });
        }
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
                    DELETE FROM tbl_HistProdPreEnsam
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
                        INSERT INTO tbl_HistProdPreEnsam (FECHA, TURNO, HORA, SUPERVISOR, LIDER, PERDIDAS, OBSERVACIONES, MODELO, MOTIVO)
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
            FROM tbl_HistProdPreEnsam
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
    }
});

export default router;