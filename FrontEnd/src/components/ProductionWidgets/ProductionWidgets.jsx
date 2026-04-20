// src/components/ProductionWidgets/ProductionWidgets.jsx
import React from 'react';
import GaugeChart from 'react-gauge-chart'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import ZeroBien from '@assets/ZeroBien.png';
import ZeroMal from '@assets/ZeroMal.png';

const ProductionWidgets = ({ percent, statusClass, real, goal, losses, enableAnimation }) => {
    const statusImage = statusClass === 'bueno' ? ZeroBien : ZeroMal;

    return (
        <div className="medidores-container" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
            {/* Dona de Meta Acumulada */}
            <div className="medidor">
                <h2 className=''>META</h2>
                <div className="gauge-wrapper">
                    <GaugeChart 
                        id="gauge-meta" nrOfLevels={1} colors={["#1976D2"]} arcWidth={0.3} percent={1} 
                        textColor="#333" needleColor="#b0b0b0" needleBaseColor="#b0b0b0" hideText={true} 
                        animate={enableAnimation} 
                    /> 
                    <div className="gauge-value-text">{goal}</div>
                </div>
            </div>

            <div className="medidor">
                <h2 className=''>REAL</h2>
                <div className="gauge-wrapper">
                    <GaugeChart 
                        id="gauge-real" nrOfLevels={3} colors={["#EA4228", "#F5CD19", "#5BE12C"]} arcWidth={0.3} percent={percent} 
                        textColor="#333" needleColor="#333" needleBaseColor="#333" hideText={true}
                        animate={enableAnimation} 
                    />
                    <div className="gauge-value-text" style={{ color: real >= goal ? '#388E3C' : '#333' }}>
                        {real}
                    </div>
                </div>
            </div>

            {/* Dona de Pérdidas (en minutos) */}
            <div style={{ width: 120, textAlign: 'center' }}>
                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>PÉRDIDAS</span>
                <CircularProgressbar 
                    value={losses > 0 ? 100 : 0} 
                    text={`${losses}m`} 
                    styles={buildStyles({ pathColor: '#ff9800', textColor: '#333' })}
                />
            </div>

            <div style={{ textAlign: 'center' }}>
                <img src={statusImage} alt="Status Indicator" style={{ width: '110px', transition: 'all 0.3s' }} />
                <div style={{ marginTop: '5px', fontWeight: 'bold', color: statusClass === 'bueno' ? '#4caf50' : '#f44336' }}>
                    {/* {statusClass === 'bueno' ? 'OBJETIVO CUMPLIDO' : 'BAJA EFICIENCIA'} */}
                </div>
            </div>

        </div>
    );
};

export default ProductionWidgets;