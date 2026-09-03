import { useMemo, useState, useEffect } from 'react';
import { getCurrentShift, getFormattedDate } from '@utils/dateUtils';

export const useProductionMetrics = (
    tableItems,       // Desglose hora por hora del turno seleccionado
    totalDelta,       // Arreglo de metas finales de todos los turnos
    shiftsStatus,     // Arreglo con estatus (Activo/Inactivo)
    realTurno,        // Piezas reales del turno
    realDia,          // Piezas reales del día
    selectedDate,
    selectedShift
) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    return useMemo(() => {
        if (!selectedShift || selectedShift === '0') {
            return {
                turno: { metaAcumulada: 0, eficiencia: 0, status: 'mal' },
                dia: { metaTotalAcumulada: 0, eficiencia: 0, status: 'mal' }
            };
        }

        const today = getFormattedDate();
        const actualShift = getCurrentShift();
        const currentHour = currentTime.getHours();
        const cuartosActuales = Math.floor(currentTime.getMinutes() / 15); // 0, 1, 2, o 3

        // =================================================================
        // 1. CÁLCULO DE META DEL TURNO (Exacta por Hora)
        // =================================================================
        let metaTurnoProgresiva = 0;

        if (tableItems && tableItems.length > 0) {
            for (const fila of tableItems) {
                const metaHora = Number(fila.meta) || 0;
                const horaSlot = parseInt((fila.hora).split(':')[0], 10);
                if (isNaN(horaSlot)) continue;

                if (selectedDate < today) {
                    metaTurnoProgresiva += metaHora; // Días pasados suman todo
                } else if (selectedDate === today) {
                    // Si hoy estamos viendo un turno distinto al actual
                    if (selectedShift !== actualShift) {
                        const SHIFT_ORDER = ['1', '2', '3'];
                        if (SHIFT_ORDER.indexOf(selectedShift) < SHIFT_ORDER.indexOf(actualShift)) {
                            metaTurnoProgresiva += metaHora; // Turno de hoy que ya pasó
                        }
                    } else {
                        //TURNO EN CURSO: Lógica de tiempo
                        const isTurno3 = selectedShift === '3';
                        const mappedSlot = isTurno3 && horaSlot === 23 ? -1 : horaSlot;
                        const mappedCurrent = isTurno3 && currentHour === 23 ? -1 : currentHour;

                        if (mappedSlot < mappedCurrent){
                            metaTurnoProgresiva += metaHora; //Hora pasada completa
                        } else if (mappedSlot === mappedCurrent){
                            metaTurnoProgresiva += metaHora * (cuartosActuales / 4); //Fracción de Hora actual
                            break;
                        }
                    }
                }
            }
        }

        // =================================================================
        // 2. CÁLCULO DE META DEL DÍA PARA EL DELTA
        // =================================================================
        let metaDiaProgresiva = 0;

        if (totalDelta && totalDelta.length > 0) {
            const SHIFT_ORDER = ['1', '2', '3'];
            const currentIdx = selectedDate === today ? SHIFT_ORDER.indexOf(actualShift) : (selectedDate < today ? 3 : -1);

            metaDiaProgresiva = SHIFT_ORDER.reduce((acc, shiftId, index) => {
                // 2.1 Ignorar turnos inactivos
                const statusObj = shiftsStatus?.find(s => String(s.Turno || s.id) === shiftId);
                const isActivo = statusObj ? Boolean(statusObj.Activo || statusObj.ACTIVO) : true;
                if (!isActivo) return acc;

                // 2.2 Obtener Meta Total de este turno específico
                const turnoData = totalDelta.find(t => String(t.turno) === shiftId);
                const metaTotalTurnoBD = turnoData ? (Number(turnoData.MetaEfectivaTurno) || 0) : 0;

                // 2.3 Lógica de Tiempo
                if(selectedDate < today || index < currentIdx){
                    return acc + metaTotalTurnoBD;
                } else if (selectedDate === today && index === currentIdx){
                    let totalCuartos = shiftId === '1' ? 32 : (shiftId === '2' ? 36 : 28);
                    let hrsPasadas = shiftId === '1' ? (currentHour - 6) 
                    : (shiftId === '2' ? (currentHour - 14) 
                        : (current === 23 ? 0 : currentHour + 1));
                    let cuartosTranscurridos = Math.max(0, Math.min((hrsPasadas * 4) + cuartosActuales, totalCuartos));
                    return acc + (metaTotalTurnoBD * (cuartosTranscurridos / totalCuartos));
                }
                return acc;
            }, 0);
        }

        // Redondeos y Eficiencia
        metaTurnoProgresiva = Math.round(metaTurnoProgresiva);
        metaDiaProgresiva = Math.round(metaDiaProgresiva);

        const efTurno = metaTurnoProgresiva > 0 ? Math.round((realTurno / metaTurnoProgresiva) * 100) : 0;
        const efDia = metaDiaProgresiva > 0 ? Math.round((realDia / metaDiaProgresiva) * 100) : 0;

        return {
            turno: {
                metaAcumulada: metaTurnoProgresiva,
                eficiencia: efTurno,
                status: efTurno >= 100 ? "bueno" : efTurno >= 90 ? "medio" : "mal"
            },
            dia: {
                metaTotalAcumulada: metaDiaProgresiva,
                eficiencia: efDia,
                status: efDia >= 100 ? "bueno" : efDia >= 90 ? "medio" : "mal"
            }
        };

    }, [selectedShift, selectedDate, tableItems, totalDelta, shiftsStatus, realTurno, realDia, currentTime]);
};