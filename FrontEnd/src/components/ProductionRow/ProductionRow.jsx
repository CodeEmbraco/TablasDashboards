import React, { useState } from 'react';
import { Utensils } from 'lucide-react';

const ProductionRow = ({ row, onOpenModal, isMealHour, customMeta, onUpdateMeta, onSetMeal }) => {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const SUPERVISOR_PASS = "embraco";

    const handleMetaAccess = () => {
        if (!isUnlocked) {
            const input = window.prompt("Ingrese la contraseña del Supervisor:");
            if (input === SUPERVISOR_PASS) {
                setIsUnlocked(true);
            } else if(input !== null) {
                alert("Contraseña incorrecta.");
            }
        }
    };
    // Formateo de la hora (de entero a rango 00:00)
    const formatHourRange = (hour) => {
        const start = String(hour).padStart(2, '0');
        const end = String((hour + 1) % 24).padStart(2, '0');
        return `${start}:00 - ${end}:00`;
    };

    // Lógica de color para la producción Real vs Meta
    const getRealColor = () => {
        // Usamos customMeta si existe, si no, la meta por defecto de la fila
        const targetMeta = customMeta !== undefined ? Number(customMeta) : row.META;
        
        if (row.REAL >= targetMeta) return '#2e7d32'; // Verde si cumple
        if (row.REAL > 0) return '#ed6c02';           // Naranja si hay progreso
        return '#d32f2f';                             // Rojo si está en cero
    };

    // Validación para evitar el bug de [object Object]
    const renderObservations = () => {
        if (typeof row.OBSERVACIONES === 'string') {
            return row.OBSERVACIONES;
        }
        // Si es un objeto o nulo, devolvemos string vacío
        return "";
    };

    return (
        <tr>
            {/* COLUMNA 1: HORA (Clickable para comida) */}
            <td 
                onClick={() => onSetMeal(row.TIME_SLOT)}
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
                    {formatHourRange(row.HORA)}
                    {isMealHour && (
                        <div style={{border: "2px solid #ffa726" , borderRadius: "5px", justifyContent: "space-between", paddingInline:"5px", paddingBlockStart:"2px"}}>
                        <Utensils size={20} color="#ffa726" strokeWidth={4} />
                        </div>
                    )}
                </div>
            </td>

            {/* COLUMNA 2: PLAN (Meta editable) */}
            <td>
                <input 
                    type="number"
                    className="input-meta-cell"
                    readOnly={!isUnlocked}
                    onClick={handleMetaAccess}
                    value={customMeta !== undefined ? customMeta : row.META}
                    onChange={(e) => onUpdateMeta(row.TIME_SLOT, e.target.value)}
                    style={{
                        width: '60px',
                        textAlign: 'center',
                        border: '1px solid transparent',
                        background: 'transparent',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        color: '#333'
                    }}
                    onFocus={(e) => {if (isUnlocked) e.target.style.border = '1px solid #ccc';}}
                    onBlur={(e) => {e.target.style.border = '1px solid transparent';
                        // Opcional: Puedes descomentar la siguiente línea para que se bloquee 
                        // automáticamente al salir del campo:
                        // setIsUnlocked(false); 
                    }}
                />
            </td>

            {/* COLUMNA 3: REAL */}
            <td style={{ 
                fontWeight: 'bold', 
                color: getRealColor(), 
                backgroundColor : `${getRealColor()}20` // Bajé la opacidad a 20 para que sea más sutil
            }}>
                {row.REAL}
            </td>

            {/* COLUMNA 4: MODELO */}
            <td style={{ fontSize: '0.85rem' }}>{row.MODELO || '---'}</td>

            {/* COLUMNA 5: PÉRDIDAS */}
            <td style={{ 
                fontWeight: row.MINUTOS_PERDIDA > 0 ? 'bold' : 'normal',
                color: row.MINUTOS_PERDIDA > 0 ? '#d32f2f' : '#777' 
            }}>
                {row.MINUTOS_PERDIDA} min
            </td>

            {/* COLUMNA 6: OBSERVACIONES */}
            <td style={{ textAlign: 'left', fontSize: '0.85rem', color: '#555' }}>
                {typeof row.OBSERVACIONES === 'string' ? row.OBSERVACIONES : ""}
            </td>

            {/* COLUMNA 7: ACCIONES */}
            <td>
                <button 
                    className="btn-action-ensamble" 
                    onClick={() => onOpenModal(row.TIME_SLOT)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                    ⚙️
                </button>
            </td>
        </tr>
    );
};

export default ProductionRow;