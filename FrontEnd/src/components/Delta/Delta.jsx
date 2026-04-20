import React from 'react';
import './Delta.css'

const Delta = (total, shiftTotal, accGoal, status, delta, deltaSign, dayPercent) =>{

    return (
    <div className="medidor-card">
        <div className={`card-total-dia ${status}`}>
            <div className="total-dia-content-wrapper">
                <div className="total-dia-left">
                    <h4>Total Día</h4>
                    <p className="total-dia-number">
                        {total.TOTAL_DIA} 
                        <span style={{fontSize:'0.9rem', fontWeight:'normal', color:'#777'}}>/ {accGoal}</span>
                    </p>
                    <div className="delta-container" style={{color: deltaColor, fontWeight:'bold', fontSize:'1.1rem', marginTop:'5px'}}>
                        Delta: {deltaSign}{delta}
                    </div>
                </div>
                <div className="total-dia-right-breakdown">
                    <div className="breakdown-item">
                        <span>T3:</span> <strong>{shiftTotal[2].CONTADOR}</strong>
                    </div>
                    <div className="breakdown-item">
                        <span>T1:</span> <strong>{shiftTotal[0].CONTADOR}</strong>
                    </div>
                    <div className="breakdown-item">
                        <span>T2:</span> <strong>{shiftTotal[1].CONTADOR}</strong>
                    </div>
                </div>
            </div>
            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${dayPercent}%` }}></div>
            </div>
        </div>
    </div>
    );
};

export default Delta;