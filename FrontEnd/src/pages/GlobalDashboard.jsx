// React & Router
import React, { useState, useEffect } from 'react';

// Context & Hooks
import { useAdmin } from '@hooks/useAdmin';
import { useProduction } from '@context/ProductionContext';

//Services
import productionService from '@services/ProductionServices';

//Components
import LineDeltaContainer from '@components/Dashboard/LineDeltaContainer'; 
import Header from '@components/Header/Header'; 
import Footer from '@components/Footer/footer';
import ClockTime from '@components/ClockTime/ClockTime';
import AdminTimer from '@components/Admin/AdminTimer';
import AdminAccessButton from '@components/Admin/AdminAccessButton';
import ConsolidatedRate from '@components/Dashboard/ConsolidatedRate';

//Configuración de las líneas Local //!Son un fallback en caso de problemas en la base de datos
import { LINES_CONFIG } from '@config/linesConfig'; 

const GlobalDashboard = () => {
    const { selectedDate, selectedShift } = useProduction();
    const [lineasProcesadas, setLineasProcesadas] = useState([]);
    const { isAdmin, handleUnlock, handleExpire, adminWarning, showWarning } = useAdmin();
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const updateGreeting = () => {
            const hour = new Date().getHours();
            if (hour >= 6 && hour < 12) {
                setGreeting('Buenos días');
            } else if (hour >= 12 && hour < 19) {
                setGreeting('Buenas tardes');
            } else {
                setGreeting('Buenas noches');
            }
        };

        updateGreeting(); // Ejecutar al cargar
        // Verificar cada minuto por si el turno cambia mientras la pantalla está encendida
        const interval = setInterval(updateGreeting, 60000); 
        return () => clearInterval(interval);
    }, []);

    // Carga inicial de todas las líneas para obtener sus nombres oficiales
    useEffect(() => {
        const loadAllLines = async () => {
            try {
                const dbLines = await productionService.getLinesConfig(); // Param null trae info elemental
                const staticInfo = Object.values(LINES_CONFIG);
                
                const procesadas = staticInfo.map(staticLine => {
                    const dbInfo = dbLines.find(db => db.LineId === staticLine.id);
                    const nombreBase = dbInfo ? dbInfo.Nombre : "Línea Desconocida";
                    
                    if (staticLine.id.toLowerCase().includes('insi')) {
                        return [
                            { ...staticLine, name: `${nombreBase} - L1`, lineNo: 1 },
                            { ...staticLine, name: `${nombreBase} - L2`, lineNo: 2 }
                        ];
                    }
                    return { ...staticLine, name: nombreBase, lineNo: null };
                }).flat();

                setLineasProcesadas(procesadas);
            } catch (err) {
                console.error("Error cargando dashboard global:", err);
            }
        };
        loadAllLines();
    }, []);

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

    if (lineasProcesadas.length === 0) {
        return <div className="loading-screen"><p>Cargando Dashboard de Producción...</p></div>;
    }

    // Extraer las dos líneas enfocadas correspondientes
    const focusedLine = lineasProcesadas[activeIndex];
    // Aseguramos que si estamos en la última línea impar, la segunda compañera sea la número 0
    const nextIndex = (activeIndex + 1) % lineasProcesadas.length;

    // Filtrar las líneas para el carrusel inferior (excluir las que tienen el focus arriba)
    const lineasCarousel = lineasProcesadas.filter((_, idx) => idx !== activeIndex && idx !== nextIndex);

    const cardStyleSmall = { flex: '0 0 auto', weight:'600px', height: '100%' };


    return (
        <div className="global-dashboard-kiosk">
            <Header title="Dashboard Global de Producción" />

            {/* TOAST DE ACCESO DENEGADO */}
            {adminWarning && (
                <div className="discreet-notification warning-toast">
                    ⚠️ {adminWarning}
                </div>
            )}

            {/* Temporizador de Seguridad */}
            {isAdmin && <AdminTimer onExpire={handleExpire} />}
            
            <main style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '20px', 
                    // padding: '10px', 
                    boxSizing: 'border-box', 
                    overflow: 'hidden',
                    justifyContent: 'space-around',
                    
                }}>
                    <div style={{ 
                        // flex: 1,
                        display: 'flex', 
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        // alignItems: 'center',
                        // gap: '20px',
                        fontSize: '2rem', 
                        fontWeight: '600',
                        // color: 'var(--nidec-lightgreen)', 
                        // marginTop: '5px' 
                    }}>
                        {/* <div style={{paddingLeft:'40px'}}>¡{greeting}, equipo!</div> */}
                        <div style={{
                            marginRight:'40px',
                            }}>
                                <ClockTime/>
                        </div>
                    </div>
                
                {/* SECCIÓN SUPERIOR: 2 DELTAS GRANDES (60%) */}
                <div style={{ flex: '0 0 60%', display: 'flex', gap: '20px', padding: '10px',  overflow: 'hidden' }}>
                    
                    {/* Primer Slot: Consolidado de Planta */}
                    {lineasProcesadas.length > 0 && (
                        <div style={{ flex: 1, overflow: 'hidden' }} key={`consolidated_${activeIndex}`}>
                            <ConsolidatedRate
                                lines={lineasProcesadas}
                                isLarge={true} 
                                isAdmin={isAdmin} 
                                onAccessDenied={showWarning}
                                selectedDate={selectedDate}
                                selectedShift={selectedShift}
                            />
                        </div>
                    )}

                    {/* Segunda Delta Enfocada */}
                    {focusedLine && (
                        <div style={{ flex: 1, overflow: 'hidden' }} key={`focus2_${focusedLine.id}_${focusedLine.lineNo}_${activeIndex}`} className="slide-up-animation">
                            <LineDeltaContainer 
                                lineConfig={focusedLine} 
                                isLarge={true} 
                                isAdmin={isAdmin} 
                                onAccessDenied={showWarning}
                                selectedDate={selectedDate}
                                selectedShift={selectedShift}
                            />
                        </div>
                    )}
                </div>

                {/* SECCIÓN INFERIOR: CARRUSEL HACIA LA IZQUIERDA (40%) */}
                <div style={{ flex: '0 0 calc(40% - 20px)', paddingBottom:'10px', overflow: 'hidden', position: 'relative' }}>
                    <div className="marquee-track-left">
                        
                        {/* Bloque Original de todas las líneas */}
                        {lineasCarousel.map((lineaConfig, idx) => (
                            <div key={`bot1_${lineaConfig.id}_${lineaConfig.lineNo}_${idx}`} style={cardStyleSmall}>
                                <LineDeltaContainer 
                                    lineConfig={lineaConfig} 
                                    isLarge={false} 
                                    isAdmin={isAdmin} 
                                    onAccessDenied={showWarning}
                                    selectedDate={selectedDate}
                                    selectedShift={selectedShift}
                                />
                            </div>
                        ))}
                        
                        {/* Bloque Duplicado para efecto infinito */}
                        {lineasCarousel.map((lineaConfig, idx) => (
                            <div key={`bot2_${lineaConfig.id}_${lineaConfig.lineNo}_${idx}`} style={cardStyleSmall}>
                                <LineDeltaContainer 
                                    lineConfig={lineaConfig} 
                                    isLarge={false} 
                                    isAdmin={isAdmin} 
                                    selectedDate={selectedDate}
                                    selectedShift={selectedShift}
                                />
                            </div>
                        ))}

                    </div>
                </div>

            </main>

            {/* Botón de Acceso Flotante */}
            <AdminAccessButton 
                isAdmin={isAdmin} 
                onUnlock={handleUnlock} 
                className="btn-admin-floating" 
            />

            <Footer />
        </div>
    );
};

export default GlobalDashboard;