import { poolCIMA } from './config/dbConnections.js';
import sql from 'mssql';

async function test() {
    try {
        const lineId = 'preensamble';
        const fecha = '2026-06-30';
        const lineNo = 1;
        const horaActual = '08:00:00';

        console.log("Calling stored procedure for line:", lineId);
        const result = await poolCIMA.request()
            .input('LineId', sql.VarChar(20), lineId)
            .input('Fecha', sql.Date, fecha)
            .input('NumeroLinea', sql.Int, lineNo)
            .input('HoraActual', sql.VarChar, horaActual)
            .execute("SP_OBTENER_METAS_EFECTIVAS_DIA_COMPLETO");

        console.log("Result Recordset:", result.recordset);
        process.exit(0);
    } catch (err) {
        console.error("Error executing query:", err);
        process.exit(1);
    }
}

test();
