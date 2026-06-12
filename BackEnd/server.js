//** BACKEND DE LAS TABLAS DE PRODUCTIVIDAD

//? --------------------------------------
//? --Autores: Jorge Barrón, Sean Garcia--
//? --------------------------------------

import express from "express";
import cors from "cors";
import preensamRoutes from "./routes/preensambleRoutes.js"
import insiRoutes from "./routes/insinkeratorRoutes.js"
import cduRoutes from "./routes/cduRoutes.js"
// import rotwetRoutes from "./routes/rotorWetRoutes.js"
import electronicRoutes from "./routes/electronicsRoutes.js"
import thermoRoutes from "./routes/thermoRoutes.js"
import ecmfanRoutes from "./routes/ecmfanRoutes.js"
import shiftsRoutes from "./routes/shiftsRoutes.js"
import linesConfigRoutes from "./routes/linesConfigRoutes.js"


const app = express();
app.use(express.json());
app.use(cors());
app.use("/api/shifts", shiftsRoutes);
app.use("/api/linesConfig", linesConfigRoutes)
app.use("/api/preensamble", preensamRoutes);
app.use("/api/insi", insiRoutes);
app.use("/api/cdu", cduRoutes);
// app.use("/api/rotwet", rotwetRoutes);
app.use("/api/electronics", electronicRoutes);
app.use("/api/thermo", thermoRoutes);
app.use("/api/ecmfan", ecmfanRoutes);

//Server 
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(` 🚀 Servidor API Node.js activo en puerto: ${PORT}`);
    console.log(` 👨‍💻 Desarrollador Principal: Sean Garcia`);
    console.log(` 🤖 Asistencia de Desarrollo: Gemini AI`);
    console.log(`=================================================\n`);
});