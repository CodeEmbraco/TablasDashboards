// src/components/ProductionWidgets/ProductionWidgets.jsx
import React, { memo } from 'react';
import GaugeChart from 'react-gauge-chart'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import ZeroBien from '@assets/ZeroBien.png';
import ZeroMal from '@assets/ZeroMal.png';
import '@styles/global.css'

const ProductionWidgets = ({ percent, statusClass, real, goal, losses, enableAnimation }) => {
    const statusImage = statusClass === 'bueno' ? ZeroBien : ZeroMal;
    const lossesCircleValue = (( losses - 480)/480)*100 + 100;
    const GaugePercent = percent > 100 ? 100 : percent;

    //-------------------------------------------------------
    //DEBUG
    // console.log("lossesCircleValue - ",lossesCircleValue);
    //console.log("percent - ", percent);
    //-------------------------------------------------------
    return (
        <div className="medidores-container" >
            {/* Dona de Meta Acumulada */}
            <div className="medidor" >
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '5px' }}>META</div>
                <div className="gauge-wrapper">
                    <GaugeChart 
                        id="gauge-meta" nrOfLevels={1} colors={["#1976D2"]} arcWidth={0.3} percent={1} 
                        textColor="#333" needleColor="#b0b0b0" needleBaseColor="#b0b0b0" hideText={true} 
                        animate={enableAnimation} 
                    /> 
                    <div className='gauge-value-text'>{parseInt(goal)}</div>
                </div>
            </div>

            <div className="medidor">
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '5px' }}>REAL</div>
                <div className="gauge-wrapper">
                    <GaugeChart 
                        id="gauge-real" nrOfLevels={3} colors={["#EA4228", "#F5CD19", "#5BE12C"]} arcWidth={0.3} percent={GaugePercent/100} 
                        textColor="#333" needleColor="#333" needleBaseColor="#333" hideText={true}
                        animate={enableAnimation} 
                    />
                    <div className="gauge-value-text" style={{ color: real >= goal ? '#388E3C' : '#333' }}>
                        {real}
                    </div>
                </div>
            </div>

            {/* Dona de Pérdidas (en minutos) */}
            <div  className='donut-wrapper'>
                <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>PÉRDIDAS</span>
                <CircularProgressbar 
                    value={lossesCircleValue} 
                    text={`${losses}m`} 
                    styles={buildStyles({ pathColor: '#ff9800', textColor: '#333' })}
                />
            </div>

            <div style={{ textAlign: 'center' }}>
                {/* {console.log("statusClass ==> ", statusClass)} */}
                <img src={statusImage} alt="Status Indicator" style={{ width: '250px', transition: 'all 0.3s' }} />
                <div style={{ marginTop: '5px', fontWeight: 'bold', color: statusClass === 'bueno' ? '#4caf50' : '#f44336' }}>
                    {/* {statusClass === 'bueno' ? 'OBJETIVO CUMPLIDO' : 'BAJA EFICIENCIA'} */}
                </div>
            </div>

        </div>
    );
};

export default memo(ProductionWidgets);