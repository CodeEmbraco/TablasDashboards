//** BACKEND DE LAS TABLAS DE PRODUCTIVIDAD

//? --------------------------------------
//? --Autores: Jorge Barrón, Sean Garcia--
//? --------------------------------------
//Node
import express from "express";
import cors from "cors";

//Rutas
import utilsRoutes from "./routes/utilsRoutes.js";
import dynamicProductionRoutes from "./routes/dynamicProductionRoutes.js";

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/utils", utilsRoutes);
app.use("/api", dynamicProductionRoutes);


//Server 
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(` 🚀 Servidor API Node.js activo en puerto: ${PORT}`);
    console.log(` 👨‍💻 Desarrollador Principal: Sean Garcia`);
    console.log(` 🤖 Asistencia de Desarrollo: Gemini AI`);
    console.log(`=================================================\n`);
});