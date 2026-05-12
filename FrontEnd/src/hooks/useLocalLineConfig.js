import {useEffect, useState} from 'react';

export const useLocalLineConfig = (lineId) =>{
    const storageKey = `config_line_${lineId}`;

    const [config, setConfig] = useState(() =>{
        const saved = localStorage.getItem(storageKey);
        const parsed = saved ? JSON.parse(saved) : {};

        return {
            mealHour: null,
            customMetas: {},
            activeShifts: ['1', '2', '3'],
            ...parsed
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
    
    const setCustomMeta = (hour, value) => {
        setConfig(prev => ({
            ...prev,
            customMetas: {...prev.customMetas, [hour] : value}
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
    
    return {config, setMealHour, setCustomMeta, toggleShift};
};