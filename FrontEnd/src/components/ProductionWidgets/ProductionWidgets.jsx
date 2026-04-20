//React
import React from 'react';
import GaugeChart from 'react-gauge-chart';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
//Assets
import ZeroBien from '@assets/ZeroBien.png'
import ZeroMal from '@assets/ZeroMal.png'

const ProductionWidgets = ({percent, statusClass, real, goal, losses, enableAnimation}) => {
    const statusImage = statusClass === 'bueno' ? ZeroBien : ZeroMal;
    return(
        <div className="medidores-container">
            <div className="medidor">
                <h3>Meta</h3>
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
                <h3>Real</h3>
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
            <div className="medidor">
                <h3>Pérdidas</h3>
                <div className="donut-wrapper">
                    <CircularProgressbar 
                        value={losses} maxValue={goal || 100} text={`${losses}`}
                        styles={buildStyles({ textColor: "#D32F2F", pathColor: "#D32F2F", trailColor: "#eee", textSize: '30px', pathTransitionDuration: 0.5 })}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProductionWidgets;