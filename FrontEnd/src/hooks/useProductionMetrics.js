import { useMemo, useState, useEffect } from 'react';
import { useProduction } from '@context/ProductionContext';
import { calculateShiftMeta, getFullShiftMeta, calcularMetaDiaAcumulada } from '@utils/shiftUtils';

export const useProductionMetrics = (
    currentRealDia, 
    localConfig, 
    dbMetaTurno = null, 
    allShiftsData = [], 
    shiftFilter = null
) => {
    const { selectedShift, selectedDate } = useProduction();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Re-calcular cada minuto para actualizar cuartos de hora
        return () => clearInterval(interval);
    }, []);

    return useMemo(() => {
        if (!selectedShift || selectedShift === '0') {
            return { metaAcumulada: 0, metaTotalAcumulada: 0, eficiencia: 0, status: 'mal' };
        }

        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();

        const metaPorHoraLinea = localConfig?.defaultMeta || 350;

        const config = {
            shiftId: selectedShift, 
            selectedShift,               
            selectedDate,
            metaPorHora: metaPorHoraLinea,
            currentClientHour: currentHour,
            currentClientMinute: currentMinute
        };

        const realVal = (Number(currentRealDia) || 0);

        // --- A. Meta Proporcional del Turno Actual ---
        const calcPartial = calculateShiftMeta(config);
        const calcTotal = getFullShiftMeta(config);
        const shiftRatio = calcTotal > 0 ? calcPartial / calcTotal : 0;

        const metaTurnoProporcional = (dbMetaTurno && dbMetaTurno > 0)
            ? dbMetaTurno * shiftRatio
            : calcPartial;
            
        // --- B. Meta Acumulada Progresiva del Día (Para el Delta) ---
        const metaProgresivaDelDia = calcularMetaDiaAcumulada(config, shiftFilter);

        // --- C. Cálculo de Eficiencia ---
        const targetGoal = (dbMetaTurno !== null && dbMetaTurno > 0) ? metaTurnoProporcional : metaProgresivaDelDia;
        const percent = targetGoal > 0 ? Math.round((realVal / targetGoal) * 100) : 0;
        const status = percent >= 100 ? "bueno" : "mal";

        return {
            metaAcumulada: metaTurnoProporcional,
            metaTotalAcumulada: metaProgresivaDelDia, 
            eficiencia: percent,
            status: status
        };

    }, [selectedShift, selectedDate, localConfig, currentRealDia, dbMetaTurno, allShiftsData, currentTime, shiftFilter]);
};