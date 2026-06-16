import React from 'react';
import zero from '@assets/zeroproductividad.png'

const Delta = ({ total, accGoal, totalTurno = [], eficiencia, activeShifts = [], onToggleShift, imgURL, status, isAdmin, onAccessDenied }) => {
    const deltaValue = total - accGoal;
    const deltaSign = deltaValue >= 0 ? "+" : "";

    // Lógica de color: Verde (>=100%), Amarillo (90-99%), Rojo (<90%)
    // Si no hay turnos activos, forzamos gris para no mostrar un estado "crítico" erróneo
    const hasActiveShifts = activeShifts.some(s => s.Activo || s.ACTIVO);
    const deltaColor = !hasActiveShifts ? '#4caf50' : (eficiencia >= 100 ? '#4caf50' : (eficiencia >= 90 ? '#fbc02d' : '#ea5a00'));

    const displayValue = Math.min(Math.max(eficiencia,0), 100);
    
    // console.log('totalTurno content:', totalTurno);
    // console.log('totalTurno length:', totalTurno?.length);
    const shifts = [
        { id: '3', label: 'T3' },
        { id: '1', label: 'T1' },
        { id: '2', label: 'T2' }
    ].map(shift => {
        // Buscamos en el arreglo del backend el turno correspondiente (ej. TURNO: 1)
        const dataTurno = totalTurno.find(item => 
            String(item.TURNO ?? item.turno ?? item.Turno) === shift.id
        );

        return {
            ...shift,
            // Si lo encontró, asignamos el valor del CONTADOR, si no, se queda en 0
            value: dataTurno ? (dataTurno.CONTADOR ?? dataTurno.contador ?? dataTurno.TOTAL ?? 0) : 0,
            meta: dataTurno ? (dataTurno.MetaEfectivaTurno ?? 0) : 0
        };
    });

    //console.log(shifts);

    return (
        <div className='container-delta-dashboard'>
            <div className='total-dia-delta-dashboard'>
            <div style={{ }}>
                <div className='total-dia-title'>
                TOTAL DÍA
                </div>
                <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: deltaColor, lineHeight: '1' }}>
                    {total}<span style={{ fontSize: '1.5rem', color: '#888', fontWeight: 'normal' }}>/{parseInt(accGoal)}</span>
                </div>
                <p style={{fontWeight:'bolder', fontSize:'1rem', margin:'0px'}}>Actual Rate (RPM)</p>
                <div className="total-dia-delta-text" style={{color: deltaColor, backgroundColor: `${deltaColor}40`}}>
                    Delta: {deltaSign}{parseInt(deltaValue)}
                </div>
            </div>
            <div className='total-dia-icon'>
                <img 
                    src={imgURL ? imgURL : zero} 
                    alt="Line Icon"
                    style={{
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain'
                    }}
                />
            </div>
            <div className='turnos-breakdown-dashboard-delta'>
                {shifts.map((s) => {
                    // 1. Buscamos el estado del turno en el arreglo que viene de la BD
                    // Aseguramos comparar como string ya que viene como INT desde SQL
                    const statusDB = activeShifts.find(shift => String(shift.Turno) === String(s.id));
                    
                    // 2. Si existe en la BD evaluamos su estado, si no hay registro asumimos true (por defecto)
                    const isActive = statusDB ? Boolean(statusDB.Activo) : true;

                    return (
                        <div 
                            key={s.id} 
                            onClick={() => isAdmin ? onToggleShift(s.id, isActive) : onAccessDenied("Acceso Restringido: Introduzca credenciales válidas.")}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                fontSize: '1.3rem',
                                cursor: isAdmin ? 'pointer' : 'not-allowed', 
                                opacity: isActive ? 1 : 0.4,
                                textDecoration: isActive ? 'none' : 'line-through',
                                paddingBlock: '3px' 
                            }}
                            title={isAdmin ? (isActive ? "Turno activo (Click para desactivar)" : "Turno inactivo (Click para activar)") : "Acceso Restringido: Desbloquee con el icono de escudo."}
                        >
                            <span style={{ fontWeight: 'bold', color: isActive ? '#6e6e6e' : '#888888', minWidth: '45px' }}>
                                {/* Punto de color de estado */}
                                <span style={{ marginRight: '5px', color: isActive ? '#4caf50' : '#727272' }}>●</span>
                                {s.label}:
                            </span>
                            <div className="progress-bar-container-shift" style={{ width: '100px', flexShrink: 0 }}>
                                <div className="progress-bar-shift" style={{ 
                                    // Priorizamos la meta del turno si existe, de lo contrario usamos la meta acumulada cuidando no dividir por cero
                                    width: (s.meta > 0 ? Math.min((s.value / s.meta) * 100, 100) : (accGoal > 0 ? Math.min((s.value / accGoal) * 100, 100) : 0)) + '%', 
                                    backgroundColor: deltaColor  
                                }}>
                                </div>
                            </div>
                            <strong style={{ minWidth: '25px', textAlign: 'center', color: '#333' }}>{s.value}</strong>
                        </div>
                    );
                })}
            </div>
        </div>
            <div className="progress-container">
                <div className="progress-bar-dashboard" style={{ width: `${displayValue}%`, backgroundColor: deltaColor  }}></div>
            </div>
        </div>
        
    );
};

export default Delta;