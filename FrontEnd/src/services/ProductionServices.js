import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_LOCAL_BACKEND_URL || 'http://localhost:3001/api',
    headers: {'Content-Type' : 'application/json'}
});

const productionService =  {
    getHourlyData: async (lineID, date, shift, lineNo = null) => {
        const params = { fecha: date, turno: shift };
        if (lineNo) params.lineNo = lineNo; // Solo inyectar si existe
        const response = await api.get(`/${lineID}/hourly`, { params });
        return response.data;
    },

    getTotalDate: async(lineID, date, lineNo = null) => {
        const params = { fecha: date };
        if (lineNo) params.lineNo = lineNo;
        const response = await api.get(`/${lineID}/total-day`, { params });
        return response.data;
    },
    
    getTotalShiftDelta: async(lineID, date, lineNo = null) => {
        const params = { fecha: date };
        if (lineNo) params.lineNo = lineNo;
        const response = await api.get(`/${lineID}/total-shift`, { params });
        return response.data;
    },

    getTotalShift: async(lineID, date, shift, lineNo = null) => {
        const params = { fecha: date, turno: shift };
        if (lineNo) params.lineNo = lineNo;
        const response = await api.get(`/${lineID}/shift`, { params });
        return response.data;
    },
    
    getLossReports: async(lineID, date, shift, lineNo = null) => {
        const params = { fecha: date, turno: shift };
        if (lineNo) params.lineNo = lineNo;
        const response = await api.get(`/${lineID}/reports`, { params });
        //DEBUG
        //console.log("QUE ES ESTO!?",response.data);
        return response.data;
    },
    
    saveReport: async (lineID, reportData, lineNo = null) => {
        const params = {};
        if (lineNo) params.lineNo = lineNo;
        const response = await api.post(`/${lineID}/save`, reportData, { params });
        return response.data;
    },

    getShiftsStatus: async (lineId, fecha, lineNo = null) => {
        const params = { fecha: fecha, lineId: lineId };
        if (lineNo) params.lineNo = lineNo;
        const response = await api.get(`shifts/shift-status`, { params });
        return response.data;
    },

    shiftToggleStatus: async (lineId, fecha, turno, nuevoEstado, lineNo = null) => {
        try {
            const response = await api.post('shifts/shift-toggle', {
                fecha: fecha,
                lineId: lineId,
                turno: turno,
                nuevoEstado: nuevoEstado,
                lineNo: lineNo
            });
            return response.data;
        } catch (error) {
            console.error("Error al actualizar el estado del turno en la BD:", error);
            throw error;
        }
    },

    getLinesConfig: async(lineId=null) => {
        const params = lineId ? { lineId: lineId } : {};
        const response = await api.get(`linesConfig/get-lines-config`, { params });
        return response.data;
    }
} ;

export default productionService;