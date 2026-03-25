//API DE INSERT EN BD DE CIMA PARA TABLA DE PRE-ENSAMBLE
//Desarrollado por Sean Garcia 20-03-2026

import axios from "axios";
import sql from "mssql";
import cron from "node-cron";
import dotenv from "dotenv";

//*NUEVO CAMBIO 2026-03-25: SE AGREGO UN PARCHE PARA VALIDAR SI UN REGISTRO EXISTE DESDE EL NODE YA QUE POR ALGUNA 
//*RAZON SQL METE VARIOS DUPLICADOS DESDE LAS 18:00 HASTA LAS 00:00

dotenv.config();

// Configuración base de datos MSSQL
const sqlConfigCIMA = {
    user: process.env.CIMA_USER,
    password: process.env.CIMA_PASSWORD,
    server: process.env.CIMA_SERVER,
    database: process.env.CIMA_DATABASE,
    options: {
        encrypt: true, 
        trustServerCertificate: true 
    }
};

// Función para obtener datos y guardar
async function dataPLCInsert() {
    let pool, pool_query;
    try {
        //Datos del PLC
        const response = await axios.get('http://10.13.225.20:3430/get_plc_data?IP=192.168.32.2&COUNTER=008&MATNR=130');
        const { COUNTER, PRODUCT_ID } = response.data; 

        //Logica de fecha y turno
        const now = new Date();
        const queryDate = now.toISOString().split('T')[0];
        const hour = now.getHours();

        let turno;
        if (hour >= 6 && hour < 14) {
            turno = 1; // 6:00 AM - 1:59 PM
        } else if (hour >= 14 && hour < 23) {
            turno = 2; // 2:00 PM - 10:59 PM
        } else {
            turno = 3; // 11:00 PM - 5:59 AM
        }

        console.log(`--- Ejecutando Registro: ${now.toLocaleString()} ---`);
        console.log("Counter:", COUNTER, "| Product:", PRODUCT_ID, "| Turno:", turno);

        pool_query = await sql.connect(sqlConfigCIMA);
        const res_query = await pool_query.request()
            .input("COUNTER", sql.Int, COUNTER)
            .input("PRODUCT_ID", sql.VarChar, PRODUCT_ID)
            .input("FECHA", sql.Date, queryDate)
            .input("TURNO", sql.Int, turno)
            .execute(`preEnsam_sp_checkIsRegistered`)
        
        const row = res_query.recordset[0];
        const registro = row ? row.isRegistered : 0;

        if (registro === 1){
            console.log("REGISTRO YA EXISTENTE")
            return;
        }
		
        //Conexión e Insert en MSSQL
        pool = await sql.connect(sqlConfigCIMA);
        const result = await pool.request()
            .input("COUNTER", sql.Int, COUNTER)
            .input("PRODUCT_ID", sql.VarChar, PRODUCT_ID)
            .input("FECHA", sql.Date, queryDate)
            .input("TURNO", sql.Int, turno)
            .execute("preEnsam_sp_insert");

        console.log("INSERT: SUCCESS!");

    } catch (err) {
        console.error("Error en el ciclo de guardado:", err.message);
    } finally {
        if (pool) {
            await pool.close();
        }
        if (pool_query) {
            await pool_query.close();
        }
    }
}

//Se ejecuta cada 30 segundos
cron.schedule('*/30 * * * * *', () => {
    console.log('Iniciando consulta al PLC...');
    dataPLCInsert();
});

console.log('Servicio de monitoreo iniciado...');