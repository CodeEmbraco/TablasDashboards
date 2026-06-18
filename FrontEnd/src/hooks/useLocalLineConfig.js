import { useEffect, useState } from 'react';

export const useLocalLineConfig = (lineId) => {
    const storageKey = `config_line_${lineId}`;

    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        const parsed = saved ? JSON.parse(saved) : {};

        return {
            mealHour: null,
            ...parsed,
        };
    });
    
    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(config));
    }, [config, storageKey]);
    
    const setMealHour = (hour) => {
        setConfig(prev => ({
            ...prev,
            mealHour: prev.mealHour === hour ? null : hour 
        }));
    };
    
    return { config, setMealHour };
};