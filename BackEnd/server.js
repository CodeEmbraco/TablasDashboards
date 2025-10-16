import express from "express";
import mysql from "mysql2/promise";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

//Esto para tenerlo a la a mano pq mas adelante lo tengo que adaptar ya que la Politica de Origenes Cruzados
//probablemente lo bloqueare
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

//Aqui poner pues todas las funciones que necesarias que seran llamadas desde el front por React
//La conexion MySQL con NodeJS esta funcionando, falta conectar React con NodeJS
//React x NodeJS <--> MySQL

app.get("/api/productividad", async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        const [rows] = await connection.execute("select * from tablapruebas");
        
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


//Server 
app.listen(3001, () => console.log("Server corriendo en el puerto 3001"));
