//BackEnd desarrollado por Jorge Barrón
import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

//Esto para tenerlo a la a mano pq mas adelante lo tengo que adaptar ya que la Politica de Origenes Cruzados
//probablemente lo bloqueara
// app.use(cors({
//     origin: 'http://localhost:3000' // O URL del frontend en prod
// }));

const dbConfig = {
    host: process.env.DB_SERVER, 
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

let connection;

//Ya estan todas las conexiones funcionando
//React <-> NodeJS <--> MySQL

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

//====================================================================================================
//Aqui va todo el codigo relacionado con la line de ELECTRONIC
//====================================================================================================

//Aqui se obtiene el ultimo modelo que se escanea, es decir con el que se esta trabajando
app.get("/api/getModeloElectronics", async (req, res) => {
    let connection; // <-- Añadimos let connection para asegurar el finally
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

// Endpoint para obtener la producción real por hora, en base al turno y dia seleccionado
app.get("/api/produccion-real", async (req, res) => {
    let connection;
    try {
        //Obtener parámetros del frontend
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

//Endpoint que recibe los datos de pulsar el boton guardar y llama al stored procedure que hace el upsert
app.post("/api/guardar-reporte", async (req, res) => {
    let connection;
    try {
        //recibimos los datos mandados desde el front en un arreglo
        const reportData = req.body;

        if (!Array.isArray(reportData) || reportData.length === 0) {
            return res.status(400).json({ error: "Datos de reporte inválidos o vacíos." });
        }

        //la conexión
        connection = await mysql.createConnection(dbConfig);
        
        // las filas con los datos y la llamada al sp
        for (const row of reportData) {
            const { 
                Fecha, 
                Turno, 
                Hora_Slot, 
                Supervisor, 
                Lider, 
                Batch, 
                Modelo, 
                Perdidas, 
                Observaciones 
            } = row;
            
            const query = "CALL GuardarReporteTablaProd(?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            await connection.execute(query, [
                Fecha, 
                Turno, 
                Hora_Slot, 
                Supervisor, 
                Lider, 
                Batch, 
                Modelo, 
                Perdidas || 0,
                Observaciones || '' 
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

//Server 
app.listen(3001, () => console.log("Server corriendo en el puerto 3001"));