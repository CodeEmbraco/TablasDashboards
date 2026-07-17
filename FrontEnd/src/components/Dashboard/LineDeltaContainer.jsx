import React, { useMemo } from 'react';
import DashboardDelta from './DashboardDelta';
import productionService from '@services/ProductionServices';
import { useLocalLineConfig } from '@hooks/useLocalLineConfig';
import { useProductionDataLite } from '@hooks/useProductionData';
import zero from '@assets/zeroproductividad.png';

const LineDeltaContainer = ({ lineConfig, isLarge, isAdmin, onAccessDenied, selectedDate, selectedShift }) => {
    // Evita errores si lineConfig es undefined
    if (!lineConfig) return null;

    const uniqueLineId = lineConfig.lineNo
        ? `${lineConfig.id}_${lineConfig.lineNo}`
        : lineConfig.id;

    // useLocalLineConfig es el fallback de info local
    const { config } = useLocalLineConfig(uniqueLineId, lineConfig.defaultMeta);
    void config;

    // Define apiConfig for useProductionDataLite
    const apiConfig = useMemo(() => ({
        getTotalShiftDelta: (date, ln) => productionService.getTotalShiftDelta(lineConfig.id, date, ln),
        getTotalDate: (date, ln) => productionService.getTotalDate(lineConfig.id, date, ln),
        getShiftsStatus: (date, ln) => productionService.getShiftsStatus(lineConfig.id, date, ln),
        postShiftToggle: (date, shift, shiftStatus, ln) => productionService.shiftToggleStatus(lineConfig.id, date, shift, shiftStatus, ln),
        getLineEffectiveGoalDay: (date, ln) => productionService.getLineEffectiveGoalDay(lineConfig.id, date, ln)
    }), [lineConfig.id]);

    // Use useProductionDataLite hook to fetch all necessary data without heavy queries
    const {
        totalDia,         // Piezas reales del día
        accGoal,          // Meta acumulada del día obtenida de la base de datos
        totalDelta,       // Arreglo de metas finales de todos los turnos
        shiftsStatus,     // Arreglo con estatus (Activo/Inactivo)
        loading,
        error,
        toggleShiftDB     // Función para cambiar el estado de un turno
    } = useProductionDataLite(selectedDate, apiConfig, lineConfig.lineNo, 'full');

    // Calculate metrics locally
    const eficiencia = accGoal > 0 ? Math.round((totalDia / accGoal) * 100) : 0;
    const status = eficiencia >= 100 ? "bueno" : eficiencia >= 90 ? "medio" : "mal";

    // Determine delta color based on metrics and active shifts
    const noShiftsActive = shiftsStatus.filter(s => Boolean(s.Activo || s.ACTIVO)).length === 0;
    const deltaColor = (noShiftsActive || accGoal === 0)
        ? '#4caf50'
        : (eficiencia >= 100 ? '#4caf50' : (eficiencia >= 90 ? '#fbc02d' : '#ea5a00'));
    // 1. ESTADO DE CARGA (Mantiene la estructura grid-item)
    if (loading) {
        return (
            <div className="grid-item" style={{ height: '350px', display: 'flex' }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img
                        src={lineConfig.imgURL || zero}
                        alt="Cargando..."
                        fetchPriority="high"
                        style={{ width: '100%', maxWidth: '200px', opacity: 0.5 }}
                    />
                    <div className="spinner" style={{ position: 'absolute' }}></div>
                </div>
            </div>
        );
    }

    // 3. RENDERIZADO EXITOSO
    return (
        <div className="grid-item" style={{
            borderTop: `8px solid ${deltaColor}`,
            // El contenedor cambia de altura dinámicamente
            height: isLarge ? '485px' : '325px',
            display: 'flex',
            flexDirection: 'column',
            padding: '10px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            position: 'relative',
            transition: 'all 0.4s ease-in-out'
        }}>
            {/* INDICADOR DE REINTENTO: Spinner en la esquina superior derecha si falla la conexión */}
            {error && (
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
                // El título crece si tiene el foco
                fontSize: isLarge ? '2.2rem' : '1.5rem',
                fontWeight: 'bold',
                padding: '5px',
                transition: 'font-size 0.4s ease'
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
                    total={totalDia} // Total real del día
                    accGoal={accGoal} // Meta acumulada del día
                    eficiencia={eficiencia} // Eficiencia del día
                    status={status} // Status del día
                    activeShifts={shiftsStatus} // Estatus de los turnos
                    onToggleShift={toggleShiftDB}
                    totalTurno={totalDelta} // Desglose de metas finales de todos los turnos
                    imgURL={lineConfig.imgURL}
                    isAdmin={isAdmin}
                    onAccessDenied={onAccessDenied}
                    isLarge={isLarge}
                />
            </div>
        </div>
    );
};

export default LineDeltaContainer;