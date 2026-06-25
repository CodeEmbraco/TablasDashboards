import React, { useState, useEffect, useMemo, useCallback } from 'react';
import productionService from '@services/ProductionServices';
import { useProductionData } from '@hooks/useProductionData';
import { useProductionMetrics } from '@hooks/useProductionMetrics';
import ZeroBien from '@assets/zero-status-color/zero-green.png';
import ZeroMal from '@assets/zero-status-color/zero-red.png';
import ZeroYellow from '@assets/zero-status-color/zero-yellow.png';
import '@styles/global.css';

/**
 * Componente que muestra el rate individual (Real vs Meta) para una sola línea.
 * Utiliza los hooks de datos y métricas para obtener la información necesaria.
 */
const LineRateItem = ({ lineConfig, selectedDate, selectedShift, onDataLoaded }) => {
    const apiConfig = useMemo(() => ({
        getHourData: (date, shift, ln) => productionService.getHourlyData(lineConfig.id, date, shift, ln),
        getTotalShift: (date, shift, ln) => productionService.getTotalShift(lineConfig.id, date, shift, ln),
        getTotalShiftDelta: (date, ln) => productionService.getTotalShiftDelta(lineConfig.id, date, ln),
        getReport: (date, shift, ln) => productionService.getLossReports(lineConfig.id, date, shift, ln),
        postReport: (reportData, ln) => productionService.saveReport(lineConfig.id, reportData, ln),
        getTotalDate: (date, ln) => productionService.getTotalDate(lineConfig.id, date, ln),
        getShiftsStatus: (date, ln) => productionService.getShiftsStatus(lineConfig.id, date, ln),
        postShiftToggle: (date, shift, shiftStatus, ln) => productionService.shiftToggleStatus(lineConfig.id, date, shift, shiftStatus, ln)
    }), [lineConfig.id]);

    const { 
        tableItems, 
        totalDia, 
        totalDelta, 
        shiftsStatus, 
        totalTurno, 
        loading } = useProductionData
        (
            selectedDate, 
            selectedShift, 
            lineConfig.defaultMeta, 
            apiConfig, 
            lineConfig.lineNo
        );
    const { dia: dayMetrics } = useProductionMetrics(tableItems, totalDelta, shiftsStatus, totalTurno, totalDia, selectedDate, selectedShift);

    useEffect(() => {
        if (!loading) {
            const currentLineId = `${lineConfig.id}-${lineConfig.lineNo || '0'}`;
            
            onDataLoaded(currentLineId, {
                real: totalDia,
                meta: dayMetrics.metaTotalAcumulada
            });
        }
    }, [loading, totalDia, dayMetrics.metaTotalAcumulada, onDataLoaded, lineConfig.id, lineConfig.lineNo]);

    // if (loading) {
    //     return (

    //             <div className="line-rate-item loading">
    //                 <span>{lineConfig.name}:</span>
    //                 <div className="spinner-mini" style={{borderLeftColor: '#ccc'}}></div>
    //             </div>
    //     );
    // }

    const itemColor = ( dayMetrics.metaTotalAcumulada === 0) 
        ? '#4caf50' 
        : (dayMetrics.eficiencia >= 100 ? '#4caf50' : (dayMetrics.eficiencia >= 90 ? '#fbc02d' : '#ea5a00'));
    // const displayValue = Math.min(Math.max(dayMetrics.eficiencia,0), 100);


    return (
<div 
    className="progressBar-container" style={{ 
    position: 'relative', 
    height: '40px',          
    width: '100%', 
    borderRadius: '40px',     
    overflow: 'hidden',       
    zIndex: 1
    }}
>
    {/* Barra animada */}
    <div className="progress-bar-gradient" 
    style={{
        '--dynamic-color': itemColor,
        position: 'absolute',
        top: 0,
        left: 0,
        // width: `${displayValue}%`, // Crece dinámicamente hacia la derecha
        width: "100%",
        height: '100%',
        zIndex: 2
    }} 
    />

    {/* Contenedor del texto */}
    <div 
    // className="line-rate-item" 
    style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height:  '100%',
        display: 'flex',       
        alignItems: 'center',
        // justifyContent: 'left',
        pointerEvents: 'none',
        padding: '5px 10px',
        zIndex: 10,             
        color: '#000000'
    }}
    >
        <div style={{ 
                display: 'flex', 
                justifyContent:'space-between', 
                alignItems: 'center',
                width: '100%'
            }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{lineConfig.name}: </span>
            <strong style={{ color: `${itemColor}`, fontSize: '1.8rem', marginRight:'15px'}}>
                {totalDia} / {parseInt(dayMetrics.metaTotalAcumulada)}
            </strong>
        </div>
    </div>
</div>
    );
};

