import React, { useState, useEffect } from 'react';

const ClockTime = ({ className, style }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        // Actualizamos cada segundo para que el salto de minuto sea exacto
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);

        // Limpieza del intervalo al desmontar
        return () => clearInterval(timer);
    }, []);

    // Formatear la hora a hh:mm (formato 24 hrs). Cambia hour12 a true si prefieres am/pm
    const formattedTime = time.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
    });

    return (
        <div 
        // className={className} 
        style={{ 
            fontVariantNumeric: 'tabular-nums',
            // border:'solid 3px #d0d0d0',
            borderRadius: '15px',
            paddingInline:'20px',
            color:'#a0a0a0'
            }}
        >
            {formattedTime}
        </div>
    );
};

export default ClockTime;