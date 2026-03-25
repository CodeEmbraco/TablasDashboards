//BackEnd desarrollado por Jorge Barrón
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";
import sql from "mssql";
import sqlite from 'sqlite3'
import axios from 'axios';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Configuración MySQL - Electronics
const dbConfig = {
    host: process.env.DB_SERVER, 
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

// Configuración SQL Server para línea CDU
const sqlConfig = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE,
    server: process.env.MSSQL_SERVER,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false, 
        trustServerCertificate: true 
    }
};

// Configuración SQL Server para guardar el historial de las tablas
const sqlConfigCIMA = {
    user: process.env.CIMA_USER,
    password: process.env.CIMA_PASSWORD,
    database: process.env.CIMA_DATABASE,
    server: process.env.CIMA_SERVER,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false, 
        trustServerCertificate: true 
    }
};

//Config a sqlite para insinkerator
const dbPathLite = 'C:/Users/jorgeb03/Documents/db.sqlite3';

//*Para asegurar la conexion correcta 
const dbSQLite = new sqlite.Database(dbPathLite, (err) => {
    if (err) {
        console.error("Error al conectar con SQLite:", err.message);
    } else {
        console.log("Conectado exitosamente al archivo SQLite local.");
    }
});

//Config a sqlite para rotor wet y rotot insinkerator
const dbPathLiteWetISE = 'C:/Users/jorgeb03/Documents/Proyectos/PlataformaProduccion v3 - local/dbRotorWet.sqlite3';

//*Para asegurar la conexion correcta 
const dbSQLiteWetISE = new sqlite.Database(dbPathLiteWetISE, (err) => {
    if (err) {
        console.error("Error al conectar con SQLite:", err.message);
    } else {
        console.log("Conectado exitosamente al archivo SQLite local.");
    }
});

let connection;

// ====================================================================================================
// Endpoints General / MySQL
// ====================================================================================================

