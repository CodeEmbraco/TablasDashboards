import { useState, useEffect, useCallback } from 'react';
import { generateHourSlots, getFormattedDate } from '@utils/dateUtils';
import { calcularMetaProgresiva } from '@utils/shiftUtils';

const getStorageKey = (fecha, turno, lineNo) => `pending_losses_${fecha}_T${turno}_L${lineNo}`;

export const useProductionData = (fecha, turno, metaPorHora, apiFunctions, lineNo = null) => {
    const [data, setData] = useState({
        tableItems: [],
        totalDia: 0,
        totalDelta: [],
        shiftsStatus:[],
        totalTurno: 0,
        metaTurnoDB: 0,
        loading: true,
        error: null
    }); 
    const { postReport } = apiFunctions;

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
            const safeProdDelta= Array.isArray(prodDelta) ? prodDelta : [];
            const currentShiftData = safeProdDelta.find(s => String(s.TURNO) === String(turno));
            
            //--DEBUG----------
            // console.log("prodDiaTurno: ", prodDiaTurno);
            // console.log("currentShiftData: ", currentShiftData);
            //-----------------

            const realTurno = currentShiftData ? (currentShiftData.CONTADOR || currentShiftData.REAL || 0) : 0;
            const metaTurnoDB = currentShiftData ? (currentShiftData.MetaEfectivaTurno || 0) : 0;

            const metaProgresivaCalculada = calcularMetaProgresiva(dataByHour, metaTurnoDB);

            //DEBUG: Estamos calculando bien la meta progresiva?
            //console.log("metaProgresivaCalculada: ", metaProgresivaCalculada);
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

                const currentReport = reporteDia.find(r => r.TIME_SLOT === slot);
                const localLossData = currentLocal[slot];

                return {
                    HORA: slot, 
                    REAL: currentProd ? (currentProd.ProduccionTotal || currentProd.REAL) : 0,
                    MODELO: currentProd ? (currentProd.Modelos || currentProd.MODELO) : "---",
                    META: currentProd ? (currentProd.MetaEfectiva || 0) : 0,
                    MINUTOS_PERDIDA: currentReport ? currentReport.PERDIDA_TOTAL 
                        : (localLossData ? localLossData.perdidas : 0),
                    OBSERVACIONES: currentReport ? currentReport.OBSERVACIONES 
                        : (localLossData ? localLossData.observaciones : ''),
                };
            });

            setData(prev => ({ 
                ...prev, 
                tableItems,
                totalDia: totalDiaRes.TOTAL_DIA,
                totalTurno: realTurno,
                metaTurnoDB,
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
            await postReport(reportData, lineNo); 
            localStorage.removeItem(getStorageKey(fecha, turno, lineNo));
            
        } catch (err) {
            console.error("Error saving report to DB:", err);
            throw err; 
        }
    }, [postReport, lineNo, fecha, turno]);

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


    return { ...data, toggleShiftDB,saveLocalLoss, saveReportToDB, fetchAll };
};