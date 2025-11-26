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
//     origin: 'http://localhost:3000' //  URL del frontend en prod
// }));

const dbConfig = {
    host: process.env.DB_SERVER, 
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

let connection;


//====================================================================================================
//Aqui van los Endpoint para hacer funcionar el Dashboard de Electronics
//====================================================================================================
app.get("/api/productividad", async (req, res) => {
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("select Station, CH, Model, Lot, TestTime, SN, TestResult, Firmware_Download from tinyfct order by TestTime desc limit 10");
        res.json(rows);
    } catch (err) {
        console.error("Error al conectar con MySQL Server:", err);
        res.status(500).json({ error: "Error al conectar con MySQL Server." });
    } finally {
        if (connection) await connection.end();
    }
});


//Server 
app.listen(3001, () => console.log("Server corriendo en el puerto 3001"));