app.get("/api/productividad", async (req, res) => {
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("select Station, CH, Model, Lot, TestTime, SN, TestResult, Firmware_Download from tinyfct order by TestTime desc limit 10");
        res.json(rows);
    } catch (err) {
        console.error("Error al conectar con MySQL Server:", err);
        res.status(500).json({ error: "Error al conectar con MySQL Server. Por favor, verifica la conexión y credenciales." });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// ====================================================================================================
// Endpoints linea ELECTRONIC (MySQL)
// ====================================================================================================

app.get("/api/getModeloElectronics", async (req, res) => {
    let connection; 
    try{
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("select Model from tinyfct order by TestTime desc limit 1");
        res.json(rows);
    }catch(err){
        console.error("Error al conectar con MySQL Server:", err);
        res.status(500).json({ error: "Error al conectar con MySQL Server. Por favor, verifica la conexión y credenciales." });
    }finally{
        if (connection) {
            await connection.end();
        }
    }
});

app.get("/api/produccion-real", async (req, res) => {
    let connection;
    try {
        const { fecha, turno } = req.query;
        if (!fecha || !turno) {
            return res.status(400).json({ error: "Faltan parámetros: fecha y turno son requeridos." });
        }
        connection = await mysql.createConnection(dbConfig);

        const query = "CALL GetProduccionRealPorHora(?, ?)";
        const [rows] = await connection.execute(query, [fecha, turno]);
        
        res.json(rows[0]); 

    } catch (err) {
        console.error("Error al ejecutar Stored Procedure:", err);
        res.status(500).json({ error: "Error interno del servidor al obtener producción real." });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

app.post("/api/guardar-reporte", async (req, res) => {
    let connection;
    try {
        const reportData = req.body;

        if (!Array.isArray(reportData) || reportData.length === 0) {
            return res.status(400).json({ error: "Datos de reporte inválidos o vacíos." });
        }

        connection = await mysql.createConnection(dbConfig);
        
        for (const row of reportData) {
            const { Fecha, Turno, Hora_Slot, Supervisor, Lider, Batch, Modelo, Perdidas, Observaciones } = row;
            const query = "CALL GuardarReporteTablaProd(?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            await connection.execute(query, [
                Fecha, Turno, Hora_Slot, Supervisor, Lider, Batch, Modelo, Perdidas || 0, Observaciones || '' 
            ]);
        }

        res.status(200).json({ message: "Datos de reporte guardados exitosamente." });

    } catch (err) {
        console.error("Error al guardar el reporte:", err);
        res.status(500).json({ error: "Error interno del servidor al guardar el reporte." });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// ===========================================================================================
// Endpoints para la linea de CDU (SQL SERVER)
// ===========================================================================================

// Función auxiliar para calcular timestamps de los turnos
const getShiftTimestamps = (fechaStr, turno) => {
    const start = new Date(`${fechaStr}T00:00:00`);
    const end = new Date(`${fechaStr}T00:00:00`);
    
    if (turno === '1') {
        start.setHours(6, 0, 0, 0);
        end.setHours(14, 0, 0, 0);
    } else if (turno === '2') {
        start.setHours(14, 0, 0, 0);
        end.setHours(23, 0, 0, 0);
    } else if (turno === '3') {
        start.setDate(start.getDate() - 1); 
        start.setHours(23, 0, 0, 0);
        end.setHours(6, 0, 0, 0); 
    }
    return { start, end };
};

//endpoint para llenar la tabla y hacer la consulta
app.get("/api/cdu/produccion-real", async (req, res) => {
    const { fecha, turno } = req.query;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros fecha o turno" });
    }

    try {
        console.log(`--- CONSULTANDO CDU (SOLUCIÓN HORA LOCAL EXACTA) ---`);
        
        const { start, end } = getShiftTimestamps(fecha, turno);

        const formatDateLocal = (date) => {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            const ss = String(date.getSeconds()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
        };

        const startStr = formatDateLocal(start);
        const endStr = formatDateLocal(end);

        console.log(`Buscando exactamente desde: ${startStr} hasta ${endStr}`);

        let pool = await sql.connect(sqlConfig);

        const query = `
            SELECT 
                DATEPART(hour, Date_Tested) as HoraBD,
                COUNT(DISTINCT BARCODE) as Total,
                MAX(Model_ID) as Modelo
            FROM Results_Header
            WHERE 
                Date_Tested >= CAST(@startStr as DATETIME)
                AND Date_Tested < CAST(@endStr as DATETIME)
                AND Status = 1
                AND BARCODE NOT LIKE '515380100%'
                AND UNIT_ID = 67
            GROUP BY DATEPART(hour, Date_Tested)
            ORDER BY HoraBD ASC
        `;

        const result = await pool.request()
            .input('startStr', sql.VarChar, startStr)
            .input('endStr', sql.VarChar, endStr)
            .query(query);

        console.log(`Filas encontradas: ${result.recordset.length}`);

        const formattedData = result.recordset.map(row => {
            const horaLocal = row.HoraBD; 
            const horaFin = (horaLocal + 1) % 24;
            const strInicio = `${horaLocal.toString().padStart(2, '0')}:00`;
            const strFin = `${horaFin.toString().padStart(2, '0')}:00`;
            const slot = `${strInicio}-${strFin}`;
            
            return {
                time_slot: slot,
                piezas_reales: row.Total,
                Modelo: row.Modelo
            };
        });

        res.json(formattedData);

    } catch (err) {
        console.error("Error en SQL Server CDU:", err);
        res.status(500).json({ error: "Error al consultar SQL Server" });
    }
});

//endpoint para guardar el registro en la bd de CIMA
app.post("/api/guardar-reporte-cdu", async (req, res) => {
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
                    WHERE CAST(fecha AS DATE) = @Fecha 
                      AND turno = @Turno 
                      AND hora = @Hora
                `);

            for (const row of filasDeEstaHora) {
                await poolCIMA.request()
                    .input('Fecha', sql.Date, row.Fecha)
                    .input('Turno', sql.Int, row.Turno)
                    .input('Hora_Slot', sql.VarChar, row.Hora_Slot)
                    .input('Supervisor', sql.VarChar, row.Supervisor)
                    .input('Lider', sql.VarChar, row.Lider)
                    .input('Batch', sql.VarChar, row.Batch)
                    .input('Modelo', sql.VarChar, row.Modelo)
                    .input('Perdidas', sql.Int, row.Perdidas || 0)
                    .input('Observaciones', sql.VarChar, row.Observaciones || '')
                    .input('Motivo', sql.VarChar, row.Motivo || '') 
                    .query(`
                        INSERT INTO tbl_HistProdCDU (fecha, turno, hora, supervisor, lider, batch, modelo, perdidas, observaciones, motivo)
                        VALUES (@Fecha, @Turno, @Hora_Slot, @Supervisor, @Lider, @Batch, @Modelo, @Perdidas, @Observaciones, @Motivo)
                    `);
            }
        }

        res.status(200).json({ message: "Reporte guardado con desglose correctamente." });

    } catch (err) {
        console.error("Error al guardar el reporte CDU:", err);
        res.status(500).json({ error: "Error interno del servidor al guardar." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

//endpoint para saber si ya hay datos de la fecha y turno consultados
app.get("/api/cdu/reporte-guardado", async (req, res) => {
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
                batch,
                supervisor,
                lider,
                modelo
            FROM tbl_HistProdCDU
            WHERE 
                CAST(fecha AS DATE) = @fecha 
                AND turno = @turno
        `;

        const result = await poolCIMA.request()
            .input('fecha', sql.Date, fecha)
            .input('turno', sql.Int, turno)
            .query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error al consultar historial CDU:", err);
        res.status(500).json({ error: "Error al consultar la base de datos CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

//Endpoint para Obtener SOLO los DETALLES de Pérdidas
app.get("/api/cdu/detalles-perdidas", async (req, res) => {
    const { fecha, turno } = req.query;
    if (!fecha || !turno) return res.status(400).json({ error: "Faltan parámetros" });

    let poolCIMA;
    try {
        poolCIMA = new sql.ConnectionPool(sqlConfigCIMA);
        await poolCIMA.connect();
        const query = `
            SELECT h.hora as time_slot, d.idDetalle, d.motivo, d.minutos, d.observacion
            FROM tbl_HistProdCDU h
            INNER JOIN tbl_DetallePerdidasCDU d ON h.idCDU = d.idCDU
            WHERE CAST(h.fecha AS DATE) = @fecha AND h.turno = @turno
        `;
        const result = await poolCIMA.request().input('fecha', sql.Date, fecha).input('turno', sql.Int, turno).query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Error detalles." });
    } finally {
        if (poolCIMA) await poolCIMA.close();
    }
});


//Endpoint para obtener el TOTAL DEL DÍA 
app.get("/api/cdu/total-dia", async (req, res) => {
    const { fecha } = req.query; 

    if (!fecha) {
        return res.status(400).json({ error: "Falta parámetro fecha" });
    }

    try {
        console.log(`--- CALCULANDO TOTAL DÍA Y DESGLOSE ---`);

        const dateObj = new Date(`${fecha}T00:00:00`);
        const yesterdayObj = new Date(dateObj);
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);

        const fmt = (d, h) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${h}`;
        };

        const t3Start = fmt(yesterdayObj, '23:00:00');
        const t3End = fmt(dateObj, '06:00:00');
        const t1Start = fmt(dateObj, '06:00:00');
        const t1End = fmt(dateObj, '14:00:00');
        const t2Start = fmt(dateObj, '14:00:00');
        const t2End = fmt(dateObj, '23:00:00');

        let pool = await sql.connect(sqlConfig);

        const countRange = async (start, end) => {
            const query = `
                SELECT COUNT(DISTINCT BARCODE) as Cantidad
                FROM Results_Header
                WHERE Date_Tested >= CAST(@start as DATETIME)
                  AND Date_Tested < CAST(@end as DATETIME)
                  AND Status = 1
                  AND BARCODE NOT LIKE '515380100%'
                  AND UNIT_ID = 67
            `;
            const result = await pool.request()
                .input('start', sql.VarChar, start)
                .input('end', sql.VarChar, end)
                .query(query);
            return result.recordset[0]?.Cantidad || 0;
        };

        const [cntT3, cntT1, cntT2] = await Promise.all([
            countRange(t3Start, t3End),
            countRange(t1Start, t1End),
            countRange(t2Start, t2End)
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
        console.error("Error al consultar Total Día CDU:", err);
        res.status(500).json({ error: "Error al consultar SQL Server" });
    }
});

// ===========================================================================================
// Endpoints para la linea de Insinkerator
// ===========================================================================================
app.get("/api/insi/produccion-real", (req, res) => {
    const { fecha, turno } = req.query;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros fecha o turno" });
    }

    try {
        console.log(`CONSULTANDO INSINKERATOR`);

        //Determinar el rango local del turno
        let startYear = parseInt(fecha.split('-')[0]);
        let startMonth = parseInt(fecha.split('-')[1]) - 1; // Los meses en Date inician en 0
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
            startLocal.setDate(startLocal.getDate() - 1); // Turno 3 inicia el día anterior
            startLocal.setHours(23, 0, 0, 0);
            endLocal.setHours(6, 0, 0, 0);
        }

        //Sumar las 6 horas de desfase para empatar con ASSEMBLED_DATE en la BD
        const startDb = new Date(startLocal.getTime() + (6 * 60 * 60 * 1000));
        const endDb = new Date(endLocal.getTime() + (6 * 60 * 60 * 1000));

        // Función para formatear fechas
        const formatSqlite = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
        };

        const startStr = formatSqlite(startDb);
        const endStr = formatSqlite(endDb);

        console.log(`Rango Local: ${startLocal.getHours()}:00 a ${endLocal.getHours()}:00`);
        console.log(`Buscando en SQLite (+6h): ${startStr} hasta ${endStr}`);

        //Consulta SQL cruzando las tablas
        const query = `
            SELECT 
                strftime('%H', mc.ASSEMBLED_DATE) as HoraBD,
                COUNT(*) as Total,
                MAX(mc.condenser_material_code) as Modelo
            FROM pallets_mountedcomponent mc
            INNER JOIN pallets_pallet p ON mc.pallet_id = p.id
            WHERE p.workstation = 'MX8ST010'
              AND mc.ASSEMBLED_DATE >= ?
              AND mc.ASSEMBLED_DATE < ?
            GROUP BY strftime('%H', mc.ASSEMBLED_DATE)
            ORDER BY HoraBD ASC
        `;

        // Ejecutar consulta
        dbSQLite.all(query, [startStr, endStr], (error, rows) => {
            if (error) {
                console.error("Error en SQLite Insinkerator:", error.message);
                return res.status(500).json({ error: "Error al consultar SQLite" });
            }

            console.log(`Filas encontradas en SQLite: ${rows.length}`);

            //Mapear la hora de la BD de vuelta a la hora local para el FrontEnd
            const formattedData = rows.map(row => {
                const horaLocal = (parseInt(row.HoraBD, 10) - 6 + 24) % 24; 
                const horaFin = (horaLocal + 1) % 24;
                
                const strInicio = `${horaLocal.toString().padStart(2, '0')}:00`;
                const strFin = `${horaFin.toString().padStart(2, '0')}:00`;
                const slot = `${strInicio}-${strFin}`;
                
                return {
                    time_slot: slot,
                    piezas_reales: row.Total,
                    Modelo: row.Modelo || ''
                };
            });

            res.json(formattedData);
        });

    } catch (err) {
        console.error("Error general en el endpoint de Insinkerator:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.get("/api/insi/total-dia", async (req, res) => {
    const { fecha } = req.query; 

    if (!fecha) {
        return res.status(400).json({ error: "Falta parámetro fecha" });
    }

    try {
        console.log(`--- CALCULANDO TOTAL DÍA Y DESGLOSE INSINKERATOR ---`);

        //Parsear la fecha local exacta que viene del frontend
        let startYear = parseInt(fecha.split('-')[0]);
        let startMonth = parseInt(fecha.split('-')[1]) - 1;
        let startDay = parseInt(fecha.split('-')[2]);

        let dateObj = new Date(startYear, startMonth, startDay);
        let yesterdayObj = new Date(startYear, startMonth, startDay);
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);

        //!Función auxiliar para calcular la hora límite y sumar las 6 horas para la BD
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


        const t3Start = getDbTimeString(yesterdayObj, 23);
        const t3End = getDbTimeString(dateObj, 6);

        const t1Start = getDbTimeString(dateObj, 6);
        const t1End = getDbTimeString(dateObj, 14);

        const t2Start = getDbTimeString(dateObj, 14);
        const t2End = getDbTimeString(dateObj, 23);

        // promesa para ejecutar las consultas a SQLite
        const countRangeLite = (startStr, endStr) => {
            return new Promise((resolve, reject) => {
                const query = `
                    SELECT COUNT(*) as Cantidad
                    FROM pallets_mountedcomponent mc
                    INNER JOIN pallets_pallet p ON mc.pallet_id = p.id
                    WHERE p.workstation = 'MX8ST010'
                      AND mc.ASSEMBLED_DATE >= ?
                      AND mc.ASSEMBLED_DATE < ?
                `;
                // se usa pa dbSQLite.get para obtener solo una fila 
                dbSQLite.get(query, [startStr, endStr], (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.Cantidad : 0);
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
        console.error("Error al consultar Total Día Insinkerator:", err);
        res.status(500).json({ error: "Error al consultar SQLite" });
    }
});

// Endpoint para guardar el reporte en CIMA
app.post("/api/insi/guardar-reporte", async (req, res) => {
    let poolCIMA; 

    try {
        const reportData = req.body;

        if (!Array.isArray(reportData) || reportData.length === 0) {
            return res.status(400).json({ error: "Datos de reporte inválidos o vacíos." });
        }

        poolCIMA = new sql.ConnectionPool(sqlConfigCIMA);
        await poolCIMA.connect(); 

        // Agrupar por hora en caso de que manden multiples filas para la misma hora
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

            // borrar registros previos
            await poolCIMA.request()
                .input('Fecha', sql.Date, Fecha)
                .input('Turno', sql.Int, Turno)
                .input('Hora', sql.VarChar, horaSlot)
                .query(`
                    DELETE FROM tbl_HistProdInsi 
                    WHERE CAST(fecha AS DATE) = @Fecha 
                      AND turno = @Turno 
                      AND hora = @Hora
                `);

            //insertar los nuevos datos
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
                        INSERT INTO tbl_HistProdInsi (fecha, turno, hora, supervisor, lider, perdidas, observaciones, motivo)
                        VALUES (@Fecha, @Turno, @Hora_Slot, @Supervisor, @Lider, @Perdidas, @Observaciones, @Motivo)
                    `);
            }
        }

        res.status(200).json({ message: "Reporte de Insinkerator guardado correctamente en CIMA." });

    } catch (err) {
        console.error("Error al guardar el reporte Insinkerator:", err);
        res.status(500).json({ error: "Error interno del servidor al guardar en CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

// Endpoint para recuperar el reporte guardado 
app.get("/api/insi/reporte-guardado", async (req, res) => {
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
            FROM tbl_HistProdInsi
            WHERE CAST(fecha AS DATE) = @fecha 
              AND turno = @turno
        `;

        const result = await poolCIMA.request()
            .input('fecha', sql.Date, fecha)
            .input('turno', sql.Int, turno)
            .query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error al consultar historial Insinkerator:", err);
        res.status(500).json({ error: "Error al consultar la base de datos CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

// ===========================================================================================
// Endpoints para la linea de Rotor Wet
// ===========================================================================================

app.get("/api/rotwet/produccion-real", (req, res) => {
    const { fecha, turno } = req.query;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros fecha o turno" });
    }

    try {
        console.log(`CONSULTANDO ROTOR WET`);

        //Determinar el rango local del turno
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

        //Sumar las 6 horas de desfase para empatar con datetime_created en la BD
        const startDb = new Date(startLocal.getTime() + (6 * 60 * 60 * 1000));
        const endDb = new Date(endLocal.getTime() + (6 * 60 * 60 * 1000));

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

        const startStr = formatSqlite(startDb);
        const endStr = formatSqlite(endDb);

        console.log(`Rango Local Rotor Wet: ${startLocal.getHours()}:00 a ${endLocal.getHours()}:00`);
        console.log(`Buscando en SQLite Rotor Wet (+6h): ${startStr} hasta ${endStr}`);

        //Consulta SQL 
        const query = `
            SELECT 
                strftime('%H', datetime_created) as HoraBD,
                SUM(quantity) as Total,
                MAX(product) as Modelo
            FROM pallets_pallet
            WHERE workstation = 'MX4FA00P'
              AND datetime_created >= ?
              AND datetime_created < ?
            GROUP BY strftime('%H', datetime_created)
            ORDER BY HoraBD ASC
        `;

        //Ejecutar consulta en la instancia correcta de DB
        dbSQLiteWetISE.all(query, [startStr, endStr], (error, rows) => {
            if (error) {
                console.error("Error en SQLite Rotor Wet:", error.message);
                return res.status(500).json({ error: "Error al consultar SQLite de Rotor Wet" });
            }

            console.log(`Filas encontradas en SQLite Rotor Wet: ${rows.length}`);

            // 5. Mapear la hora de la BD (+6h) de vuelta a la hora local para el FrontEnd
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
        console.error("Error general en el endpoint de Rotor Wet:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.get("/api/rotwet/total-dia", async (req, res) => {
    const { fecha } = req.query; 

    if (!fecha) {
        return res.status(400).json({ error: "Falta parámetro fecha" });
    }

    try {
        console.log(`--- CALCULANDO TOTAL DÍA Y DESGLOSE ROTOR WET ---`);

        //Parsear la fecha local exacta que viene del frontend
        let startYear = parseInt(fecha.split('-')[0]);
        let startMonth = parseInt(fecha.split('-')[1]) - 1;
        let startDay = parseInt(fecha.split('-')[2]);

        let dateObj = new Date(startYear, startMonth, startDay);
        let yesterdayObj = new Date(startYear, startMonth, startDay);
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);

        //Función auxiliar para calcular la hora límite y sumar las 6 horas para la BD
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
                    WHERE workstation = 'MX4FA00P'
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
        console.error("Error al consultar Total Día Rotor Wet:", err);
        res.status(500).json({ error: "Error al consultar SQLite" });
    }
});

// Endpoint para guardar el reporte en CIMA (Rotor Wet)
app.post("/api/rotwet/guardar-reporte", async (req, res) => {
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
                    DELETE FROM tbl_HistProdRotWet 
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
                    .input('Motivo', sql.VarChar, row.Batch || '') // El front envía los motivos concatenados en 'Batch'
                    .query(`
                        INSERT INTO tbl_HistProdRotWet (fecha, hora, turno, supervisor, lider, perdidas, observaciones, motivo)
                        VALUES (@Fecha, @Hora_Slot, @Turno, @Supervisor, @Lider, @Perdidas, @Observaciones, @Motivo)
                    `);
            }
        }

        res.status(200).json({ message: "Reporte de Rotor Wet guardado correctamente en CIMA." });

    } catch (err) {
        console.error("Error al guardar el reporte Rotor Wet:", err);
        res.status(500).json({ error: "Error interno del servidor al guardar en CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

// Endpoint para recuperar el reporte guardado (Rotor Wet)
app.get("/api/rotwet/reporte-guardado", async (req, res) => {
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
            FROM tbl_HistProdRotWet
            WHERE CAST(fecha AS DATE) = @fecha 
              AND turno = @turno
        `;

        const result = await poolCIMA.request()
            .input('fecha', sql.Date, fecha)
            .input('turno', sql.Int, turno)
            .query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error al consultar historial Rotor Wet:", err);
        res.status(500).json({ error: "Error al consultar la base de datos CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

// ===========================================================================================
// Endpoints para la linea de Rotor Insinkerator
// ===========================================================================================

app.get("/api/rotise/produccion-real", (req, res) => {
    const { fecha, turno } = req.query;

    if (!fecha || !turno) {
        return res.status(400).json({ error: "Faltan parámetros fecha o turno" });
    }

    try {
        console.log(`CONSULTANDO ROTOR WET`);

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

        // Función para formatear fechas
        const formatSqlite = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
        };

        const startStr = formatSqlite(startDb);
        const endStr = formatSqlite(endDb);

        console.log(`Rango Local Rotor Wet: ${startLocal.getHours()}:00 a ${endLocal.getHours()}:00`);
        console.log(`Buscando en SQLite Rotor Wet (+6h): ${startStr} hasta ${endStr}`);

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
                console.error("Error en SQLite Rotor Wet:", error.message);
                return res.status(500).json({ error: "Error al consultar SQLite de Rotor Wet" });
            }

            console.log(`Filas encontradas en SQLite Rotor Wet: ${rows.length}`);

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
        console.error("Error general en el endpoint de Rotor Wet:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.get("/api/rotise/total-dia", async (req, res) => {
    const { fecha } = req.query; 

    if (!fecha) {
        return res.status(400).json({ error: "Falta parámetro fecha" });
    }

    try {
        console.log(`--- CALCULANDO TOTAL DÍA Y DESGLOSE ROTOR WET ---`);

        //Parsear la fecha local exacta que viene del frontend
        let startYear = parseInt(fecha.split('-')[0]);
        let startMonth = parseInt(fecha.split('-')[1]) - 1;
        let startDay = parseInt(fecha.split('-')[2]);

        let dateObj = new Date(startYear, startMonth, startDay);
        let yesterdayObj = new Date(startYear, startMonth, startDay);
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);

        //Función auxiliar para calcular la hora límite y sumar las 6 horas para la BD
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
        console.error("Error al consultar Total Día Rotor Wet:", err);
        res.status(500).json({ error: "Error al consultar SQLite" });
    }
});

// Endpoint para guardar el reporte en CIMA (Rotor ISE)
app.post("/api/rotise/guardar-reporte", async (req, res) => {
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

        res.status(200).json({ message: "Reporte de Rotor Wet guardado correctamente en CIMA." });

    } catch (err) {
        console.error("Error al guardar el reporte Rotor Wet:", err);
        res.status(500).json({ error: "Error interno del servidor al guardar en CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

// Endpoint para recuperar el reporte guardado (Rotor Ise)
app.get("/api/rotise/reporte-guardado", async (req, res) => {
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
        console.error("Error al consultar historial Rotor Wet:", err);
        res.status(500).json({ error: "Error al consultar la base de datos CIMA." });
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});
//? ----------------------
//? --Autor: Sean Garcia--
//? ----------------------
//ENDPOINTS DE ENSAMBLE
app.get("/api/ensamble/get_api_data", async (req, res) => {
    try {
        const response = await axios.get('http://10.13.225.20:3430/get_plc_data?IP=192.168.32.2&COUNTER=008&MATNR=130');
        res.json(response.data);
    } catch (error) {
        res.status(500).send('Error al obtener los datos');
    }
});

app.get("/api/ensamble/register_data", async (req, res) => {
    const { counter, product_id } = req.query;

    //Fecha Completa con Horas
    const now = new Date();

    //Fecha sin hora
    const queryDate = now.toISOString().split('T')[0];

    //Hora
    const hour = now.getHours();
    console.log;("Fecha Completa:\t", now,"\nQuery Date:\t", queryDate,"\nQuery Hours:\t", hour);

    //Logica de turno
    let turno
    if (hour >= 6 && hour < 14) {
        turno = 1; // 6:00 AM - 1:59 PM
    } else if (hour >= 14 && hour < 23) {
        turno = 2; // 2:00 PM - 10:59 PM
    } else {
        turno = 3; // 11:00 PM - 5:59 AM
    }

    //*Abrimos una conexion con CIMA
    let pool = await sql.connect(sqlConfigCIMA);
    try {
        //*Comprobamos que datos estamos recibiendo del Front
        console.log("counter:\t", counter,"\n","product_id:\t", product_id, "\n","fecha:\t", queryDate,"\n","turno:\t", turno);
        //*Mandaremos el contador, el modelo/product id, la hora de la consulta se hara directamente en el insert
        const result = await pool.request()
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
    }finally {
        if (pool) {
            await pool.close();
        }
    }
});

app.get("/api/ensamble/get_cima_data", async (req, res) => {
    //*Abrimos una conexion con CIMA
    let pool = await sql.connect(sqlConfigCIMA);
    try {
        //*Se hace la consulta de la info de la tabla de registros de Pre-Ensamble
        const result = await pool.request().execute("preEnsam_sp_query");

        res.json(result.recordset);
    } catch (error) {
        res.status(500).send('Error al obtener los datos');
    }finally {
        if (pool) {
            await pool.close();
        }
    }
});

app.get("/api/ensamble/get_cima_databyhour", async (req, res) => {
    const {fecha, turno} = req.query;
    //*Abrimos una conexion con CIMA
    let pool = await sql.connect(sqlConfigCIMA);
    try {
        //*Se hace la consulta de la info de la tabla de registros de Pre-Ensamble
        const result = await pool.request()
        .input("FECHA", sql.Date, fecha)
        .input("TURNO", sql.Int, turno)
        .execute("preEnsam_sp_prodByHour");

        res.json(result.recordset);
        
    } catch (error) {
        res.status(500).send('Error al obtener los datos');
    }finally {
        if (pool) {
            await pool.close();
        }
    }
});


app.get("/api/ensamble/get_cima_totalByDate", async (req, res) => {
    const {fecha} = req.query;
    //*Abrimos una conexion con CIMA
    let pool = await sql.connect(sqlConfigCIMA); 
    try {
        //*Se hace la consulta de la info de la tabla de registros de Pre-Ensamble
        const result = await pool.request()
        .input("FECHA", sql.Date, fecha)
        .execute("preEnsam_sp_totalProdByDate");
        
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

app.get("/api/ensamble/get_cima_totalByDateAndShift", async (req, res) => {
    const { fecha } = req.query;
    let pool;

    try {
        pool = await sql.connect(sqlConfigCIMA);
        
        const result = await pool.request()
            .input("FECHA", sql.Date, fecha)
            .execute("preEnsam_sp_queryByDateAndShift");
        
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

app.post("/api/ensamble/post_cima_report", async(req, res) =>{
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

app.get("/api/ensamble/get_cima_report", async (req, res) => {
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
    } finally {
        if (poolCIMA) {
            await poolCIMA.close();
        }
    }
});

//Server 
app.listen(3001, () => console.log("Server corriendo en el puerto 3001"));