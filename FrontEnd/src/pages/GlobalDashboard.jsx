import React, { useState, useEffect } from 'react';
import { LINES_CONFIG } from '@config/linesConfig'; 
import LineDeltaContainer from '@components/Dashboard/LineDeltaContainer'; 
import Header from '@components/Header/Header'; 
import Footer from '@components/Footer/footer';

const GlobalDashboard = () => {
    const lineasOriginales = Object.values(LINES_CONFIG);
    const lineasProcesadas = [];

    lineasOriginales.forEach((linea) => {
        if (linea.id.toLowerCase().includes('insi') || (linea.name && linea.name.toLowerCase().includes('insi'))) { 
            lineasProcesadas.push({ ...linea, lineNo: 1, name: `${linea.name} - L1` });
            lineasProcesadas.push({ ...linea, lineNo: 2, name: `${linea.name} - L2` });
        } else {
            lineasProcesadas.push({ ...linea, lineNo: null });
        }
    });

    // Estado del ciclo de enfoque (avanza de 2 en 2)
    const [activeIndex, setActiveIndex] = useState(0);

    // Temporizador de 20 segundos
    useEffect(() => {
        if (lineasProcesadas.length === 0) return;
        const interval = setInterval(() => {
            setActiveIndex((prevIndex) => (prevIndex + 2) % lineasProcesadas.length);
        }, 60 * 1000); 

        return () => clearInterval(interval);
    }, [lineasProcesadas.length]);

    // Extraer las dos líneas enfocadas correspondientes
    const focusedLine1 = lineasProcesadas[activeIndex];
    // Aseguramos que si estamos en la última línea impar, la segunda compañera sea la número 0
    const nextIndex = (activeIndex + 1) % lineasProcesadas.length;
    const focusedLine2 = lineasProcesadas[nextIndex];

    // Filtrar las líneas para el carrusel inferior (excluir las que tienen el focus arriba)
    const lineasCarousel = lineasProcesadas.filter((_, idx) => idx !== activeIndex && idx !== nextIndex);

    const cardStyleSmall = { flex: '0 0 auto', weight:'600px', height: '100%' };

    return (
        <div className="global-dashboard-kiosk">
            <Header title="Dashboard Global de Producción" />
            
            <main style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '20px', 
                    // padding: '10px', 
                    boxSizing: 'border-box', 
                    overflow: 'hidden',
                    justifyContent: 'center',
                    
                }}>
                
                {/* SECCIÓN SUPERIOR: 2 DELTAS GRANDES (60%) */}
                <div style={{ flex: '0 0 60%', display: 'flex', gap: '20px', padding: '10px',  overflow: 'hidden' }}>
                    
                    {/* Primera Delta Enfocada */}
                    {focusedLine1 && (
                        <div style={{ flex: 1, overflow: 'hidden' }} key={`focus1_${focusedLine1.id}_${activeIndex}`} className="slide-up-animation">
                            <LineDeltaContainer lineConfig={focusedLine1} isLarge={true} />
                        </div>
                    )}

                    {/* Segunda Delta Enfocada */}
                    {focusedLine2 && (
                        <div style={{ flex: 1, overflow: 'hidden' }} key={`focus2_${focusedLine2.id}_${activeIndex}`} className="slide-up-animation">
                            <LineDeltaContainer lineConfig={focusedLine2} isLarge={true} />
                        </div>
                    )}
                </div>

                {/* SECCIÓN INFERIOR: CARRUSEL HACIA LA IZQUIERDA (40%) */}
                <div style={{ flex: '0 0 calc(40% - 20px)', paddingBottom:'10px', overflow: 'hidden', position: 'relative' }}>
                    <div className="marquee-track-left">
                        
                        {/* Bloque Original de todas las líneas */}
                        {lineasCarousel.map((lineaConfig, idx) => (
                            <div key={`bot1_${lineaConfig.id}_${lineaConfig.lineNo || '0'}_${idx}`} style={cardStyleSmall}>
                                <LineDeltaContainer lineConfig={lineaConfig} isLarge={false} />
                            </div>
                        ))}
                        
                        {/* Bloque Duplicado para efecto infinito */}
                        {lineasCarousel.map((lineaConfig, idx) => (
                            <div key={`bot2_${lineaConfig.id}_${lineaConfig.lineNo || '0'}_${idx}`} style={cardStyleSmall}>
                                <LineDeltaContainer lineConfig={lineaConfig} isLarge={false} />
                            </div>
                        ))}

                    </div>
                </div>

            </main>
            <Footer />
        </div>
    );
};

export default GlobalDashboard;