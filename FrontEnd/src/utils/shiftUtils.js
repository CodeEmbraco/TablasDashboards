import { 
  getFormattedDate, 
  getCurrentShift, 
  generateHourSlots, 
  getMetaPorHoraIndividual 
} from '@utils/dateUtils';

const getFullShiftMeta = (shiftId, metaPorHora) => {
    const slots = generateHourSlots(shiftId);
    return slots.reduce((acc, slot) => {
            const start = parseInt(slot.split(':')[0], 10);
            return acc + getMetaPorHoraIndividual(start, shiftId, metaPorHora);
    }, 0);
};

// Adherencia escalonada o progresiva (cada 15, 30, 45, 59 min)
export const calculateShiftMeta = (shiftId, selectedDate, currentClientMinute, currentClientHour, metaPorHora) => {
    const isToday = selectedDate === getFormattedDate();
    
    //Fechas Pasadas/Futuras
    if (selectedDate < getFormattedDate()) return getFullShiftMeta(shiftId, metaPorHora);
    if (selectedDate > getFormattedDate()) return 0;

    //Verificar si el turno ya pasó hoy o es futuro
    const currentShift = getCurrentShift();
    const shiftOrder = ['3', '1', '2'];
    const currentIndex = shiftOrder.indexOf(currentShift);
    const targetIndex = shiftOrder.indexOf(shiftId);

    if (targetIndex < currentIndex) return getFullShiftMeta(shiftId, metaPorHora);
    if (targetIndex > currentIndex) return 0;

    // Es el turno ACTUAL -> Adherencia Minuto a Minuto
    let metaAcum = 0;
    const slots = generateHourSlots(shiftId);
    
    for (let slot of slots) {
        const startHour = parseInt(slot.split(':')[0], 10);
        const hourlyMeta = getMetaPorHoraIndividual(startHour, shiftId, metaPorHora);

        // Si la hora ya pasó (es anterior a la actual), suma completa
        
        if (startHour === currentClientHour) {
            // HORA ACTUAL
            const quarterPart = Math.ceil(hourlyMeta / 6); // Redondear hacia arriba cuartos para no dejar decimales
            
            if (currentClientMinute >= 59) {
                metaAcum += hourlyMeta; // Minuto 59+: Meta completa exacta
            } else if (currentClientMinute >= 45) {
                // Min 45-58: 3 cuartos 
                metaAcum += Math.min(hourlyMeta, quarterPart * 3);
            } else if (currentClientMinute >= 30) {
                // Min 30-44: 2 cuartos
                metaAcum += Math.min(hourlyMeta, quarterPart * 2);
            } else if (currentClientMinute >= 15) {
                // Min 15-29: 1 cuarto
                metaAcum += Math.min(hourlyMeta, quarterPart);
            }
            // Min 0-14: Suma 0
            // Detenemos el loop aquí porque las horas siguientes son futuro
            break; 
        } else {
            // Hora ya completada en el turno -> Suma total
            metaAcum += hourlyMeta;
        }
    }
    return metaAcum;
};

export const calcularMetaDiaAcumulada = (selectedShift, selectedDate, currentClientMinute, currentClientHour, metaPorHora) => {
        let metaAcum = 0;
        // console.log("DEBUG "+ selectedShift);
        if (selectedShift === '3') {
            metaAcum += calculateShiftMeta('3', selectedDate, currentClientMinute, currentClientHour, metaPorHora);
        } else if (selectedShift === '1') {
            metaAcum += calculateShiftMeta('3', selectedDate, currentClientMinute, currentClientHour, metaPorHora); 
            metaAcum += calculateShiftMeta('1', selectedDate, currentClientMinute, currentClientHour, metaPorHora); 
        } else if (selectedShift === '2') {
            metaAcum += calculateShiftMeta('3', selectedDate, currentClientMinute, currentClientHour, metaPorHora);
            metaAcum += calculateShiftMeta('1', selectedDate, currentClientMinute, currentClientHour, metaPorHora);
            metaAcum += calculateShiftMeta('2', selectedDate, currentClientMinute, currentClientHour, metaPorHora);
        }
        return metaAcum;
    };