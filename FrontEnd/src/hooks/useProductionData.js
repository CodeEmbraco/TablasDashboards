import { useState, useEffect, useCallback } from 'react';
import { generateHourSlots, getFormattedDate } from '@utils/dateUtils';
import { calcularMetaProgresiva } from '@utils/shiftUtils';

const getStorageKey = (fecha, turno, lineNo) => `pending_losses_${fecha}_T${turno}_L${lineNo}`;

export const useProductionData = (fecha, turno, metaPorHora, apiFunctions, lineNo = null) => {
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

    const fetchAll = useCallback(async (isPoll = false) => {
        if (!isPoll) setData(prev => ({ ...prev, loading: true }));
        if (!turno || turno === '0') return;

        try {
            const [dataByHour, totalDiaRes, reporteDia, prodDiaTurno, prodDelta, shiftsStatus] = await Promise.all([
                apiFunctions.getHourData(fecha, turno, lineNo),     //Hora por Hora con meta individual (MetaEfectiva)
                apiFunctions.getTotalDate(fecha, lineNo),           //Total de producción de todos los turnos
                apiFunctions.getReport(fecha, turno, lineNo),       //Reportes de pérdidas
                apiFunctions.getTotalShift(fecha, turno, lineNo),   //Total de producción de un turno
                apiFunctions.getTotalShiftDelta(fecha, lineNo),     //Informacion de produccion por turno: real y meta total
                apiFunctions.getShiftsStatus(fecha, lineNo)         //Estatus de los turnos (Activos || Inactivos)
            ]);

            // Buscamos el objeto del turno seleccionado en el arreglo prodDiaTurno
            const safeProdDelta = Array.isArray(prodDelta) ? prodDelta : [];
            const currentShiftData = safeProdDelta.find(s => String(s.TURNO) === String(turno));

            //--DEBUG----------
            // console.log("prodDelta: ", prodDelta);
            // console.log("safeProdDelta: ", safeProdDelta);
            // console.log("prodDiaTurno: ", prodDiaTurno);
            // console.log("currentShiftData: ", currentShiftData);
            //-----------------

            const realTurno = currentShiftData ? (currentShiftData.CONTADOR || currentShiftData.REAL || 0) : 0;
            const metaTurnoDB = currentShiftData ? (currentShiftData.MetaEfectivaTurno || 0) : 0;

            //console.log(metaTurnoDB)

            const metaProgresivaCalculada = calcularMetaProgresiva(dataByHour, metaTurnoDB);

            //DEBUG: Estamos calculando bien la meta progresiva?
            // console.log("metaProgresivaCalculada: ", metaProgresivaCalculada);
            //-----------------


            const slots = generateHourSlots(turno);

            // Obtenemos las pérdidas locales si existen
            const key = getStorageKey(fecha, turno, lineNo);
            const currentLocal = JSON.parse(localStorage.getItem(key)) || {};
            const safeDataByHour = Array.isArray(dataByHour) ? dataByHour : [];

            //--DEBUG----------
            // console.log("safeDataByHour: ", safeDataByHour);
            // console.log("slots: ",slots);
            //-----------------


            const tableItems = slots.map(slot => {
                const slotStartHour = parseInt(slot.split(':')[0], 10);

                const currentProd = safeDataByHour.find(d =>
                    (d.Hora !== undefined && Number(d.Hora) === slotStartHour) ||
                    d.TIME_SLOT === slot ||
                    d.time_slot === slot
                );

                const real = currentProd ? (currentProd.ProduccionTotal || currentProd.REAL || 0) : 0;
                const meta = currentProd ? (currentProd.MetaEfectiva || 0) : 0;

                // Agregamos soporte para múltiples registros por hora desde la DB
                const dbReports = Array.isArray(reporteDia) ? reporteDia.filter(r => r.time_slot === slot && r.PERDIDAS !== null && r.PERDIDAS !== undefined) : [];
                const dbReportRow = Array.isArray(reporteDia) ? reporteDia.find(r => r.time_slot === slot) : null;
                const localLossData = currentLocal[slot];

                const perdidaCalculada = dbReportRow && dbReportRow.PerdidaCalculada !== undefined
                    ? dbReportRow.PerdidaCalculada
                    : (meta > 0 ? Math.max(0, Math.round(60 * (1 - (real / meta)))) : 0);

                const perdidaJustificada = localLossData
                    ? localLossData.perdidas
                    : dbReports.reduce((sum, r) => sum + (r.PERDIDAS || 0), 0);

                const perdidaNoJustificada = Math.max(0, perdidaCalculada - perdidaJustificada);

                const supervisor = dbReportRow?.SUPERVISOR || (dbReports[0]?.SUPERVISOR) || '0';
                const lider = dbReportRow?.LIDER || (dbReports[0]?.LIDER) || '0';

                return {
                    HORA: slot,
                    TIME_SLOT: slot, // Aseguramos compatibilidad con ambos nombres
                    time_slot: slot,
                    SUPERVISOR: supervisor,
                    LIDER: lider,
                    REAL: real,
                    MODELO: currentProd ? (currentProd.Modelos || currentProd.MODELO) : "---",
                    META: meta,
                    PERDIDA_CALCULADA: perdidaCalculada,
                    PERDIDA_JUSTIFICADA: perdidaJustificada,
                    PERDIDA_NO_JUSTIFICADA: perdidaNoJustificada,
                    // Prioridad: Si hay cambios locales (borrador), mostramos eso. Si no, lo de la DB.
                    MINUTOS_PERDIDA: perdidaJustificada,
                    OBSERVACIONES: localLossData ? localLossData.observaciones
                        : dbReports.map(r => r.OBSERVACIONES).filter(Boolean).join(' | '),
                    DETALLES: localLossData ? localLossData.detalles
                        : dbReports.map(r => ({
                            minutos: r.PERDIDAS,
                            motivo: r.MOTIVO,
                            maquina: r.MAQUINA || '',
                            observacion: r.OBSERVACIONES
                        }))
                };
            });

            setData(prev => ({
                ...prev,
                tableItems,
                totalDia: totalDiaRes.TOTAL_DIA,
                totalTurno: realTurno,
                metaTurnoDB: metaTurnoDB,
                metaProgresiva: metaProgresivaCalculada,
                totalDelta: prodDelta,
                shiftsStatus: shiftsStatus || [],
                loading: false
            }));

        } catch (error) {
            console.error("Error fetching data:", error);
            setData(prev => ({ ...prev, error, loading: false }));
        }
    }, [fecha, turno, metaPorHora, apiFunctions, lineNo]);

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

    // Función para persistir cambios locales del modal
    const saveLocalLoss = (slot, totalMinutos, formattedString, detallesArray) => {
        const key = getStorageKey(fecha, turno, lineNo);
        const currentLocal = JSON.parse(localStorage.getItem(key)) || {};

        currentLocal[slot] = {
            perdidas: totalMinutos,
            observaciones: formattedString,
            detalles: detallesArray
        };

        localStorage.setItem(key, JSON.stringify(currentLocal));
        fetchAll(true);
    };

    // Function to save report data to the database
    const saveReportToDB = useCallback(async (reportData) => {
        try {
            await apiFunctions.postReport(reportData, lineNo);
            localStorage.removeItem(getStorageKey(fecha, turno, lineNo));

        } catch (err) {
            console.error("Error saving report to DB:", err);
            throw err;
        }
    }, [apiFunctions, lineNo, fecha, turno]);

    useEffect(() => {
        const isToday = fecha === getFormattedDate();
        fetchAll();
        if (isToday && turno !== '0') {
            const interval = setInterval(() => fetchAll(true), 30000);
            return () => clearInterval(interval);
        }
    }, [fetchAll, fecha, turno]);

    //DEBUG----------------------
    //console.log("Production Data:",data);
    //---------------------------


    return { ...data, toggleShiftDB, saveLocalLoss, saveReportToDB, fetchAll };
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

    return { ...data, toggleShiftDB, fetchAll };
};