import { getFormattedDate, getCurrentShift, generateHourSlots, getMetaPorHoraIndividual } from '@utils/dateUtils';

const SHIFT_ORDER = ['3', '1', '2'];

export const calculateShiftMeta = ({ 
    shiftId,
    selectedDate, 
    currentClientMinute, 
    currentClientHour, 
    metaPorHora,
    localConfig
}) => {
    const activeShifts = localConfig?.activeShifts || ['1', '2', '3'];
    if (!activeShifts.includes(shiftId)) return 0;
    
    // 1. Si la fecha es pasada, devolvemos el turno completo (100% de la meta)
    if (selectedDate < getFormattedDate()) return getFullShiftMeta(shiftId, metaPorHora);
    
    // 2. Si la fecha es futura, meta es 0
    if (selectedDate > getFormattedDate()) return 0;

    const currentShift = getCurrentShift();
    const SHIFT_ORDER = ['3', '1', '2'];
    const currentIndex = SHIFT_ORDER.indexOf(currentShift);
    const targetIndex = SHIFT_ORDER.indexOf(shiftId);

    // 3. Si el turno ya pasó hoy (ej. estamos en T2 y vemos T1), meta completa
    if (targetIndex < currentIndex) return getFullShiftMeta(shiftId, metaPorHora);
    
    // 4. Si el turno es futuro hoy, meta 0
    if (targetIndex > currentIndex) return 0;

    // 5. SI ES EL TURNO ACTUAL: Calculamos el progreso real
    const slots = generateHourSlots(shiftId);
    let metaAcum = 0;

    for (const slot of slots) {
        const startHour = parseInt(slot.split(':')[0], 10);
        let hourlyMeta;
        // if (localConfig.mealHour === slot) {
        //     hourlyMeta = 0; // Hora de comida = 0 piezas
        // } else 
        if (localConfig?.customMetas?.[slot] !== undefined) {
            hourlyMeta = Number(localConfig.customMetas[slot]); // Meta editada
        } else {
            hourlyMeta = getMetaPorHoraIndividual(startHour, shiftId, metaPorHora); // Meta base
        }

        if (startHour < currentClientHour) {
            // Hora terminada
            metaAcum += hourlyMeta;
        } else if (startHour === currentClientHour) {
            // Hora en curso: aplicamos proporcionalidad (cada 15 min)
            const quarter = hourlyMeta / 4;
            if (currentClientMinute >= 45) metaAcum += hourlyMeta;
            else if (currentClientMinute >= 30) metaAcum += (quarter * 2);
            else if (currentClientMinute >= 15) metaAcum += quarter;
            break; 
        } else {
            // Horas futuras del turno actual
            break;
        }
    }
    return metaAcum;
};

// Función auxiliar interna
export const getFullShiftMeta = (config, localConfig) => {
    const { selectedShift, metaPorHora } = config;
    const activeShifts = localConfig?.activeShifts || ['1', '2', '3'];
    if (!activeShifts.includes(selectedShift)) return 0;
    
    return generateHourSlots(selectedShift).reduce((acc, slot) => {
        const start = parseInt(slot.split(':')[0], 10);
        let hourlyMeta;
        // if (localConfig?.mealHour === slot) hourlyMeta = 0;
        // else 
        if (localConfig?.customMetas?.[slot] !== undefined) hourlyMeta = Number(localConfig.customMetas[slot]);
        else hourlyMeta = getMetaPorHoraIndividual(start, selectedShift, metaPorHora);
        
        return acc + hourlyMeta;
    }, 0);
};

export const calcularMetaDiaAcumulada = (config, localConfig) => {
    const { selectedDate, metaPorHora, currentClientHour, currentClientMinute } = config;
    const today = getFormattedDate();
    
    if (selectedDate > today) return 0;

    const currentShift = getCurrentShift();
    const currentShiftIdx = SHIFT_ORDER.indexOf(currentShift);
    let totalAcc = 0;

    for (let i = 0; i < SHIFT_ORDER.length; i++) {
        const shiftId = SHIFT_ORDER[i];
        
        if (selectedDate === today) {
            if (i < currentShiftIdx) {
                // Turno ya pasado hoy: sumamos su meta completa
                totalAcc += getFullShiftMeta({ selectedShift: shiftId, metaPorHora }, localConfig);
            } else if (i === currentShiftIdx) {
                // Turno actual: sumamos solo el progreso hasta el minuto actual
                totalAcc += calculateShiftMeta({ 
                    shiftId, selectedDate, currentClientMinute, currentClientHour, metaPorHora, localConfig 
                });
                break; // No sumamos turnos futuros
            }
        } else {
            // Fecha pasada: sumamos el total de todos los turnos activos de ese día
            totalAcc += getFullShiftMeta({ selectedShift: shiftId, metaPorHora }, localConfig);
        }
    }
    return totalAcc;
};
