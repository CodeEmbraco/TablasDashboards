import { useState, useEffect, useCallback } from 'react';
import { horaSlotFormatter, getFormattedDate } from '@utils/dateUtils';
import { construirEsqueletoTabla } from '@utils/dataUtils';

export const useProductionData = (linea, fecha, turno, metaPorHora, apiFunctions, lineNo = null) => {
    const [data, setData] = useState({
        tableItems: [],
        totalDia: 0,
        totalDelta: [],
        shiftsStatus: [],
        totalTurno: 0,
        metaTurnoDB: 0,
        loading: true,
        error: null
    });
    const [isSaving, setIsSaving] = useState(false);

    const saveLossRealTime = async (hora, minutosCalculados, detallesNuevos) => {
        setIsSaving(true);
        try{
            const padre = await apiFunctions.syncParentLoss( fecha, hora, lineNo, minutosCalculados );
            for(const detalle of detallesNuevos){
                await apiFunctions.addLossDetail(padre.data.IdPerdida, detalle);
            }
            await fetchAll(true);
        } catch (error){
            console.warn("Fallo de red detectado, guardando de localmente");

            const queueKey = `offline_queue_${linea}`;
            const queue = JSON.parse(localStorage.getItem(queueKey)) || [];
            queue.push({ hora, minutosCalculados, detallesNuevos, fecha, turno, lineNo});
            localStorage.setItem(queueKey, JSON.stringify(queue));
        } finally {
            setIsSaving(false);
        }
    };

    const syncOfflineQueue = async () => {
        const queueKey = `offline_queue_${linea}`;
        const queue = JSON.parse(localStorage.getItem(queueKey)) || [];

        if(queue.length === 0) return;

        setIsSaving(true);
        try {
            console.log(`Sincronizando ${queue.length} registros pendientes...`);
            for (const item of queue){
                const padre = await apiFunctions.syncParentLoss( item.fecha, item.hora, item.lineNo, item.minutosCalculados );
                for (const detalle of item.detallesNuevos){
                    await apiFunctions.addLossDetail(padre.data.IdPerdida, detalle);
                }
            }
            localStorage.removeItem(queueKey);
        } catch(error){
            console.warn("La red sigue inestable, se reintentará en el próximo ciclo");
        } finally{
            setIsSaving(false);
        }
    }

    const deleteLossRealTime = async (idDetalle) => {
        setIsSaving (true); 
        try{
            await apiFunctions.deleteLossDetail(idDetalle);
            await fetchAll(true);
        } catch (error){
            console.error("Error al borrar detalle", error);
            alert("Sin conexión! No se pudo borrar el registro");
        } finally{
            setIsSaving(false);
        }
    }

    const fetchAll = useCallback(async (isPoll = false) => {
        if (!isPoll) setData(prev => ({ ...prev, loading: true }));
        if (!turno || turno === '0') return;

        try {
            
            const [megaData, shiftsStatus] = await Promise.all([
                apiFunctions.getDailyProduction(fecha),
                apiFunctions.getShiftsStatus(fecha)
            ])

            const { totalDia, turnos, porHora } = megaData.produccion;
            const currentShiftData = turnos[`T${turno}`] || { produccion: 0, meta: 0, eficiencia: 0};

            const tableItems = construirEsqueletoTabla(fecha, turno, porHora, metaPorHora);

            const totalDelta = [
                {turno: 1, contador: turnos.T1.produccion, MetaEfectivaTurno: turnos.T1.meta},
                {turno: 2, contador: turnos.T2.produccion, MetaEfectivaTurno: turnos.T2.meta},
                {turno: 3, contador: turnos.T3.produccion, MetaEfectivaTurno: turnos.T3.meta}
            ];

            setData(prev => ({
                ...prev,
                tableItems,
                totalDia: totalDia.produccion,
                totalTurno: currentShiftData.produccion,
                metaTurnoDB: currentShiftData.meta,
                totalDelta: totalDelta,
                shiftsStatus: shiftsStatus || [],
                loading: false
            }));
            await syncOfflineQueue();
            console.log(data);
        } catch (error) {
            console.error("Error fetching data:", error);
            setData(prev => ({ ...prev, error, loading: false }));
        }
    }, [linea, fecha, turno, metaPorHora, apiFunctions, lineNo]);

    // Función para cambiar el estado del turno
    const toggleShiftDB = useCallback(async (turnoId, estadoActual) => {
        try {
            const nuevoEstado = !estadoActual; // Invertimos el estado actual (de 1 a 0 / de 0 a 1)

            // Enviamos los parámetros dinámicos correctos
            await apiFunctions.postShiftToggle(fecha, turnoId, nuevoEstado, lineNo);

            // Refrescamos la data de inmediato (esto actualizará las metas y estados en todo el front)
            fetchAll(true);
        } catch (err) {
            console.error("Error al cambiar el estado del turno en el Hook:", err);
        }
    }, [apiFunctions, fecha, lineNo, fetchAll]);

    useEffect(() => {
        const isToday = fecha === getFormattedDate();
        fetchAll();
        if (isToday && turno !== '0') {
            const interval = setInterval(() => fetchAll(true), 30000);
            return () => clearInterval(interval);
        }
    }, [fetchAll, fecha, turno]);

    return { ...data, toggleShiftDB, fetchAll };
};

