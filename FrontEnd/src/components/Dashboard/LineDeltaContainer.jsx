import React, { useState, useEffect } from 'react';
import DashboardDelta from './DashboardDelta';
import productionService from '@services/ProductionServices'; 
import { useLocalLineConfig } from '@hooks/useLocalLineConfig';
import { getFormattedDate, getCurrentShift } from '@utils/dateUtils';
import { calcularMetaDiaAcumulada } from '@utils/shiftUtils';

const LineDeltaContainer = ({ lineConfig, isLarge, isAdmin, onAccessDenied }) => {
    // Evita errores si lineConfig es undefined
    if (!lineConfig) return null;

    const uniqueLineId = lineConfig.lineNo 
        ? `${lineConfig.id}_${lineConfig.lineNo}` 
        : lineConfig.id;

    const { config, toggleShift } = useLocalLineConfig(uniqueLineId, lineConfig.defaultMeta);
    
    const [prodData, setProdData] = useState({
        desgloseTurnos: [], 
        totalTurno: 0,
        shiftsStatus: [],
        loading: true,
        error: null
    });

    const today = getFormattedDate();
    const turnoActual = getCurrentShift();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const [refreshSignal, setRefreshSignal] = useState(0);

    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        const fetchData = async () => {
            try {
                const [resDesglose, resTurno, resShifts] = await Promise.all([
                    productionService.getTotalShiftDelta(lineConfig.id, today, lineConfig.lineNo),
                    productionService.getTotalShift(lineConfig.id, today, turnoActual, lineConfig.lineNo),
                    productionService.getShiftsStatus(lineConfig.id, today, lineConfig.lineNo)
                ]);

                const desgloseArray = Array.isArray(resDesglose) 
                    ? resDesglose 
                    : (resDesglose?.data || resDesglose?.result || resDesglose?.desglose || []);

                if (isMounted) {
                    setProdData({
                        desgloseTurnos: desgloseArray, 
                        totalTurno: resTurno?.TOTAL_TURNO ?? resTurno?.total ?? resTurno?.TOTAL ?? 0,
                        shiftsStatus: resShifts || [],
                        loading: false,
                        error: null
                    });
                    // ÉXITO: Programamos la siguiente actualización normal en 60 segundos
                    timeoutId = setTimeout(fetchData, 60000);
                }
            } catch (error) {
                console.error(`Error al cargar datos para ${lineConfig.name}:`, error);
                if (isMounted) {
                    setProdData(prev => ({ ...prev, loading: false, error: 'Error de conexión' }));
                    // ERROR: Iniciamos un ciclo de reintento rápido (10 segundos)
                    timeoutId = setTimeout(fetchData, 10000);
                }
            }
        };

        fetchData();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [lineConfig.id, lineConfig.lineNo, today, turnoActual, refreshSignal]);

    const toggleShiftDB = async (shiftId, currentStatus) => {
        try {
            await productionService.shiftToggleStatus(lineConfig.id, today, shiftId, !currentStatus, lineConfig.lineNo);
            // Forzamos actualización de datos
            setRefreshSignal(prev => prev + 1);
        } catch (error) {
            console.error("Error toggling shift status in dashboard:", error);
        }
    };

    const produccionDiaAjustada = prodData.desgloseTurnos
        .filter(item => {
            const turnoId = String(item.TURNO ?? item.turno ?? item.Turno ?? '');
            const statusDB = prodData.shiftsStatus.find(s => String(s.Turno) === turnoId);
            return statusDB ? Boolean(statusDB.Activo) : true;
        })
        .reduce((acc, item) => {
            const piezas = item.CONTADOR ?? item.contador ?? item.total ?? item.TOTAL ?? 0;
            return acc + (Number(piezas) || 0); 
        }, 0);

    // Sincronizamos los turnos activos con la base de datos para evitar discrepancias visuales
    const activeShiftsFromDB = prodData.shiftsStatus
        .filter(s => Boolean(s.Activo || s.ACTIVO))
        .map(s => String(s.Turno));

    const metaAcumulada = calcularMetaDiaAcumulada(
        {
            selectedDate: today,
            metaPorHora: config.metaPorHora || lineConfig.defaultMeta,
            currentClientHour: currentHour,
            currentClientMinute: currentMinute
        }, 
        { ...config, activeShifts: activeShiftsFromDB }
    );
    
    const eficiencia = metaAcumulada > 0 ? (produccionDiaAjustada / metaAcumulada) * 100 : 0;

    const status = eficiencia >= 100 ? 'status-good' : (eficiencia >= 90 ? 'status-regular' : 'status-bad');

    const noShiftsActive = activeShiftsFromDB.length === 0;
    const deltaColor = noShiftsActive ? '#4caf50' : (eficiencia >= 100 ? '#4caf50' : (eficiencia >= 90 ? '#fbc02d' : '#ea5a00'));

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
                <div style={{ color: '#888', marginTop: '15px', fontWeight: 'bold',
                    width : isLarge ? '100%' : '600px'
                }}>
                    Conectando con {lineConfig.name}...
                </div>
            </div>
        );
    }

    // 3. RENDERIZADO EXITOSO
    return (
        <div className="grid-item" style={{ 
            borderTop: `8px solid ${deltaColor}`, 
            // borderRight: `8px solid ${deltaColor}`, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            padding: '10px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            position: 'relative' // Necesario para posicionar el spinner de reconexión
        }}>
            {/* INDICADOR DE REINTENTO: Spinner en la esquina superior derecha si falla la conexión */}
            {prodData.error && (
                <div title="Sin conexión - Reintentando..." style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 100,
                    display: 'flex',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    padding: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                    <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '3px', borderLeftColor: '#d32f2f' }}></div>
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
                    status={status}
                    activeShifts={prodData.shiftsStatus}
                    onToggleShift={toggleShiftDB}
                    totalTurno={prodData.desgloseTurnos}
                    imgURL={lineConfig.imgURL}
                    isAdmin={isAdmin}
                    onAccessDenied={onAccessDenied}
                />
            </div>
        </div>
    );
};

export default LineDeltaContainer;