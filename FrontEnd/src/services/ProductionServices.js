import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_LOCAL_BACKEND_URL || 'http://localhost:3001/api',
    headers: {'Content-Type' : 'application/json'}
});

const productionService =  {
    //TABLA DE PRODUCTIVIDAD
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
    
    //PERDIDAS
    getLossReports: async(lineID, date, shift, lineNo = null) => {
        const params = { fecha: date, turno: shift };
        if (lineNo) params.lineNo = lineNo;
        const response = await api.get(`/${lineID}/reports`, { params });
        //DEBUG
        // console.log("QUE ES ESTO!?",response.data);
        return response.data;
    },
    
    saveReport: async (lineID, reportData, lineNo = null) => {
        console.log(`Si estoy entrando a /saveReport`)
        const params = {};
        if (lineNo) params.lineNo = lineNo;
        const response = await api.post(`/${lineID}/save`, reportData, { params });
        return response.data;
    },

    //ESTADOS DE TURNO
    getShiftsStatus: async (lineId, fecha, lineNo = null) => {
        const params = { fecha: fecha, lineId: lineId };
        if (lineNo) params.lineNo = lineNo;
        const response = await api.get(`utils/shift-status`, { params });
        return response.data;
    },

    shiftToggleStatus: async (lineId, fecha, turno, nuevoEstado, lineNo = null) => {
        try {
            const response = await api.post('utils/shift-toggle', {
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

    //CONFIGURACION DE LINEAS
    getLinesConfig: async(lineId=null) => {
        const params = lineId ? { lineId: lineId } : {};
        const response = await api.get(`utils/get-lines-config`, { params });
        return response.data;
    },

    //METAS
    updateDefaultGoalShift: async(lineId, turno, metaDefault,lineNo = null) => {
        try{
            const params = {};
            if (lineNo) params.lineNo = lineNo;
            const response = await api.post(`utils/default-goal-update-shift`, {
                lineId: lineId,
                turno: turno,
                metaDefault: metaDefault
            }, { params });
            return response.data;
        }
        catch(err){
            console.error("Error actualizando la meta:",err);
            throw err;
        }
    },
    
    updateDefaultGoalTimeSlot: async(lineId, horaSlot, metaDefault, lineNo = null) => {
        try{
            const params = {};
            if (lineNo) params.lineNo = lineNo;
            const response = await api.post(`utils/default-goal-update-timeslot`, {
                lineId: lineId,
                horaSlot: horaSlot,
                metaDefault: metaDefault
            }, { params });
            return response.data;
        }
        catch(err){
            console.error("Error actualizando la meta:",err);
            throw err;
        }
    },

    updateCustomGoal: async(lineId, fecha, turno, horaSlot, metaCustom, user, lineNo = null) => {
        try{
            const params = {};
            if (lineNo) params.lineNo = lineNo;
            const response = await api.post(`utils/custom-goal-update`, {
                lineId: lineId,
                fecha: fecha,
                turno: turno,
                horaSlot: horaSlot,
                metaCustom: metaCustom,
                user: user,
                lineNo: lineNo
            }, { params });
            return response.data;
        }
        catch(err){
            console.error("Error actualizando la meta:",err);
            throw err;
        }
    },

    getLineEffectiveGoalDay: async (lineId, date, lineNo = null) => {
        const params = { fecha: date, lineId: lineId };
        if (lineNo) params.lineNo = lineNo;
        const response = await api.get(`utils/line-effective-goal-day`, { params });
        return response.data;
    }
} ;

export default productionService;