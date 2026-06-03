import React, { useState, useEffect } from 'react';
import DashboardDelta from './DashboardDelta';
import productionService from '@services/ProductionServices'; 
import { useLocalLineConfig } from '@hooks/useLocalLineConfig';
import { getFormattedDate, getCurrentShift } from '@utils/dateUtils';
import { calcularMetaDiaAcumulada } from '@utils/shiftUtils';

const LineDeltaContainer = ({ lineConfig, isLarge }) => {
    const uniqueLineId = lineConfig.lineNo 
        ? `${lineConfig.id}_${lineConfig.lineNo}` 
        : lineConfig.id;

    const { config, toggleShift } = useLocalLineConfig(uniqueLineId, lineConfig.defaultMeta);
    
    const [prodData, setProdData] = useState({
        desgloseTurnos: [], 
        totalTurno: 0,
        loading: true,
        error: null
    });

    const today = getFormattedDate();
    const turnoActual = getCurrentShift();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                const [resDesglose, resTurno] = await Promise.all([
                    productionService.getTotalShiftDelta(lineConfig.id, today, lineConfig.lineNo),
                    productionService.getTotalShift(lineConfig.id, today, turnoActual, lineConfig.lineNo)
                ]);

                const desgloseArray = Array.isArray(resDesglose) 
                    ? resDesglose 
                    : (resDesglose?.data || resDesglose?.result || resDesglose?.desglose || []);

                if (isMounted) {
                    setProdData({
                        desgloseTurnos: desgloseArray, 
                        totalTurno: resTurno?.TOTAL_TURNO ?? resTurno?.total ?? resTurno?.TOTAL ?? 0,
                        loading: false,
                        error: null
                    });
                }
            } catch (error) {
                console.error(`Error al cargar datos para ${lineConfig.name}:`, error);
                if (isMounted) {
                    setProdData(prev => ({ ...prev, loading: false, error: 'Error de conexión' }));
                }
            }
        };

        fetchData();
        const intervalId = setInterval(fetchData, 60000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [lineConfig.id, lineConfig.lineNo, today, turnoActual]);

    const produccionDiaAjustada = prodData.desgloseTurnos
        .filter(item => {
            const valorTurno = String(item.TURNO ?? item.turno ?? item.Turno ?? '');
            return config.activeShifts.includes(valorTurno);
        })
        .reduce((acc, item) => {
            const piezas = item.CONTADOR ?? item.contador ?? item.total ?? item.TOTAL ?? 0;
            return acc + (Number(piezas) || 0); 
        }, 0);

    const metaAcumulada = calcularMetaDiaAcumulada(
        {
            selectedDate: today,
            metaPorHora: config.metaPorHora || lineConfig.defaultMeta,
            currentClientHour: currentHour,
            currentClientMinute: currentMinute
        }, 
        config
    );
    
    const eficiencia = metaAcumulada > 0 ? (produccionDiaAjustada / metaAcumulada) * 100 : 0;
    const deltaColor = eficiencia >= 100 ? '#4caf50' : (eficiencia >= 90 ? '#fbc02d' : '#ea5a00');

    // 1. ESTADO DE CARGA (Mantiene la estructura grid-item)
    if (prodData.loading) {
        return (
            <div className="grid-item" style={{ 
                borderTop: '8px solid #cccccc', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                minHeight: '280px'
            }}>
                <div className="spinner"></div>
                <div style={{ color: '#888', marginTop: '15px', fontWeight: 'bold' }}>
                    Conectando con {lineConfig.name}...
                </div>
            </div>
        );
    }

    // 3. RENDERIZADO EXITOSO
    return (
        <div className="grid-item" style={{ 
            borderTop: `8px solid ${deltaColor}`, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            padding: '10px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            position: 'relative' // Necesario para posicionar el spinner de reconexión
        }}>
            {/* CAPA DE CARGA POR ERROR: Aparece solo si hay error, permitiendo ver los datos previos de fondo */}
            {prodData.error && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.6)', // Fondo semitransparente
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div className="spinner"></div>
                    <div style={{ color: '#666', marginTop: '15px', fontWeight: 'bold', fontSize: '14px' }}>
                        Error de conexión. Reintentando...
                    </div>
                </div>
            )}

            <div style={{
                textAlign: 'center',
                fontSize: isLarge ? '26px' : '20px', // Aumentamos levemente el título si es grande
                fontWeight: 'bold',
                padding: '5px'
            }}>
                {lineConfig.name}
            </div>
            
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}>
                <DashboardDelta 
                    total={produccionDiaAjustada} 
                    accGoal={metaAcumulada}
                    eficiencia={eficiencia}
                    activeShifts={config.activeShifts || []}
                    onToggleShift={toggleShift}
                    desgloseTurnos={prodData.desgloseTurnos}
                    imgURL={lineConfig.imgURL}
                />
            </div>
        </div>
    );
};

export default LineDeltaContainer;