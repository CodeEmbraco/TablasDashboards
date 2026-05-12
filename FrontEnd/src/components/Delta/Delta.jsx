import React from 'react';

const Delta = ({ total, accGoal, status, totalTurno, eficiencia, activeShifts = [], onToggleShift}) => {
    const deltaValue = total - accGoal;
    const deltaSign = deltaValue >= 0 ? "+" : "";
    const deltaColor = status === 'bueno' ? '#4caf50' : '#f44336';
    const displayValue = Math.min(Math.max(eficiencia,0), 100);
    
    
    const shifts = [
        {id: '3', label: 'T3', value: totalTurno[2].CONTADOR},
        {id: '1', label: 'T1', value: totalTurno[0].CONTADOR},
        {id: '2', label: 'T2', value: totalTurno[1].CONTADOR}
    ];

    console.log(shifts);

    return (
        <div className='medidor-card' style={{border: `3px solid ${deltaColor}`}}>
            <div className='total-dia-title'>TOTAL DÍA</div>
            <div className='total-dia-container'>
            <div style={{ flex: '1'}}>
                <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: deltaColor, lineHeight: '1' }}>
                    {total} <span style={{ fontSize: '1rem', color: '#888', fontWeight: 'normal' }}>/ {parseInt(accGoal)}</span>
                </div>
                <div style={{ 
                    fontSize: '1.3rem', 
                    fontWeight: 'bold', 
                    color: deltaColor, 
                    marginTop: '8px',
                    backgroundColor: `${deltaColor}40`,
                    padding: '2px 10px',
                    borderRadius: '20px',
                }}>
                    Delta: {deltaSign}{parseInt(deltaValue)}
                </div>
            </div>
            <div className='vertical-div'></div>
            <div className='total-dia-right-breakdown'>
                    {shifts.map((s) => {
                        const isActive = activeShifts.includes(s.id);
                        return (
                            <div 
                                key={s.id} 
                                onClick={() => onToggleShift(s.id)}
                                style={{ 
                                    display: 'flex', justifyContent: 'space-between', fontSize: '1rem',
                                    cursor: 'pointer', opacity: isActive ? 1 : 0.4,
                                    textDecoration: isActive ? 'none' : 'line-through' 
                                }}
                                title={isActive ? "Turno activo (Click para desactivar)" : "Turno inactivo (Click para activar)"}
                            >
                                <span style={{ fontWeight: 'bold', color: isActive ? '#6e6e6e' : '#f44336' }}>
                                    {/* Punto de color de estado */}
                                    <span style={{ marginRight: '5px', color: isActive ? '#4caf50' : '#f44336' }}>●</span>
                                    {s.label}:
                                </span>
                                <strong style={{ marginLeft: '10px', color: '#333' }}>{s.value}</strong>
                            </div>
                        );
                    })}
                </div>
        </div>
            <div className="progressBar-container">
                <div className="progressBar" style={{ width: `${displayValue}%`, backgroundColor: deltaColor  }}></div>
            </div>
        </div>
        
    );
};

export default Delta;