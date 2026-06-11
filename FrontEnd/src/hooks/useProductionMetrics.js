// src/hooks/useProductionMetrics.js
import { useMemo } from 'react';
import { useProduction } from '@context/ProductionContext';
import { calculateShiftMeta, getFullShiftMeta, getShiftStartHour, calcularMetaProgresivaDelta } from '@utils/shiftUtils';
import { getCurrentShift, getFormattedDate } from '@utils/dateUtils';

export const useProductionMetrics = (currentRealDia, localConfig, dbMetaTurno = null, allShiftsData = []) => {
    const { selectedShift, selectedDate, metaPorHora } = useProduction();

    return useMemo(() => {
        const now = new Date();

        if (!selectedShift || selectedShift === '0') {
            return { metaAcumulada: 0, metaTotalAcumulada: 0, eficiencia: 0, status: 'mal' };
        }

        const config = {
            selectedShift,
            selectedDate,
            metaPorHora: metaPorHora,
            currentClientHour: now.getHours(),
            currentClientMinute: now.getMinutes()
        };

        const realVal = (Number(currentRealDia) || 0);

        // 1. Meta del Turno Actual (Proporcional para el Gauge)
        const calcPartial = calculateShiftMeta(config);
        const calcTotal = getFullShiftMeta(config);
        const shiftRatio = calcTotal > 0 ? calcPartial / calcTotal : 0;

        // Si tenemos la meta total de la DB para el turno seleccionado, aplicamos la proporción de avance
        const metaTurnoProporcional = (dbMetaTurno && dbMetaTurno > 0)
            ? dbMetaTurno * shiftRatio
            : calcPartial;

        // 2. Meta Acumulada del Día (Para Delta)
        // let metaDiaHastaAhora = 0;
        // const currentShiftNow = getCurrentShift();
        // const SHIFT_ORDER = ['3', '1', '2'];
        // const currentIdx = SHIFT_ORDER.indexOf(currentShiftNow);

        // for (let i = 0; i < SHIFT_ORDER.length; i++) {
        //     const sId = SHIFT_ORDER[i];
        //     const sData = allShiftsData?.find(s => String(s.TURNO) === String(sId));
        //     const sDbMeta = sData?.MetaEfectivaTurno || 0;

        //     if (selectedDate === getFormattedDate()) {
        //         if (i < currentIdx) {
        //             // Turno pasado: Meta completa (DB o calculada)
        //             metaDiaHastaAhora += sDbMeta > 0 ? sDbMeta : getFullShiftMeta({ ...config, selectedShift: sId });
        //         } else if (i === currentIdx) {
        //             // Turno actual: Meta proporcional por cuartos de hora
        //             const partial = calculateShiftMeta({ ...config, shiftId: sId });
        //             const total = getFullShiftMeta({ ...config, selectedShift: sId });
        //             const ratio = total > 0 ? partial / total : 0;

        //             metaDiaHastaAhora += sDbMeta > 0 ? (sDbMeta * ratio) : partial;
        //             break; 
        //         }
        //     } else if (selectedDate < getFormattedDate()) {
        //         // Fecha pasada: Meta total de todos los turnos
        //         metaDiaHastaAhora += sDbMeta > 0 ? sDbMeta : getFullShiftMeta({ ...config, selectedShift: sId });
        //     }
        // }

    const metaProgresiva = useMemo(() => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Obtenemos la hora de inicio dinámica según el turno
        const inicioTurno = getShiftStartHour(selectedShift);
        
        return calcularMetaProgresivaDelta(
            metaPorHora, 
            currentHour, 
            currentMinute, 
            inicioTurno
        );
    }, [metaPorHora, selectedShift]);

        // 3. Eficiencia
        // Si se pasa dbMetaTurno, evaluamos eficiencia del turno. Si no, eficiencia del día.
        const targetGoal = (dbMetaTurno !== null) ? metaTurnoProporcional : metaDiaHastaAhora;

        const percent = targetGoal > 0 ? Math.round((realVal / targetGoal) * 100) : 0;
        const status = percent >= 100 ? "bueno" : "mal";
        
        return {
            metaAcumulada: metaTurnoProporcional,
            metaTotalAcumulada: metaProgresiva,
            eficiencia: percent,
            status: status
        };
    }, [selectedShift, selectedDate, metaPorHora, currentRealDia, dbMetaTurno, allShiftsData]);
};