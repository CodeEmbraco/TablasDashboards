export const getFormattedDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const SHIFT_HOURS = {
    '1': [6, 14, 8],
    '2': [14, 23, 9],
    '3': [23, 6, 7],
};

export const getCurrentShift = () => {
    const now = new Date();
    const currentHour = now.getHours(); 
    if (currentHour >= 6 && currentHour < 14) return '1';
    if (currentHour >= 14 && currentHour < 23) return '2';
    if (currentHour >= 23 || currentHour < 6) return '3';
    return '0'; 
};

export const generateHourSlots = (shiftId) => {
    const shift = SHIFT_HOURS[shiftId];
    if (!shift) return [];
    
    const [start, , totalHours] = shift;
    const slots = [];
    let currentHour = start;
    for (let i = 0; i < totalHours; i++) {
        const nextHour = (currentHour + 1) % 24;
        const startStr = String(currentHour).padStart(2, '0') + ':00';
        const endStr = String(nextHour).padStart(2, '0') + ':00';
        slots.push(`${startStr}-${endStr}`);
        currentHour = nextHour;
    }
    return slots;
};

export const getMetaPorHoraIndividual = (startHour, shiftId, metaBase) => {
    if (shiftId === '1' && startHour === 9) return metaBase / 2;
    if (shiftId === '2' && startHour === 18) return metaBase / 2;
    if (shiftId === '3' && startHour === 0) return metaBase / 2;
    return metaBase;
};