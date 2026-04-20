import { getFormattedDate, getCurrentShift, generateHourSlots, getMetaPorHoraIndividual } from '@utils/dateUtils';

const SHIFT_ORDER = ['3', '1', '2'];

export const calculateShiftMeta = ({ shiftId, selectedDate, currentClientMinute, currentClientHour, metaPorHora }) => {
    const isToday = selectedDate === getFormattedDate();
    
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
        const hourlyMeta = getMetaPorHoraIndividual(startHour, shiftId, metaPorHora);

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

export const calcularMetaDiaAcumulada = (config) => {
    const { selectedShift } = config;
    console.log("config => ", config)
    if (!['1', '2', '3'].includes(selectedShift)) return 0;
    return calculateShiftMeta({ ...config, shiftId: selectedShift });
};

// Función auxiliar interna
const getFullShiftMeta = (shiftId, metaPorHora) => {
    return generateHourSlots(shiftId).reduce((acc, slot) => {
        const start = parseInt(slot.split(':')[0], 10);
        return acc + getMetaPorHoraIndividual(start, shiftId, metaPorHora);
    }, 0);
};