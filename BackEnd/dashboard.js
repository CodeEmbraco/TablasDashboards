//BackEnd desarrollado por Jorge Barrón
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// conexiones
const pool = mysql.createPool({
    host: process.env.DB_SERVER, 
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0
});

//====================================================================================================
//Aqui van los Endpoint para hacer funcionar el Dashboard de Electronics
//====================================================================================================

//este es nada mas el de prueba
app.get("/api/productividad", async (req, res) => {
    try {
        const [rows] = await pool.execute("select Station, CH, Model, Lot, TestTime, SN, TestResult, Firmware_Download from tinyfct order by TestTime desc limit 10");
        res.json(rows);
    } catch (err) {
        console.error("Error al conectar con MySQL Server:", err);
        res.status(500).json({ error: "Error al conectar con MySQL Server." });
    }
});

// Endpoint para obtener la productividad del día 
app.get("/api/dashboard/productivity-day", async (req, res) => {
    try {
        const { fecha } = req.query; // recibe el parametro de la fecha
        
        if (!fecha) {
             return res.status(400).json({ error: "Fecha requerida" });
        }

        // Llamamos al SP usando el pool
        const [rows] = await pool.execute("CALL GetProductivityByDay(?)", [fecha]);
        
        // El SP devuelve un objeto
        const result = rows[0][0];
        
        // se pasa a un arreglo mas sencillo de graficar
        const dataArray = [result.Turno1, result.Turno2, result.Turno3];
        
        res.json(dataArray);

    } catch (err) {
        console.error("Error en productividad del día:", err);
        res.status(500).json({ error: "Error interno" });
    }
});

//Endpoint para la productividad del dia divida entre los 3 turnos
app.get("/api/dashboard/productivity-shifts", async (req, res) => {
    try {
        //obtener hora actual
        const now = new Date();
        
        // restar 6 horas para asegurar lo del turno 3
        now.setHours(now.getHours() - 6);

        //Formateo manual a YYYY-MM-DD usando la hora local del servidor
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const TARGET_DATE = `${year}-${month}-${day}`;

        // restar 6 horas a la fecha para determinar el turno
        const query = `
            SELECT
                CASE
                    WHEN TIME(EndTime) >= '06:00:00' AND TIME(EndTime) < '14:00:00' THEN 'Turno 1'
                    WHEN TIME(EndTime) >= '14:00:00' AND TIME(EndTime) < '23:00:00' THEN 'Turno 2'
                    ELSE 'Turno 3'
                END AS turno,
                COUNT(*) as total_piezas
            FROM
                generater_test
            WHERE
                result = 'PASS'
                AND DATE(DATE_SUB(EndTime, INTERVAL 6 HOUR)) = ?
            GROUP BY
                turno
        `;

        const [rows] = await pool.execute(query, [TARGET_DATE]);

        // crear un objeto base con ceros para asegurar que siempre existan los 3 turnos
        const finalData = {
            'Turno 1': 0,
            'Turno 2': 0,
            'Turno 3': 0
        };

        //llenamos con la info de la BD
        rows.forEach(row => {
            if (finalData[row.turno] !== undefined) {
                finalData[row.turno] = row.total_piezas;
            }
        });

        res.json(Object.values(finalData));

    } catch (err) {
        console.error("Error en productividad por turnos:", err);
        res.status(500).json({ error: "Error interno al obtener datos de turnos" });
    }
});

// Función auxiliar para obtener el Lunes de la semana de una fecha seleccionada
function getMonday(d) {
  d = new Date(d);
  const day = d.getDay(); 
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  return new Date(d.setDate(diff));
}

// Endpoint para Producción Semanal 
app.get("/api/dashboard/weekly-production", async (req, res) => {
    try {
        //fecha automatica
        const now = new Date();
        
        // restar 6 horas para asegurar lo del turno 3
        now.setHours(now.getHours() - 6);

        //Formateo manual a YYYY-MM-DD
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const TARGET_DATE = `${year}-${month}-${day}`;

        const mondayDate = getMonday(TARGET_DATE);
        const nextMondayDate = new Date(mondayDate);
        nextMondayDate.setDate(mondayDate.getDate() + 7);

        const formatDate = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        const startStr = formatDate(mondayDate);
        const endStr = formatDate(nextMondayDate);

        console.log("DEBUG: Buscando entre", startStr, "y", endStr);

        const query = `
            SELECT 
                WEEKDAY(DATE_SUB(REPLACE(EndTime, '/', '-'), INTERVAL 6 HOUR)) as dia_index,
                COUNT(*) as total_piezas
            FROM 
                generater_test
            WHERE 
                result = 'PASS' AND 
                REPLACE(EndTime, '/', '-') >= CONCAT(?, ' 06:00:00')
                AND REPLACE(EndTime, '/', '-') < CONCAT(?, ' 06:00:00')
            GROUP BY 
                dia_index
            ORDER BY 
                dia_index ASC;
        `;

        const [rows] = await pool.execute(query, [startStr, endStr]);
        console.log("DEBUG: Filas encontradas:", rows.length); 

        const weeklyData = [0, 0, 0, 0, 0, 0, 0];

        rows.forEach(row => {
            if (weeklyData[row.dia_index] !== undefined) {
                weeklyData[row.dia_index] = row.total_piezas;
            }
        });

        res.json(weeklyData);

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ error: "Error interno" });
    }
});

// Endpoint para obtener el Modelo actual (último registro)
app.get("/api/dashboard/current-model", async (req, res) => {
    try {
        const query = `
            SELECT Model 
            FROM generater_test 
            ORDER BY Date DESC, EndTime DESC 
            LIMIT 1
        `;
        
        const [rows] = await pool.execute(query);

        if (rows.length > 0) {
            res.json({ model: rows[0].Model });
        } else {
            res.json({ model: "N/A" }); 
        }

    } catch (err) {
        console.error("Error obteniendo modelo:", err);
        res.status(500).json({ error: "Error al obtener modelo" });
    }
});

// Endpoint para grafica Pérdidas (Downtime)
app.get("/api/dashboard/downtime", async (req, res) => {
    try {
        const now = new Date();
        const currentHour = now.getHours();

        //Ajustamos día productivo (si es antes de las 6am cuenta como ayer)
        const productionDate = new Date(now);
        productionDate.setHours(productionDate.getHours() - 6);
        const dateStr = productionDate.toISOString().split('T')[0];

        //Calculamos turno actual para filtrar en la BD
        let currentShift = 3; // Por defecto noche
        if (currentHour >= 6 && currentHour < 14) currentShift = 1;
        else if (currentHour >= 14 && currentHour < 23) currentShift = 2;

        console.log(`DEBUG DOWNTIME: Buscando Fecha: ${dateStr}, Turno: ${currentShift}`);

        //agrupar por el slot de la hora
        const query = `
            SELECT Hora_Slot, SUM(Perdidas) as total_perdidas
            FROM tbl_electronics_histtablaprod
            WHERE Fecha = ? AND Turno = ?
            GROUP BY Hora_Slot
        `;
        
        const [rows] = await pool.execute(query, [dateStr, currentShift]);
        
        // Devolvemos los datos y qué turno calculo el backend
        res.json({ shift: currentShift, data: rows });

    } catch (err) {
        console.error("Error en downtime:", err);
        res.status(500).json({ error: "Error al obtener downtime" });
    }
});

//Server 
app.listen(3002, () => console.log("Server corriendo en el puerto 3002"));