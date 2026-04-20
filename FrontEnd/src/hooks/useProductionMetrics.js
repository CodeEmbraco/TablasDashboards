import { useMemo } from 'react';
import { useProduction } from '@context/ProductionContext';
import { calcularMetaDiaAcumulada } from '@utils/shiftUtils';

export const useProductionMetrics = (currentRealDia) => { 
    const {selectedShift , selectedDate, metaPorHora} = useProduction();

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();


    const metrics = useMemo(() => {
        const metaAcumulada = calcularMetaDiaAcumulada(
            selectedShift,
            selectedDate,
            currentMinute,
            currentHour,
            metaPorHora
        );
        const percent = metaAcumulada > 0 
        ? Math.round((currentRealDia / metaAcumulada)*100)
        : 0;
        
        return{
            metaAcumulada,
            eficiencia,
            status: percent >= 95 ? "bueno" : "mal"
        };
    }, [selectedShift, selectedDate, metaPorHora, currentRealDia, currentHour, currentMinute]);
    
    return metrics;
}