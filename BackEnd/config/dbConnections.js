import mysql from "mysql2/promise";
import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

// =============================================================
// ? Reintentos automáticos con backoff exponencial
// =============================================================
const RETRY_DELAY_MS     = 5_000;   // 5 seg primer reintento
const MAX_RETRY_DELAY_MS = 60_000;  // tope de 60 seg

// MySQL Pool for Electronics
// createPool() es lazy: no conecta al crearse, sino al llegar la primera query.
// El proceso NO cae si MySQL no está disponible al arrancar, pero hacemos
// un ping en background con reintentos para visibilidad en logs.
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

async function pingMySQLWithRetry() {
    let delay = RETRY_DELAY_MS;
    while (true) {
        try {
            const conn = await mysqlPool.getConnection();
            conn.release();
            console.log(`✅  [DB] Conexión exitosa → MySQL (Electronics)`);
            return;
        } catch (err) {
            console.error(`❌  [DB] No se pudo conectar a MySQL (Electronics): ${err.message}`);
            console.log(`🔄  [DB] Reintentando MySQL en ${delay / 1000}s…`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
        }
    }
}

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

// // SQLite for Rotor Wet and Rotor Insinkerator
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
//     dbSQLite.close((err) => { if (err) console.error("Error closing Insinkerator SQLite DB:", err.message); else console.log("Rotor Wet/ISE SQLite DB closed."); });
// };


// =============================================================
// ? Conexión con reintentos automáticos (backoff exponencial)
// ? Si falla una BD, el proceso continúa y sigue reintentando
// =============================================================

/**
 * Conecta un mssql.ConnectionPool de forma persistente.
 * Si la conexión falla NO tumba el proceso; espera con backoff
 * exponencial y reintenta indefinidamente.
 *
 * @param {() => sql.ConnectionPool} poolFactory - función que crea una instancia nueva del pool
 * @param {string}                   name        - nombre para los logs
 * @param {{ current: sql.ConnectionPool | null }} ref - referencia mutable donde se guarda el pool
 */
async function connectWithRetry(poolFactory, name, ref) {
    let delay = RETRY_DELAY_MS;

    while (true) {
        try {
            const instance = poolFactory();
            const connected = await instance.connect();
            ref.current = connected;
            console.log(`✅  [DB] Conexión exitosa → ${name}`);
            return;
        } catch (err) {
            ref.current = null;
            console.error(`❌  [DB] No se pudo conectar a ${name}: ${err.message}`);
            console.log(`🔄  [DB] Reintentando ${name} en ${delay / 1000}s…`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * 2, MAX_RETRY_DELAY_MS); // backoff exponencial con tope
        }
    }
}

// Referencias mutables – arrancan en null y se llenan cuando conectan
const _refPLIS = { current: null };
const _refCIMA = { current: null };
const _refINSI = { current: null };
const _refFAN  = { current: null };

// Lanzamos las 5 conexiones en PARALELO; el fallo de una no afecta a las demás
pingMySQLWithRetry();
connectWithRetry(() => new sql.ConnectionPool(sqlConfig),     "PLIS  (CDU / Thermo)", _refPLIS);
connectWithRetry(() => new sql.ConnectionPool(sqlConfigCIMA), "CIMA  (Historial)",    _refCIMA);
connectWithRetry(() => new sql.ConnectionPool(sqlConfigINSI), "INSI  (Insinkerator)", _refINSI);
connectWithRetry(() => new sql.ConnectionPool(sqlConfigFAN),  "FAN   (ECM Fan)",      _refFAN);

/**
 * Getters seguros: devuelven el pool cuando está listo
 * o lanzan un error descriptivo si aún no está disponible.
 * Úsalos en las rutas cuando quieras ser explícito:
 *
 *   const pool = getPoolPLIS();
 *   await pool.request()…
 */
export const getPoolPLIS = () => {
    if (!_refPLIS.current) throw new Error("Pool PLIS no disponible – reconectando…");
    return _refPLIS.current;
};
export const getPoolCIMA = () => {
    if (!_refCIMA.current) throw new Error("Pool CIMA no disponible – reconectando…");
    return _refCIMA.current;
};
export const getPoolINSI = () => {
    if (!_refINSI.current) throw new Error("Pool INSI no disponible – reconectando…");
    return _refINSI.current;
};
export const getPoolFAN = () => {
    if (!_refFAN.current) throw new Error("Pool FAN no disponible – reconectando…");
    return _refFAN.current;
};

// Compatibilidad con las rutas existentes que importan poolPLIS / poolCIMA etc.
// Los Proxy delegan cada propiedad/método al getter en tiempo de ejecución,
// así las rutas reciben siempre el pool conectado sin necesidad de cambios.
export const poolPLIS = new Proxy({}, { get: (_, prop) => getPoolPLIS()[prop] });
export const poolCIMA = new Proxy({}, { get: (_, prop) => getPoolCIMA()[prop] });
export const poolINSI = new Proxy({}, { get: (_, prop) => getPoolINSI()[prop] });
export const poolFAN  = new Proxy({}, { get: (_, prop) => getPoolFAN()[prop]  });
