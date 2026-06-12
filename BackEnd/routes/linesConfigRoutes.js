import express from "express";
import sql from "mssql";
import { poolCIMA } from '../config/dbConnections.js';
const router = express.Router();

router.get("/get-lines-config", async (req, res) => {
    const {lineId} = req.query;
    try {
        const result = await poolCIMA.request()
        .input('LineId', sql.VarChar(20), lineId)
        .execute("sp_GetLinesConfig");

        return res.json(result.recordset);
    }
    catch(err){
        console.error("Error:", err);
    }
});

export default router;