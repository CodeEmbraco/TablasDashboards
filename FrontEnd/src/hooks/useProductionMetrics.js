// src/hooks/useProductionMetrics.js
import { useMemo } from 'react';
import { useProduction } from '@context/ProductionContext';
import { calcularMetaDiaAcumulada, calculateShiftMeta } from '@utils/shiftUtils';

export const useProductionMetrics = (currentRealDia, localConfig) => {
    const { selectedShift, selectedDate, metaPorHora } = useProduction();

    return useMemo(() => {
        const now = new Date();

        if (!selectedShift || selectedShift === '0') {
            return { metaAcumulada: 0, metaTotalAcumulada: 0, eficiencia: 0, status: 'mal' };
        }

        const config = {
            selectedShift,
            selectedDate,
            metaPorHora,
            currentClientHour: now.getHours(),
            currentClientMinute: now.getMinutes()
        };

        const realVal = (Number(currentRealDia) || 0);

        // Meta del Turno Actual (Para Gauges)
        const metaTurnoActual = calculateShiftMeta({ ...config, shiftId: selectedShift, localConfig });
        
        // Meta Acumulada del Día (Para Delta - accGoal)
        const metaDiaHastaAhora = calcularMetaDiaAcumulada(config, localConfig);

        const percent = metaDiaHastaAhora > 0 ? Math.round((realVal / metaDiaHastaAhora) * 100) : 0;
        const status = percent >= 100 ? "bueno" : "mal";
        
        return {
            metaAcumulada: metaTurnoActual,
            metaTotalAcumulada: metaDiaHastaAhora,
            eficiencia: percent,
            status: status
        };
    }, [selectedShift, selectedDate, metaPorHora, currentRealDia, localConfig]);
};