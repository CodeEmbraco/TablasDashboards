import React from 'react';

const Delta = ({ total, accGoal, status, totalTurno, eficiencia}) => {
    const deltaValue = total - accGoal;
    const deltaSign = deltaValue >= 0 ? "+" : "";
    const deltaColor = status === 'bueno' ? '#4caf50' : '#f44336';

    return (
        <div style={{ border: `2px solid ${deltaColor}`, borderRadius: '12px', padding: '15px', textAlign: 'center', backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#555' }}>Delta</h2>
            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#333' }}>
                {total} <span style={{ fontSize: '1rem', color: '#888' }}>/ {accGoal}</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: deltaColor, marginTop: '5px' }}>
                Delta: {deltaSign}{deltaValue}
            </div>
            <div className="total-dia-right-breakdown">
                <div className="breakdown-item">
                    <span>T3:</span> <strong>{totalTurno[2].CONTADOR}</strong>
                </div>
                <div className="breakdown-item">
                    <span>T1:</span> <strong>{totalTurno[0].CONTADOR}</strong>
                </div>
                <div className="breakdown-item">
                    <span>T2:</span> <strong>{totalTurno[1].CONTADOR}</strong>
                </div>
            </div>
            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${eficiencia}%` }}></div>
            </div>
        </div>
        
    );
};

export default Delta;