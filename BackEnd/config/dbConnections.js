import mysql from "mysql2/promise";
import sql from "mssql";
import sqlite from 'sqlite3';
import dotenv from "dotenv";

dotenv.config();

// MySQL Pool for Electronics
export const mysqlPool = mysql.createPool({
    host: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// SQL Server Config for CDU y THERMOFISHER
export const sqlConfig = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE,
    server: process.env.MSSQL_SERVER,
    pool: {
        max: 20,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// SQL Server Config for CIMA (Historial tables)
export const sqlConfigCIMA = {
    user: process.env.CIMA_USER,
    password: process.env.CIMA_PASSWORD,
    database: process.env.CIMA_DATABASE,
    server: process.env.CIMA_SERVER,
    pool: {
        max: 20,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// SQL Server for Insinkerator
export const sqlConfigINSI = {
    user: process.env.INSI_USER,
    password: process.env.INSI_PASSWORD,
    database: process.env.INSI_DATABASE,
    server: process.env.INSI_SERVER,
    pool: {
        max: 20,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// SQL Server de ECM FAN
export const sqlConfigFAN = {
    user: process.env.FAN_USER,
    password: process.env.FAN_PASSWORD,
    database: process.env.FAN_DATABASE,
    server: process.env.FAN_SERVER,
    pool: {
        max: 20,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};


// SQLite for Rotor Wet and Rotor Insinkerator
// const dbPathLiteWetISE = 'C:/Users/jorgeb03/Documents/Proyectos/PlataformaProduccion v3 - local/dbRotorWet.sqlite3';
// export const dbSQLiteWetISE = new sqlite.Database(dbPathLiteWetISE, (err) => {
//     if (err) {
//         console.error("Error al conectar con SQLite (Rotor Wet/ISE):", err.message);
//     } else {
//         console.log("Conectado exitosamente al archivo SQLite local (Rotor Wet/ISE).");
//     }
// });

// // Export a function to close SQLite connections if needed
// export const closeSqliteConnections = () => {
//     dbSQLite.close((err) => { if (err) console.error("Error closing Insinkerator SQLite DB:", err.message); else console.log("Insinkerator SQLite DB closed."); });
//     dbSQLiteWetISE.close((err) => { if (err) console.error("Error closing Rotor Wet/ISE SQLite DB:", err.message); else console.log("Rotor Wet/ISE SQLite DB closed."); });
// };

const poolCIMAInstance = new sql.ConnectionPool(sqlConfigCIMA);
const poolINSIInstance = new sql.ConnectionPool(sqlConfigINSI);
const poolFANInstance = new sql.ConnectionPool(sqlConfigFAN);
const poolPLISInstance = new sql.ConnectionPool(sqlConfig);

export const poolCIMA = await poolCIMAInstance.connect();
export const poolINSI = await poolINSIInstance.connect();
export const poolFAN = await poolFANInstance.connect();
export const poolPLIS = await poolPLISInstance.connect();
