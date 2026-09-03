import React, { useState } from 'react';
import { Utensils } from 'lucide-react';

import LossDonut from './LossDonut';


const ProductionRow = ({ row, onOpenModal, isMealHour, customMeta, onSetMeal }) => {
    // Lógica de color para la producción Real vs Meta
    const getRealColor = () => {
        // Usamos customMeta si existe, si no, la meta por defecto de la fila
        const targetMeta = customMeta !== undefined ? Number(customMeta) : row.meta;
        
        if (row.real >= targetMeta) return '#2e7d32'; // Verde si cumple
        if (row.real > 0) return '#ed6c02';           // Naranja si hay progreso
        return '#d32f2f';                             // Rojo si está en cero
    };

    // Validación para evitar el bug de [object Object]
    const renderObservations = () => {
        if (typeof row.observaciones === 'string') {
            return row.observaciones;
        }
        // Si es un objeto o nulo, devolvemos string vacío
        return "";
    };

    return (
        <tr>
            {/* COLUMNA 1: HORA (Clickable para comida) */}
            <td 
                onClick={() => onSetMeal(row.hora)}
                title="Clic para marcar hora de comida"
                style={{ cursor: 'pointer' }}
            >
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    justifyContent: 'center',
                    fontWeight: 'bold', 
                    color: '#555' 
                }}>
                    {row.hora}
                    {isMealHour && (
                        <div style={{border: "2px solid #39bc4d" , borderRadius: "5px", justifyContent: "space-between", paddingInline:"5px", paddingBlockStart:"2px"}}>
                        <Utensils size={20} color="#39bc4d" strokeWidth={4} />
                        </div>
                    )}
                </div>
            </td>

            {/* COLUMNA 2: PLAN */}
            <td>
                {row.meta}
            </td>

            {/* COLUMNA 3: REAL */}
            <td style={{ 
                fontWeight: 'bold', 
                color: getRealColor(), 
                backgroundColor : `${getRealColor()}20`
            }}>
                {row.real ?? 0}
            </td>

            {/* COLUMNA 4: MODELO */}
            <td style={{ fontSize: '0.85rem' }}>{row.modelos}</td>

            {/* COLUMNA 5: PÉRDIDAS NO JUSTIFICADAS*/}
            <td style={{ fontSize: '0.85rem' }}>
                <LossDonut
                justificada={row.perdidaJustificada ? row.perdidaJustificada : 0}
                noJustificada={row.perdidaNoJustificada ?  row.perdidaNoJustificada : row.perdidaCalculada}
                finalizada={row.finalizada}
                />
            </td>
        

            {/* COLUMNA 6: PÉRDIDAS JUSTIFICADAS*/}
            <td style={{ 
                fontWeight: row.perdidaJustificada > 0 ? 'bold' : 'normal',
                color: row.perdidaJustificada > 0 ? '#f97d10' : '#777' 
            }}>
                {row.perdidaJustificada} min
            </td>

            {/* COLUMNA 6: OBSERVACIONES */}
            <td style={{ textAlign: 'left', fontSize: '0.85rem', color: '#555' }}>
                {renderObservations()}
            </td>

            {/* COLUMNA 7: ACCIONES */}
            <td>
                <button 
                    className="btn-action-ensamble" 
                    onClick={() => onOpenModal(row.hora)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                    ⚙️
                </button>
            </td>
        </tr>
    );
};

export default ProductionRow;