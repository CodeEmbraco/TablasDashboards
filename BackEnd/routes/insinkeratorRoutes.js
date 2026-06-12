import express from "express";
import axios from 'axios';
import sql from "mssql";
import { poolINSI, poolCIMA } from "../config/dbConnections.js";

const router = express.Router();

//? ----------------------
//? --Autor: Sean Garcia--
//? ----------------------
//ENDPOINTS DE INSINKERATOR

router.get("/hourly", async (req, res) => {
    const {fecha, turno, lineNo} = req.query;
    const tablename = "EIN_0" + lineNo;
    try {
        //*Se hace la consulta de la info de la tabla de logs del tester de insinkerator
        const hourly_production = await poolINSI.request()
        .input("FECHA", sql.Date, fecha)
        .input("TURNO", sql.Int, turno)
        .input("TableName", sql.NVarChar(128), tablename)
        .execute("INSINK_sp_prodByHour");

        const hourly_goals = await poolCIMA.request()
        .input("LineId", sql.VarChar(20), "insi")
        .input("Fecha", sql.Date, fecha)
        .input("Turno", sql.Int, turno)
        .input("NumeroLinea", sql.Int, lineNo)
        .execute("SP_OBTENER_METAS_EFECTIVAS");

        //DEBUG---------------
        //console.log(`Estas son las metas de insi${lineNo} del turno ${turno}`);
        //--------------------    
        
        const production_data = hourly_production.recordset;
        const goals_data = hourly_goals.recordset;

        const final_result = goals_data.map(m =>{
            const HoraInicioSlot = parseInt(m.Hora_Slot.split(':')[0], 10);
            const ProduccionDeEstaHora = production_data.find(p => p.Hora === HoraInicioSlot);

            
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
        res.status(500).send('Error al obtener los datos');
    }
});


router.get("/total-day", async (req, res) => {
    const {fecha, lineNo} = req.query;
    const tablename = "EIN_0" + lineNo;
    try {
        //*Se hace la consulta de la info de la tabla de logs del tester de insinkerator
        const result = await poolINSI.request()
        .input("FECHA", sql.Date, fecha)
        .input("TableName", sql.NVarChar(128), tablename)
        .execute("INSINK_sp_totalProdByDate");

        const row = result.recordset[0];
        res.json({ TOTAL_DIA: row ? row.TOTAL_DIA : 0 })

    } catch (error) {
        res.status(500).send('Error al obtener los datos');
    }
});

router.get("/total-shift", async (req, res) => {
    const { fecha, lineNo } = req.query;
    const tablename = "EIN_0" + lineNo;
    try {

        const result = await poolINSI.request()
            .input("FECHA", sql.Date, fecha)
            .input("TableName", sql.NVarChar(128), tablename)   
            .execute("INSINK_sp_queryByDateAndShift");

        const rows = result.recordset;

        const turnosRequeridos = [1, 2, 3];
        const dataFinal = await Promise.all(turnosRequeridos.map(async (idTurno) => {
            // Consulta las metas para este turno específico
            const metas = await poolCIMA.request()
                .input("LineId", sql.VarChar(20), "insi")
                .input("Fecha", sql.Date, fecha)
                .input("Turno", sql.Int, idTurno)
                .input("NumeroLinea", sql.Int, lineNo)
                .execute("SP_OBTENER_METAS_EFECTIVAS");

            // Sumamos las metas de todas las horas de este turno
            const totalMetaTurno = metas.recordset.reduce((acc, curr) => acc + (curr.MetaEfectiva || 0), 0);

            // Buscamos producción real
            const registro = rows.find(r => r.TURNO === idTurno);

            return {
                TURNO: idTurno,
                CONTADOR: registro ? registro.CONTADOR : 0,
                MetaEfectivaTurno: totalMetaTurno // Nueva columna con la meta sumada
            };
        }));

        res.json(dataFinal);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener los datos');
    }
});

router.get("/shift", async(req,res) => {
    const { fecha, turno, lineNo } = req.query;
    const tablename = "EIN_0" + lineNo;
    try{
        const result = await poolINSI.request()
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
});

router.post("/save", async(req, res) =>{
    try {
        const { lineNo } = req.query;
        const reportData = req.body;

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

            await poolINSI.request()
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
                await poolINSI.request()
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
    }
});

router.get("/reports", async (req, res) => {
    const { fecha, turno, lineNo } = req.query;

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
                MODELO,
                LINEA
            FROM EIN_PERDIDAS
            WHERE
                CAST(FECHA AS DATE) = @fecha
                AND TURNO = @turno
                AND LINEA = @lineNo
        `;

        const result = await poolINSI.request()
            .input('fecha', sql.Date, fecha)
            .input('turno', sql.Int, turno)
            .input('lineNo', sql.Int, lineNo)
            .query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error al consultar historial Insinkerator:", err);
        res.status(500).json({ error: "Error al consultar la base de datos." });
    }
});

export default router;