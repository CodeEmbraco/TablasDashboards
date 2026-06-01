import React, { useState, useEffect } from 'react';
import DashboardDelta from './DashboardDelta';
import productionService from '@services/ProductionServices'; 
import { useLocalLineConfig } from '@hooks/useLocalLineConfig';
import { getFormattedDate, getCurrentShift } from '@utils/dateUtils';
import { calcularMetaDiaAcumulada } from '@utils/shiftUtils';

const LineDeltaContainer = ({ lineConfig }) => {
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

    // 2. ESTADO DE ERROR (Mantiene la estructura grid-item ante el error 500)
    if (prodData.error) {
        return (
            <div className="grid-item dashboard-delta-error">
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                <div style={{ fontWeight: 'bolder', fontSize: '18px' }}>
                    Sin conexión a BD
                </div>
                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
                    {lineConfig.name}
                </div>
                <div style={{ fontSize: '12px', marginTop: '15px' }}>
                    Reintentando en el próximo ciclo...
                </div>
            </div>
        );
    }

    // 3. RENDERIZADO EXITOSO
    return (
        <div className="grid-item" style={{ borderTop: `8px solid ${deltaColor}` }}>
            <div style={{
                textAlign: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                padding: '5px'
            }}>
                {lineConfig.name}
            </div>
            
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
    );
};

export default LineDeltaContainer;