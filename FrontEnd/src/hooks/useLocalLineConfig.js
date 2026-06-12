import {useEffect, useState} from 'react';

export const useLocalLineConfig = (lineId, initialDefaultMeta) =>{
    const storageKey = `config_line_${lineId}`;

    const [config, setConfig] = useState(() =>{
        const saved = localStorage.getItem(storageKey);
        const parsed = saved ? JSON.parse(saved) : {};

        return {
            mealHour: null,
            activeShifts: ['1', '2', '3'],
            ...parsed,
            // Forzamos el uso de la meta inicial definida en el código (linesConfig.jsx)
            // para que los cambios del desarrollador tengan efecto inmediato y no se
            // queden "atrapados" en el localStorage del navegador.
            defaultMeta: initialDefaultMeta
        };
    });
    
    useEffect(() =>{
        localStorage.setItem(storageKey, JSON.stringify(config));
    }, [config, storageKey]);
    
    const setMealHour = (hour) =>{
        setConfig(prev => ({
            ...prev,
            mealHour: prev.mealHour === hour ? null : hour 
        }));
    };
    
    const toggleShift = (shiftId) => {
        setConfig(prev => {
            const currentActive = prev.activeShifts || ['1', '2', '3'];
            
            return {
                ...prev,
                activeShifts: currentActive.includes(shiftId)
                    ? currentActive.filter(id => id !== shiftId)
                    : [...currentActive, shiftId]
            };
        });
    };
    
    return {config, setMealHour, toggleShift};
};