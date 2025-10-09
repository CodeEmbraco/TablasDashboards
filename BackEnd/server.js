import express from "express";
import sql from "mssql";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const port = parseInt(process.env.DB_PORT, 10); 

const dbConfig = {
    server: process.env.DB_SERVER, 
    port: port,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: false, 
        trustServerCertificate: true, 
        trustedConnection: false, 
    },
};

app.get("/api/productividad", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT * FROM tablaPrueba");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error al conectar con SQL Server:", err);
        res.status(500).json({ error: "Error al conectar con SQL Server. Por favor, verifica el backend." });
    }
});

app.listen(3001, () => console.log("Server corriendo en el puerto 3001"));
