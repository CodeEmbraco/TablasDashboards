import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_LOCAL_BACKEND_URL || 'http://localhost:3001/api',
    headers: {'Content-Type' : 'application/json'}
});

const productionService =  {
    getHourlyData: async (lineID, date, shift) => {
        const response = await api.get(`/${lineID}/hourly`, {
            params: {fecha: date, turno: shift}
        });
        return response.data;
    },

    getTotalDate: async(lineID, date, shift) => {
        const response = await api.get(`/${lineID}/total-day`, {
            params : {fecha: date, turno: shift}
        });
        return response.data;
    },
    
    getTotalShiftDelta: async(lineID, date) => {
        const response = await api.get(`/${lineID}/total-shift`, {
            params : {fecha: date}
        });
        return response.data;
    },

    getTotalShift: async(lineID, date, shift) => {
        // console.log("##estoy en la funcion?");
        // console.log("##parametros? :", lineID, date, shift);
        const response = await api.get(`/${lineID}/shift`, {
            params: {fecha: date, turno: shift}
        });
        return response.data;
    },
    
    getLossReports: async(lineID, date, shift) => {
        const response = await api.get(`/${lineID}/reports`, {
            params: {fecha: date, turno: shift}
        });
        return response.data;
    },
    
    saveReport: async (lineID, reportData) => {
        const response = await api.get(`/${lineID}/save`, reportData);
        return response.data;
    }
} ;

export default productionService;