export const useProductionDataLite = (fecha, apiFunctions, lineNo = null, liteMode = 'full') => {
    const [data, setData] = useState({
        totalDia: 0,
        accGoal: 0,
        totalDelta: [],
        shiftsStatus: [],
        loading: true,
        error: null
    });

    const fetchAll = useCallback(async (isPoll = false) => {
        if (!isPoll) setData(prev => ({ ...prev, loading: true }));

        try {
            if (liteMode === 'basic') {
                const [totalDiaRes, effectiveGoalRes] = await Promise.all([
                    apiFunctions.getTotalDate(fecha, lineNo),
                    apiFunctions.getLineEffectiveGoalDay(fecha, lineNo)
                ]);

                const accGoal = effectiveGoalRes.success && Array.isArray(effectiveGoalRes.data) && effectiveGoalRes.data.length > 0
                    ? (effectiveGoalRes.data[0].MetaDiaAcumuladaTotal || 0)
                    : 0;

                setData({
                    totalDia: totalDiaRes?.TOTAL_DIA || 0,
                    accGoal: accGoal,
                    totalDelta: [],
                    shiftsStatus: [],
                    loading: false,
                    error: null
                });
            } else {
                const [totalDiaRes, effectiveGoalRes, prodDelta, shiftsStatus] = await Promise.all([
                    apiFunctions.getTotalDate(fecha, lineNo),
                    apiFunctions.getLineEffectiveGoalDay(fecha, lineNo),
                    apiFunctions.getTotalShiftDelta(fecha, lineNo),
                    apiFunctions.getShiftsStatus(fecha, lineNo)
                ]);

                const accGoal = effectiveGoalRes.success && Array.isArray(effectiveGoalRes.data) && effectiveGoalRes.data.length > 0
                    ? (effectiveGoalRes.data[0].MetaDiaAcumuladaTotal || 0)
                    : 0;

                setData({
                    totalDia: totalDiaRes?.TOTAL_DIA || 0,
                    accGoal: accGoal,
                    totalDelta: prodDelta || [],
                    shiftsStatus: shiftsStatus || [],
                    loading: false,
                    error: null
                });
            }
        } catch (error) {
            console.error("Error fetching lite data:", error);
            setData(prev => ({ ...prev, error, loading: false }));
        }
    }, [fecha, apiFunctions, lineNo, liteMode]);

    const toggleShiftDB = useCallback(async (turnoId, estadoActual) => {
        try {
            const nuevoEstado = !estadoActual;
            await apiFunctions.postShiftToggle(fecha, turnoId, nuevoEstado, lineNo);
            fetchAll(true);
        } catch (err) {
            console.error("Error al cambiar el estado del turno en el Hook Lite:", err);
        }
    }, [apiFunctions, fecha, lineNo, fetchAll]);

    useEffect(() => {
        const isToday = fecha === getFormattedDate();
        fetchAll();
        if (isToday) {
            const interval = setInterval(() => fetchAll(true), 30000);
            return () => clearInterval(interval);
        }
    }, [fetchAll, fecha]);

    return { ...data, isSaving, toggleShiftDB, fetchAll, saveLossRealTime, deleteLossDetail };
};