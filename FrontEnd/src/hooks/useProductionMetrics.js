// src/hooks/useProductionMetrics.js
import { useMemo } from 'react';
import { useProduction } from '@context/ProductionContext';
import { calcularMetaDiaAcumulada } from '@utils/shiftUtils';

export const useProductionMetrics = (currentRealDia) => {
    const { selectedShift, selectedDate, metaPorHora } = useProduction();

    return useMemo(() => {
        const now = new Date();

        const config = {
            selectedShift,
            selectedDate,
            metaPorHora,
            currentClientHour: now.getHours(),
            currentClientMinute: now.getMinutes()
        };

        const metaAcumulada = parseInt(calcularMetaDiaAcumulada(config));

        const percent = metaAcumulada > 0 ? Math.round((currentRealDia / metaAcumulada) * 100) : 0;

        return {
            metaAcumulada,
            eficiencia: percent,
            status: percent >= 95 ? "bueno" : "mal"
        };
    }, [selectedShift, selectedDate, metaPorHora, currentRealDia]);
};