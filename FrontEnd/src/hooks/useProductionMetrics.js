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
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); 
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
            for (let i = 0; i < tableItems.length; i++) {
                const fila = tableItems[i];
                const metaHora = Number(fila.MetaEfectiva || fila.META || fila.Meta) || 0; 
                const horaSlot = parseInt((fila.TIME_SLOT || fila.Hora_Slot || fila.Hora || fila.HORA || "").split(':')[0], 10);
                
                if (isNaN(horaSlot)) continue;

                if (selectedDate < today) {
                    metaTurnoProgresiva += metaHora; // Días pasados suman todo
                } else if (selectedDate > today) {
                    metaTurnoProgresiva += 0; // Futuro
                } else {
                    // Si hoy estamos viendo un turno distinto al actual
                    if (selectedShift !== actualShift) {
                        const SHIFT_ORDER = ['3', '1', '2'];
                        if (SHIFT_ORDER.indexOf(selectedShift) < SHIFT_ORDER.indexOf(actualShift)) {
                            metaTurnoProgresiva += metaHora; // Turno de hoy que ya pasó
                        }
                    } else {
                        // Es el turno en curso
                        let isPastHour = false;
                        let isCurrentHour = false;

                        // Truco para el Turno 3 que cruza la medianoche (23 a 06)
                        if (selectedShift === '3') {
                            const mappedSlot = horaSlot === 23 ? -1 : horaSlot;
                            const mappedCurrent = currentHour === 23 ? -1 : currentHour;
                            isPastHour = mappedSlot < mappedCurrent;
                            isCurrentHour = mappedSlot === mappedCurrent;
                        } else {
                            isPastHour = horaSlot < currentHour;
                            isCurrentHour = horaSlot === currentHour;
                        }

                        if (isPastHour) {
                            metaTurnoProgresiva += metaHora;
                        } else if (isCurrentHour) {
                            metaTurnoProgresiva += metaHora * (cuartosActuales / 4);
                            break; // Detenemos aquí, las demás horas son futuro
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
            const SHIFT_ORDER = ['3', '1', '2'];
            const currentIdx = selectedDate === today ? SHIFT_ORDER.indexOf(actualShift) : (selectedDate < today ? 3 : -1);

            metaDiaProgresiva = SHIFT_ORDER.reduce((acc, shiftId, index) => {
                // 2.1 Ignorar turnos inactivos
                const statusObj = shiftsStatus?.find(s => String(s.Turno || s.id) === shiftId);
                const isActivo = statusObj ? Boolean(statusObj.Activo || statusObj.ACTIVO) : true;
                if (!isActivo) return acc;

                // 2.2 Obtener Meta Total de este turno específico
                const turnoData = totalDelta.find(t => String(t.TURNO || t.Turno || t.turno) === shiftId);
                const metaTotalTurnoBD = turnoData ? (Number(turnoData.MetaEfectivaTurno) || 0) : 0;

                // 2.3 Lógica de Tiempo
                if (selectedDate < today) {
                    return acc + metaTotalTurnoBD; // Día pasado
                } else if (selectedDate > today) {
                    return acc; // Día futuro
                } else {
                    if (index < currentIdx) {
                        return acc + metaTotalTurnoBD; // Turno de hoy que ya pasó
                    } else if (index === currentIdx) {
                        // TURNO EN CURSO
                        // Si estamos visualizando el turno actual en la UI, usamos la métrica exacta y perfecta de arriba
                        if (selectedShift === actualShift) {
                            return acc + metaTurnoProgresiva;
                        } else {
                            // Si estamos visualizando un turno pasado pero queremos ver el Delta global avanzando,
                            // sacamos una proporción exacta en base a cuartos de hora totales del turno en curso
                            let elapsedQuarters = 0;
                            let totalQuarters = 1;
                            if (shiftId === '1') {
                                totalQuarters = 8 * 4; // 8 horas x 4 cuartos = 32
                                elapsedQuarters = (currentHour - 6) * 4 + cuartosActuales;
                            } else if (shiftId === '2') {
                                totalQuarters = 9 * 4; 
                                elapsedQuarters = (currentHour - 14) * 4 + cuartosActuales;
                            } else if (shiftId === '3') {
                                totalQuarters = 7 * 4; 
                                const hrs = currentHour === 23 ? 0 : (currentHour + 1);
                                elapsedQuarters = hrs * 4 + cuartosActuales;
                            }
                            elapsedQuarters = Math.max(0, Math.min(elapsedQuarters, totalQuarters));
                            return acc + (metaTotalTurnoBD * (elapsedQuarters / totalQuarters));
                        }
                    }
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
                status: efTurno >= 100 ? "bueno" : "mal"
            },
            dia: {
                metaTotalAcumulada: metaDiaProgresiva,
                eficiencia: efDia,
                status: efDia >= 100 ? "bueno" : "mal"
            }
        };

    }, [selectedShift, selectedDate, tableItems, totalDelta, shiftsStatus, realTurno, realDia, currentTime]);
};