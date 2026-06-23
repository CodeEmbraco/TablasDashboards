import React from 'react';
import zero from '@assets/zeroproductividad.png'

const Delta = ({ total,
    accGoal,
    totalTurno = [],
    eficiencia,
    activeShifts = [],
    onToggleShift,
    imgURL,
    isAdmin,
    onAccessDenied,
    isLarge
}) => {
    const deltaValue = total - accGoal;
    const deltaSign = deltaValue >= 0 ? "+" : "";

    // Lógica de color: Verde (>=100%), Amarillo (90-99%), Rojo (<90%)
    // Si no hay turnos activos, forzamos gris para no mostrar un estado "crítico" erróneo
    const hasActiveShifts = activeShifts.some(s => s.Activo || s.ACTIVO);
    
    // Si no hay turnos activos, O si la meta actual es 0 (el turno aún no empieza) -> Verde
    const deltaColor = (!hasActiveShifts || accGoal === 0) 
        ? '#4caf50' 
        : (eficiencia >= 100 ? '#4caf50' : (eficiencia >= 90 ? '#fbc02d' : '#ea5a00'));
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
        <>
        <div className='container-delta-dashboard' style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            // Damos más aire entre los elementos si es grande
            gap: isLarge ? '15px' : '0px' 
        }}>
            <div className='total-dia-delta-dashboard' style={{ flex: 1 }}>
                <div>
                    <div className='total-dia-title' style={{ fontSize: isLarge ? '1.5rem' : '1rem' }}>
                        TOTAL DÍA
                    </div>
                    {/* El número principal crece drásticamente */}
                    <div style={{ 
                        fontSize: isLarge ? '4.5rem' : '3.5rem', 
                        fontWeight: 'bold', 
                        color: deltaColor, 
                        lineHeight: '1',
                        transition: 'font-size 0.4s ease'
                    }}>
                        {total}
                        {/* La meta también crece en proporción */}
                        <span style={{ 
                            fontSize: isLarge ? '2.0rem' : '1.5rem', 
                            color: '#888', 
                            fontWeight: 'normal',
                            transition: 'font-size 0.4s ease'
                        }}>
                            /{parseInt(accGoal)}
                        </span>
                    </div>
                    <p style={{fontWeight:'bolder', fontSize: isLarge ? '1.2rem' : '1rem', margin:'0px'}}>
                        Actual Rate (RPM)
                    </p>
                    <div className="total-dia-delta-text" style={{
                        color: deltaColor, 
                        backgroundColor: `${deltaColor}40`,
                        fontSize: isLarge ? '1.5rem' : '1rem',
                        padding: isLarge ? '8px' : '4px',
                        transition: 'all 0.4s ease'
                    }}>
                        Delta: {deltaSign}{parseInt(deltaValue)}
                    </div>
                </div>
            </div>

            <div className='total-dia-icon' style={{ 
                flex: 1, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center' 
            }}>
                {/* La imagen crece según isLarge */}
                <img 
                    src={imgURL ? imgURL : zero} 
                    alt="Line Icon"
                    fetchPriority="high"
                    style={{
                        width: '100%', 
                        maxWidth: isLarge ? 'auto' : '250px', 
                        height: 'auto', 
                        objectFit: 'contain',
                        alignItems:'center'
                    }}
                />
            </div>

            <div className='turnos-breakdown-dashboard-delta' style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {shifts.map((s) => {
                    const statusDB = activeShifts.find(shift => String(shift.Turno) === String(s.id));
                    const isActive = statusDB ? Boolean(statusDB.Activo) : true;

                    return (
                        <div 
                            key={s.id} 
                            onClick={() => isAdmin ? onToggleShift(s.id, isActive) : onAccessDenied("...")}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                fontSize: isLarge ? '1.5rem' : '1.3rem',
                                cursor: isAdmin ? 'pointer' : 'not-allowed', 
                                opacity: isActive ? 1 : 0.4,
                                textDecoration: isActive ? 'none' : 'line-through',
                                paddingBlock: isLarge ? '8px' : '3px',
                                transition: 'all 0.4s ease'
                            }}
                        >
                            <span style={{ fontWeight: 'bold', color: isActive ? '#6e6e6e' : '#888888', minWidth: '45px' }}>
                                <span style={{ marginRight: '5px', color: isActive ? '#4caf50' : '#727272' }}>●</span>
                                {s.label}:
                            </span>
                            <div className="progress-bar-container-shift" style={{ 
                                width: isLarge ? '150px' : '100px', 
                                flexShrink: 0,
                                transition: 'width 0.4s ease'
                            }}>
                                <div className="progress-bar-shift" style={{ 
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
        <div className="progress-container" style={{ marginTop: isLarge ? '20px' : '10px' }}>
            <div className="progress-bar-dashboard" style={{ width: `${displayValue}%`, backgroundColor: deltaColor }}></div>
        </div>
        </>
    );
};

export default Delta;