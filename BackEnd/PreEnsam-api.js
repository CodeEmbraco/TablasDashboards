//API DE INSERT EN BD DE EM10VS0034 PARA TABLA DE PRE-ENSAMBLE
//Desarrollado por Sean Garcia 20-03-2026

import axios from "axios";
import sql from "mssql";
import cron from "node-cron";
import dotenv from "dotenv";

//*NUEVO CAMBIO 2026-03-25: SE AGREGO UN PARCHE PARA VALIDAR SI UN REGISTRO EXISTE DESDE EL NODE YA QUE POR ALGUNA 
//*RAZON SQL METE VARIOS DUPLICADOS DESDE LAS 18:00 HASTA LAS 00:00

dotenv.config();

// Configuración base de datos MSSQL
const sqlConfigDB = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
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
        
        // CORRECCIÓN: Obtener componentes locales para evitar el salto de UTC a las 18:00
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Los meses van de 0 a 11
        const day = String(now.getDate()).padStart(2, '0');
        
        const queryDate = `${year}-${month}-${day}`; // Formato YYYY-MM-DD local
        
        const hour = now.getHours();

        let turno;
        if (hour >= 6 && hour < 14) {
            turno = 1; // 6:00 AM - 1:59 PM
        } else if (hour >= 14 && hour < 23) {
            turno = 2; // 2:00 PM - 10:59 PM
        } else {
            turno = 3; // 11:00 PM - 5:59
        }

        console.log(`--- Ejecutando Registro Local: ${queryDate} ${now.toLocaleTimeString()} ---`);
        console.log("Counter:", COUNTER, "| Product:", PRODUCT_ID, "| Turno:", turno);
        
        pool_query = await sql.connect(sqlConfigDB);
        const res_query = await pool_query.request()
            .input("COUNTER", sql.Int, COUNTER)
            .input("PRODUCT_ID", sql.VarChar, PRODUCT_ID)
            .input("FECHA", sql.Date, queryDate)
            .input("TURNO", sql.Int, turno)
            .execute(`sp_preensamble_isregistered`)
        
        const row = res_query.recordset[0];
        const registro = row ? row.isRegistered : 0;

        if (registro === 1){
            console.log("REGISTRO YA EXISTENTE")
            return;
        }
		
        //Conexión e Insert en MSSQL
        pool = await sql.connect(sqlConfigDB);
        const result = await pool.request()
            .input("COUNTER", sql.Int, COUNTER)
            .input("PRODUCT_ID", sql.VarChar, PRODUCT_ID)
            .input("FECHA", sql.Date, queryDate)
            .input("TURNO", sql.Int, turno)
            .execute("sp_preensamble_insert");

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