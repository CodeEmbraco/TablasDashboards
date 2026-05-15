// React & Router
import React, { useState, useMemo } from "react";
import { useNavigate } from 'react-router-dom';

// Context & Hooks
import { useProduction } from '@context/ProductionContext';
import { useProductionMetrics } from '@hooks/useProductionMetrics';
import { useProductionData } from '@hooks/useProductionData';
import { useLocalLineConfig } from "@hooks/useLocalLineConfig.js";

// Configuración de Líneas
import { LINES_CONFIG } from '@config/linesConfig';

//Services
import productionService from '@services/ProductionServices';

// Componentes Reutilizables
import Footer from '@components/Footer/footer';
import Manual from '@components/Manual/manual';
import Header from '@components/Header/Header';
import LineSelector from '@components/LineSelector/LineSelector';
import ProductionWidgets from '@components/ProductionWidgets/ProductionWidgets';
import ProductionTable from "@components/ProductionTable/ProductionTable";
import Delta from '@components/Delta/Delta';
import LossModal from "@components/Modals/LossModals";

// Estilos
import '@styles/global.css';

const TablaEnsamble = () => {
    const { selectedDate, selectedShift, setSelectedDate, setSelectedShift } = useProduction();
    const lineConfig = LINES_CONFIG.preensamble;

    const { config, setMealHour, setCustomMeta, toggleShift} = useLocalLineConfig(lineConfig.id, lineConfig.defaultMeta);

    const apiConfig = useMemo(() => ({
        // Agregamos el argumento 'ln' (lineNo) a cada función para que el hook pueda pasarlo
        getHourData: (date, shift, ln) => productionService.getHourlyData(lineConfig.id, date, shift, ln),
        getTotalShift: (date, shift, ln) => productionService.getTotalShift(lineConfig.id, date, shift, ln),
        getTotalShiftDelta: (date, ln) => productionService.getTotalShiftDelta(lineConfig.id, date, ln),
        getReport: (date, shift, ln) => productionService.getLossReports(lineConfig.id, date, shift, ln),
        postReport: (reportData, ln) => productionService.saveReport(lineConfig.id, reportData, ln),
        getTotalDate: (date, ln) => productionService.getTotalDate(lineConfig.id, date, ln)
    }), [lineConfig.id]);

const { 
        tableItems, 
        totalDia,  
        totalTurno,
        turnoDelta,
        loading, 
        error, 
        saveLocalLoss,
        saveReportToDB
    } = useProductionData(selectedDate, selectedShift, lineConfig.defaultMeta, apiConfig);

    const { metaAcumulada, metaTotalAcumulada, eficiencia, status } = useProductionMetrics(totalDia, config);

    // 5. Estados de Interfaz (UI)
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [isLossModalOpen, setIsLossModalOpen] = useState(false);
    const [currentLossSlot, setCurrentLossSlot] = useState(null);
    const [supervisor, setSupervisor] = useState('0');
    const [lider, setLider] = useState('0');

    // 6. Manejadores de Eventos
    const handleSaveFromModal = (totalMins, formattedObs, detailsArray) => {
        saveLocalLoss(currentLossSlot, totalMins, formattedObs, detailsArray);
        setIsLossModalOpen(false);
    };

    const handleGuardarEnDB = async () => {
        if (selectedShift === '0' || supervisor === '0' || lider === '0') {
            alert('Por favor, selecciona Supervisor y Líder antes de guardar.');
            return;
        }

        const reportDataFlat = [];
        tableItems.forEach(item => {
            if (item.DETALLES && item.DETALLES.length > 0) {
                item.DETALLES.forEach(det => {
                    reportDataFlat.push({
                        Fecha: selectedDate, Turno: selectedShift, Hora_Slot: item.TIME_SLOT,
                        Supervisor: supervisor, Lider: lider, Modelo: item.MODELO,
                        Perdidas: det.minutos, Observaciones: det.observacion, Motivo: det.motivo 
                    });
                });
            } else {
                reportDataFlat.push({
                    Fecha: selectedDate, Turno: selectedShift, Hora_Slot: item.TIME_SLOT,
                    Supervisor: supervisor, Lider: lider, Modelo: item.MODELO,
                    Perdidas: 0, Observaciones: '', Motivo: ''
                });
            }
        });

        try {
            await saveReportToDB(reportDataFlat); // Use the new function from the hook
            alert('¡Guardado exitosamente!');
            window.location.reload(); 
        } catch (err) {
            alert('Error al guardar en la base de datos.');
        }
    };

    if (loading) return <div className="loading-screen"><p>Cargando información de producción...</p></div>;
    if (error) return <div className="error-screen"><p>Error: {error}</p></div>;

    return (
        <div className="bodyTabla">
            <Header line={lineConfig.name}/>

            <div className="top-panel-container">
                <div className="panel-left">
                    <section className="datosGenerales">
                        <table>
                            <tbody>
                                <tr>
                                    <td>Fecha:</td>
                                    <td>
                                        <input 
                                            type="date" 
                                            value={selectedDate} 
                                            onChange={(e) => setSelectedDate(e.target.value)} 
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Turno:</td>
                                    <td>
                                        <select 
                                            value={selectedShift} 
                                            onChange={(e) => setSelectedShift(e.target.value)}
                                        >
                                            <option value="0" disabled>--Selecciona--</option>
                                            <option value="1">1</option>
                                            <option value="2">2</option>
                                            <option value="3">3</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Supervisor:</td>
                                    <td>
                                        <select value={supervisor} onChange={(e) => setSupervisor(e.target.value)}>
                                            <option value="0" disabled>--Selecciona--</option>
                                            {lineConfig.supervisors.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Team Leader:</td>
                                    <td>
                                        <select value={lider} onChange={(e) => setLider(e.target.value)}>
                                            <option value="0" disabled>--Selecciona--</option>
                                            {lineConfig.leaders.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Línea:</td>
                                    <td><LineSelector currentLineId={lineConfig.id}/></td>
                                </tr>
                            </tbody>
                        </table>          
                    </section>
                </div>

                <ProductionWidgets 
                    percent={eficiencia}
                    statusClass={status} 
                    goal={metaAcumulada} 
                    real={totalTurno} 
                    losses={tableItems.reduce((acc, item) => acc + item.MINUTOS_PERDIDA, 0)} 
                    enableAnimation={true}
                /> 

                <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                    <Delta 
                        total={totalDia} 
                        accGoal={metaTotalAcumulada} 
                        status={status}
                        totalTurno={turnoDelta}
                        eficiencia={eficiencia}
                        activeShifts={config.activeShifts}
                        onToggleShift={toggleShift}
                    />
                    <button onClick={() => setIsManualOpen(true)} className="btn-manual">Manual de Uso</button>
                </div>
            </div>

            <ProductionTable 
                items={tableItems}
                onOpenModal={(slot) => {
                    setCurrentLossSlot(slot);
                    setIsLossModalOpen(true);
                }}
                caption="INFORMACIÓN DE PRODUCCIÓN"
                localConfig={config} 
                onUpdateMeta={setCustomMeta}
                onSetMeal={setMealHour}
            />

            <div className="div-btn-guardar">
                {/*<button className="btnCambiarMeta" onClick={() => setIsMetaModalOpen(true)}>Ajustar Meta</button>*/}
                <button className="btnGuardarTabla" onClick={handleGuardarEnDB}>Guardar Reporte</button>
            </div>

            {/* MODALES */}
            <Manual isOpen={isManualOpen} onClose={() => setIsManualOpen(false)}/> 

            <LossModal
                isOpen={isLossModalOpen}
                onClose={() => setIsLossModalOpen(false)}
                onSave={handleSaveFromModal}
                currentSlot={currentLossSlot}
                initialData={tableItems.find(i => i.TIME_SLOT === currentLossSlot)?.DETALLES || []}
            />

            <Footer/>
        </div>
    );
}

export default TablaEnsamble;