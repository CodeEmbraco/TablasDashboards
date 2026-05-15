import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_LOCAL_BACKEND_URL || 'http://localhost:3001/api',
    headers: {'Content-Type' : 'application/json'}
});

const productionService =  {
    getHourlyData: async (lineID, date, shift, lineNo = null) => {
        const response = await api.get(`/${lineID}/hourly`, {
            params: {fecha: date, turno: shift, lineNo: lineNo}
        });
        return response.data;
    },

    getTotalDate: async(lineID, date, lineNo = null) => {
        const response = await api.get(`/${lineID}/total-day`, {
            params : {fecha: date, lineNo: lineNo}
        });
        return response.data;
    },
    
    getTotalShiftDelta: async(lineID, date, lineNo = null) => {
        const response = await api.get(`/${lineID}/total-shift`, {
            params : {fecha: date, lineNo: lineNo}
        });
        return response.data;
    },

    getTotalShift: async(lineID, date, shift, lineNo = null) => {
        // console.log("##estoy en la funcion?");
        // console.log("##parametros? :", lineID, date, shift);
        const response = await api.get(`/${lineID}/shift`, {
            params: {fecha: date, turno: shift, lineNo: lineNo}
        });
        return response.data;
    },
    
    getLossReports: async(lineID, date, shift, lineNo = null) => {
        const response = await api.get(`/${lineID}/reports`, {
            params: {fecha: date, turno: shift, lineNo: lineNo}
        });
        return response.data;
    },
    
    saveReport: async (lineID, reportData, lineNo = null) => {
        // En POST: body es el 2do arg, config (con params) es el 3ro
        const response = await api.post(`/${lineID}/save`, reportData, {
            params: { lineNo }
        }); 
        return response.data;
    }
} ;

export default productionService;