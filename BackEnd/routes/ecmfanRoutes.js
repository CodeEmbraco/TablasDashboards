import express from "express";
import sql from "mssql";
import { poolFAN, poolCIMA } from "../config/dbConnections.js";

const router = express.Router();
//? ----------------------
//? --Autor: Sean Garcia--
//? ----------------------

//ENDPOINTS DE ECMFAN
router.get("/hourly", async (req, res) => {
    const {fecha, turno} = req.query;

    //--------------------
    try {
        //*Se hace la consulta de la info de la tabla de registros de ECMFAN
        const hourly_production = await poolFAN.request()
        .input("fechaParam", sql.Date, fecha)
        .input("turnoParam", sql.Int, turno)
        .execute("ECMFAN_HOURLY");

        //DEBUG---------------
        // console.log("Pasó la consulta de ECMFAN!");
        //--------------------

        const hourly_goals = await poolCIMA.request()
        .input("LineId", sql.VarChar(20), "ecmfan")
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
    //*Abrimos una conexion con CIMA
    try {
        const result = await poolFAN.request()
        .input("fechaParam", sql.Date, fecha)
        .execute("ECMFAN_TOTALDAY");

        const row = result.recordset[0];
        res.json({ TOTAL_DIA: row ? row.TOTAL_DIA : 0 })

    } catch (error) {
        res.status(500).send('Error al obtener los datos');
    }
});

router.get("/total-shift", async (req, res) => {
    const { fecha } = req.query;

    try {
        // const conexionCIMA = await poolCIMA;

        // 1. Obtener producción real por turno
        const result = await poolFAN.request()
            .input("fechaParam", sql.Date, fecha)
            .execute("ECMFAN_TOTALSHIFT");
        const rows = result.recordset;

        // 2. Obtener las metas de todos los turnos para esa fecha
        const turnosRequeridos = [1, 2, 3];
        
        const dataFinal = await Promise.all(turnosRequeridos.map(async (idTurno) => {
            // Consulta las metas para este turno específico
            const metas = await poolCIMA.request()
                .input("LineId", sql.VarChar(20), "ecmfan")
                .input("Fecha", sql.Date, fecha)
                .input("Turno", sql.Int, idTurno)
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
        console.error("Error en /total-shift:", error);
        res.status(500).send('Error al obtener los datos');
    }
});

router.get("/shift", async(req,res) => {
    const { fecha, turno } = req.query;
    //console.log("^backend^ fecha: ", fecha, "\nturno: ", turno);
    try{
        const result = await poolFAN.request()
        .input("fechaParam", sql.Date, fecha)
        .input("turnoParam", sql.Int, turno)
        .execute("ECMFAN_SHIFT");

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
                    DELETE FROM tbl_HistProdECMFAN
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
                        INSERT INTO tbl_HistProdECMFAN (FECHA, TURNO, HORA, SUPERVISOR, LIDER, PERDIDAS, OBSERVACIONES, MODELO, MOTIVO)
                        VALUES (@Fecha, @Turno, @Hora_Slot, @Supervisor, @Lider, @Perdidas, @Observaciones, @Modelo, @Motivo)
                    `);
            }
        }

        res.status(200).json({ message: "Reporte guardado con desglose correctamente." });

    } catch (err) {
        console.error("Error al guardar el reporte Ensamble:", err);
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
            FROM tbl_HistProdECMFAN
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
        console.error("Error al consultar historial ECMFAN:", err);
        res.status(500).json({ error: "Error al consultar la base de datos CIMA." });
    }
});

export default router;