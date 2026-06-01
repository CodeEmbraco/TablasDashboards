import React from 'react';
import { LINES_CONFIG } from '@config/linesConfig'; 
import LineDeltaContainer from '@components/Dashboard/LineDeltaContainer'; 
import Header from '@components/Header/Header'; 
import Footer from '@components/Footer/footer'; 

const GlobalDashboard = () => {
    const lineasOriginales = Object.values(LINES_CONFIG);
    const lineasProcesadas = [];

    lineasOriginales.forEach((linea) => {
        // Validación robusta para Insinkerator
        if (linea.id.toLowerCase().includes('insi') || (linea.name && linea.name.toLowerCase().includes('insi'))) { 
            lineasProcesadas.push({
                ...linea,
                lineNo: 1,
                name: `${linea.name} - L1`
            });
            lineasProcesadas.push({
                ...linea,
                lineNo: 2,
                name: `${linea.name} - L2`
            });
        } else {
            lineasProcesadas.push({
                ...linea,
                lineNo: null
            });
        }
    });

    return (
        <div className="global-dashboard">
            <Header title="Dashboard Global de Producción" />
            
            <main className="dashboard-main-content">
                <div className="deltas-grid">
                    {lineasProcesadas.map((lineaConfig, index) => (
                        <div key={`${lineaConfig.id}_${lineaConfig.lineNo || '0'}_${index}`}>
                            <LineDeltaContainer lineConfig={lineaConfig} />
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default GlobalDashboard;