/**
 * Contenedor principal que muestra el rate consolidado de todas las líneas.
 */
const ConsolidatedRate = ({ lines, selectedDate, selectedShift }) => {
    const [consolidatedData, setConsolidatedData] = useState({});
    const [totalReal, setTotalReal] = useState(0);
    const [totalMeta, setTotalMeta] = useState(0);

    const handleDataLoaded = useCallback((lineId, data) => {
        setConsolidatedData(prev => {
            const prevData = prev[lineId];
            if (prevData && prevData.real === data.real && prevData.meta === data.meta) {
                return prev; 
            }
            return { ...prev, [lineId]: data };
        });
    }, []);

    useEffect(() => {
        const realSum = Object.values(consolidatedData).reduce((acc, curr) => acc + (curr.real || 0), 0);
        const metaSum = Object.values(consolidatedData).reduce((acc, curr) => acc + (curr.meta || 0), 0);
        setTotalReal(realSum);
        setTotalMeta(metaSum);
    }, [consolidatedData]);

    const totalEficiencia = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;
    const statusClass = totalEficiencia >= 100 ? 'bueno' : (totalEficiencia >= 90 ? 'medio' : 'mal');
    const statusImage = statusClass === 'bueno' ? ZeroBien : (statusClass === 'medio' ? ZeroYellow : ZeroMal);
    const deltaColor = totalEficiencia >= 100 ? '#4caf50' : (totalEficiencia >= 90 ? '#fbc02d' : '#ea5a00');

    return (
        <div className="grid-item" style={{ 
            border: `0px`,
            padding: '10px', 
            boxSizing: 'border-box',
            pointerEvents: 'none'
        }}>

            {/* Contenedor principal usando GRID para asegurar el 50/50 exacto */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', /* Crea 2 columnas de exactamente el mismo tamaño */
                gap: '20px', /* Espacio entre las líneas y el total */
                alignItems: 'center', /* Centra ambos lados verticalmente */
                width: '100%' 
            }}>
                
                {/* Columna Izquierda: Lista de Líneas */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    width: '100%'
                }}>
                    {lines.map(line => (
                        <LineRateItem
                            key={`${line.id}-${line.lineNo || '0'}`}
                            lineConfig={line}
                            selectedDate={selectedDate}
                            selectedShift={selectedShift}
                            onDataLoaded={handleDataLoaded} 
                        />
                    ))}
                </div>

                {/* Columna Derecha: Totales e Imagen */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '15px',
                    width: '100%'
                }}>
                    <div style={{ textAlign: 'center', width:'auto'}}>
                        <div style={{ fontSize: '1.7rem', fontWeight: 'bold', color: '#000', }}>TOTAL PLANTA</div>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: deltaColor, lineHeight: 1.1, }}>
                            {totalReal}
                            <span style={{ fontSize: '1.5rem', color: '#888', fontWeight: 'normal' }}>/{parseInt(totalMeta)}</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        {/* Se agregó width 100% y maxWidth para que la imagen sea responsiva y no rompa el Grid */}
                        <img 
                            src={statusImage} 
                            alt="Status Indicator" 
                            fetchPriority="high" 
                            style={{  height: '400px', transition: 'all 0.3s', objectFit:'fill' }} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsolidatedRate;