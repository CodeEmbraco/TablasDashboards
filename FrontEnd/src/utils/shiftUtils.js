import { getFormattedDate, getCurrentShift, generateHourSlots, getMetaPorHoraIndividual } from '@utils/dateUtils';

const SHIFT_ORDER = ['3', '1', '2'];

const SHIFT_START_TIMES = {
    '1': 6,  // 06:00
    '2': 14, // 14:00
    '3': 23  // 23:00
};

export const getShiftStartHour = (shiftId) => {
    return SHIFT_START_TIMES[shiftId] || 6; // Default a 6 si no existe
};

export const calculateShiftMeta = ({ 
    shiftId,
    selectedDate, 
    currentClientMinute, 
    currentClientHour, 
    metaPorHora
}) => {
    
    // 1. Si la fecha es pasada, devolvemos el turno completo (100% de la meta)
    if (selectedDate < getFormattedDate()) return getFullShiftMeta({selectedShift: shiftId, metaPorHora});
    
    // 2. Si la fecha es futura, meta es 0
    if (selectedDate > getFormattedDate()) return 0;

    const currentShift = getCurrentShift();
    const SHIFT_ORDER = ['3', '1', '2'];
    const currentIndex = SHIFT_ORDER.indexOf(currentShift);
    const targetIndex = SHIFT_ORDER.indexOf(shiftId);

    // 3. Si el turno ya pasó hoy (ej. estamos en T2 y vemos T1), meta completa
    if (targetIndex < currentIndex) return getFullShiftMeta({selectedShift: shiftId, metaPorHora});
    
    // 4. Si el turno es futuro hoy, meta 0
    if (targetIndex > currentIndex) return 0;

    // 5. SI ES EL TURNO ACTUAL: Calculamos el progreso real
    const slots = generateHourSlots(shiftId);
    let metaAcum = 0;

    for (const slot of slots) {
        const startHour = parseInt(slot.split(':')[0], 10);
        let hourlyMeta;
        hourlyMeta = getMetaPorHoraIndividual(startHour, shiftId, metaPorHora); // Meta base

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
export const getFullShiftMeta = (config) => {
    const { selectedShift, metaPorHora } = config;
    
    return generateHourSlots(selectedShift).reduce((acc, slot) => {
        const start = parseInt(slot.split(':')[0], 10);
        let hourlyMeta;
        hourlyMeta = getMetaPorHoraIndividual(start, selectedShift, metaPorHora);
        
        return acc + hourlyMeta;
    }, 0);
};

export const calcularMetaDiaAcumulada = (config) => {
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
                totalAcc += getFullShiftMeta({ selectedShift: shiftId, metaPorHora });
            } else if (i === currentShiftIdx) {
                // Turno actual: sumamos solo el progreso hasta el minuto actual
                totalAcc += calculateShiftMeta({ 
                    shiftId, selectedDate, currentClientMinute, currentClientHour, metaPorHora
                });
                break; // No sumamos turnos futuros
            }
        } else {
            // Fecha pasada: sumamos el total de todos los turnos activos de ese día
            totalAcc += getFullShiftMeta({ selectedShift: shiftId, metaPorHora });
        }
    }
    return totalAcc;
};

/**
 * Calcula la meta progresiva basada en cuartos de hora (15 mins).
 * @param {Array} horasData - Arreglo con la data hora por hora (debe traer 'MetaEfectiva').
 * @param {Number} metaTurnoDB - La meta total del turno según la base de datos.
 * @returns {Number} La meta calculada hasta el cuarto de hora actual.
 */
export const calcularMetaProgresiva = (horasData, metaTurnoDB) => {
    if (!horasData || horasData.length === 0) return 0;

    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();

    let metaAcumulada = 0;
    let horaActualEncontrada = false;

    for (let i = 0; i < horasData.length; i++) {
        const fila = horasData[i];
        const metaDeEstaHora = Number(fila.MetaEfectiva) || 0;
        const horaInt = fila.Hora;
        
        //DEBUG: Que estamos trayendo en cada fila de horasData?
        // console.log("Fila de horasData: ", fila);

        if (horaInt < horaActual) {
            // Si la hora ya pasó por completo, sumamos el 100% de la meta de esa hora
            metaAcumulada += metaDeEstaHora;
        } 
        else if (horaInt === horaActual) {
            // Estamos en la hora actual
            horaActualEncontrada = true;
            
            // Calculamos cuántos cuartos de hora han pasado
            // Ej: 14 mins = 0, 16 mins = 1, 35 mins = 2, 48 mins = 3
            const cuartosPasados = Math.floor(minutosActuales / 15);
            
            // Le sumamos la fracción correspondiente (25%, 50%, 75% o 0%)
            metaAcumulada += metaDeEstaHora * (cuartosPasados / 4);
            break; // Ya no necesitamos revisar las siguientes horas
        }
    }

    // Si por alguna razón la hora actual es mayor a todos los slots (fin de turno),
    // el bucle sumó todo. 

    // Aseguramos de redondear (no hay medias piezas)
    metaAcumulada = Math.round(metaAcumulada);

    // REGLA DE ORO: Nunca sobrepasar la meta total del turno
    return (metaTurnoDB > 0 && metaAcumulada > metaTurnoDB) ? metaTurnoDB : metaAcumulada;
};

// Para el delta
export const calcularMetaProgresivaDelta = (metaPorHora, horaActual, minutoActual, inicioTurnoHora) => {
    // 1. Identificar en qué slot de hora estamos
    const horaRelativa = horaActual - inicioTurnoHora;
    
    // 2. Sumar metas completas de horas anteriores
    let metaAcumulada = 0;
    for (let i = 0; i < horaRelativa; i++) {
        metaAcumulada += (metaPorHora[i] || 0);
    }
    
    // 3. Calcular fracción de la hora actual
    const metaHoraActual = metaPorHora[horaRelativa] || 0;
    const factorTiempo = Math.floor(minutoActual / 15) * 15; // 0, 15, 30, 45
    const metaFraccion = metaHoraActual * (factorTiempo / 60);
    
    return Math.floor(metaAcumulada + metaFraccion);
};
