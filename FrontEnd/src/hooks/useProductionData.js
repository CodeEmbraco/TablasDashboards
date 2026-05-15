import { useState, useEffect, useCallback } from 'react';
import { generateHourSlots, getFormattedDate } from '@utils/dateUtils';

const getStorageKey = (fecha, turno) => `pending_losses_${fecha}_T${turno}`;

export const useProductionData = (fecha, turno, metaPorHora, apiFunctions, lineNo = null) => {
    const [data, setData] = useState({
        tableItems: [],
        totalDia: 0,
        totalDelta: [ {CONTADOR:0}, {CONTADOR:0}, {CONTADOR:0} ],
        totalTurno: 0,
        loading: true,
        error: null
    }); 
    const { postReport } = apiFunctions; // Destructure postReport here

    const fetchAll = useCallback(async (isPoll = false) => {
        if (!isPoll) setData(prev => ({ ...prev, loading: true }));
        if (!turno || turno === '0') return;

        try {
            const [dataByHour, totalDiaRes, reporteDia, prodDiaTurno, prodDelta] = await Promise.all([
                apiFunctions.getHourData(fecha, turno, lineNo),
                apiFunctions.getTotalDate(fecha, lineNo),
                apiFunctions.getReport(fecha, turno, lineNo),
                apiFunctions.getTotalShift(fecha, turno, lineNo),
                apiFunctions.getTotalShiftDelta(fecha, lineNo)
            ]);

            const slots = generateHourSlots(turno);
            const localSaved = JSON.parse(localStorage.getItem(getStorageKey(fecha, turno))) || {};

            const unifiedRows = slots.map(slot => {
                const hourInt = parseInt(slot.split(':')[0]);
                const prodRow = dataByHour.find(p => Number(p.Hora || p.hora) === hourInt) || {};
                const localChange = localSaved[slot];

                const dbLosses = reporteDia.filter(r => (r.time_slot || r.Hora_Slot || r.hora_slot) === slot);
                const dbMins = dbLosses.reduce((acc, curr) => acc + (curr.PERDIDAS || curr.perdidas || 0), 0);
                const dbObs = dbLosses.map(r => r.OBSERVACIONES || r.observaciones).filter(Boolean).join(' | ');

                return {
                    HORA: hourInt,
                    TIME_SLOT: slot,
                    META: metaPorHora,
                    REAL: prodRow.ProduccionTotal || 0,
                    MODELO: prodRow.Modelos || prodRow.Modelo || '---',
                    MINUTOS_PERDIDA: localChange ? localChange.perdidas : dbMins,
                    OBSERVACIONES: localChange ? localChange.observaciones : dbObs,
                    DETALLES: localChange ? localChange.detalles : dbLosses.map(l => ({
                        minutos: l.PERDIDAS || l.perdidas || 0,
                        observacion: l.OBSERVACIONES || l.observaciones || '',
                        motivo: l.MOTIVO || l.motivo || ''
                    }))
                };
            });

            setData({
                tableItems: unifiedRows,
                totalDia: totalDiaRes.TOTAL_DIA || 0,
                turnoDelta: prodDelta,
                totalTurno: prodDiaTurno.TOTAL_TURNO,
                loading: false,
                error: null
            });

        } catch (err) {
            console.error("Error en useProductionData:", err);
            setData(prev => ({ ...prev, loading: false, error: "Error al cargar datos" }));
        }
    }, [fecha, turno, metaPorHora, apiFunctions, lineNo]);

    // Función para persistir cambios locales del modal
    const saveLocalLoss = (slot, totalMinutos, formattedString, detallesArray) => {
        const key = getStorageKey(fecha, turno);
        const currentLocal = JSON.parse(localStorage.getItem(key)) || {};

        currentLocal[slot] = {
            perdidas: totalMinutos,
            observaciones: formattedString,
            detalles: detallesArray
        };

        localStorage.setItem(key, JSON.stringify(currentLocal));
        fetchAll(true); // Refresco silencioso
    };

    // Function to save report data to the database
    const saveReportToDB = useCallback(async (reportData) => {
        try {
            await postReport(reportData, lineNo); // Pasar lineNo aquí también
        } catch (err) {
            console.error("Error saving report to DB:", err);
            throw err; // Re-throw to be handled by the component
        }
    }, [postReport, lineNo]);

    useEffect(() => { // This useEffect should be after saveReportToDB definition if it uses it.
        const isToday = fecha === getFormattedDate();
        fetchAll();
        if (isToday && turno !== '0') {
            const interval = setInterval(() => fetchAll(true), 30000);
            return () => clearInterval(interval);
        }
    }, [fetchAll, fecha, turno]);

    return { ...data, saveLocalLoss, saveReportToDB, refresh: fetchAll };
};