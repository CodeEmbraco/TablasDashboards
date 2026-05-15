//** BACKEND DE LAS TABLAS DE PRODUCTIVIDAD

//? --------------------------------------
//? --Autores: Jorge Barrón, Sean Garcia--
//? --------------------------------------

import express from "express";
import cors from "cors";
import preensamRoutes from "./routes/preensambleRoutes.js"
import insiRoutes from "./routes/insinkeratorRoutes.js"
import cduRoutes from "./routes/cduRoutes.js"
import rotwetRoutes from "./routes/rotorWetRoutes.js"
import electronicRoutes from "./routes/electronicsRoutes.js"

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/preensamble", preensamRoutes);
app.use("/api/insi", insiRoutes);
app.use("/api/cdu", cduRoutes);
app.use("/api/rotwet", rotwetRoutes);
app.use("/api/electronic", electronicRoutes);

//Server 
app.listen(3001, () => console.log("Server corriendo en el puerto 3001"));