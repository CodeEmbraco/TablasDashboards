// React & Router
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

// Context & Hooks
import { useProduction } from '@context/ProductionContext';
import { useProductionMetrics } from '@hooks/useProductionMetrics';
import { useProductionData } from '@hooks/useProductionData';
import { useLocalLineConfig } from "@hooks/useLocalLineConfig.js";
import { useAdmin } from '@hooks/useAdmin';

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
import GoalsModal from "@components/Modals/GoalsModal";
import AdminTimer from "@components/Admin/AdminTimer";
import AdminAccessButton from "@components/Admin/AdminAccessButton";

// Estilos
import '@styles/global.css';

const TablaEnsamble = () => {
    const { selectedDate, selectedShift, setSelectedDate, setSelectedShift } = useProduction();
    const lineConfig = LINES_CONFIG.preensamble;

    // const { config, setMealHour, toggleShift} = useLocalLineConfig(lineConfig.id, lineConfig.defaultMeta);
    const { config, setMealHour} = useLocalLineConfig(lineConfig.id, lineConfig.defaultMeta);

    // Estado para la configuración dinámica recuperada de la base de datos
    const [dynamicConfig, setDynamicConfig] = useState({
        name: "",
        supervisors: [],
        leaders: []
    });

    // Carga de configuración dinámica (Nombre de línea y Personal)
    useEffect(() => {
        const fetchLineInfo = async () => {
            try {
                const data = await productionService.getLinesConfig(lineConfig.id);
                if (data && data.length > 0) {
                    setDynamicConfig({
                        name: data[0].Nombre,
                        supervisors: [...new Set(data.filter(d => d.Rol?.toLowerCase() === 'supervisor').map(d => d.Trabajador))],
                        leaders: [...new Set(data.filter(d => d.Rol?.toLowerCase() === 'team leader' || d.Rol?.toLowerCase() === 'lider').map(d => d.Trabajador))]
                    });
                }
            } catch (err) {
                console.error("Error al cargar configuración de línea:", err);
            }
        };
        fetchLineInfo();
    }, [lineConfig.id]);

    const apiConfig = useMemo(() => ({
        // Agregamos el argumento 'ln' (lineNo) a cada función para que el hook pueda pasarlo
        getHourData: (date, shift, ln) => productionService.getHourlyData(lineConfig.id, date, shift, ln),
        getTotalShift: (date, shift, ln) => productionService.getTotalShift(lineConfig.id, date, shift, ln),
        getTotalShiftDelta: (date, ln) => productionService.getTotalShiftDelta(lineConfig.id, date, ln),
        getReport: (date, shift, ln) => productionService.getLossReports(lineConfig.id, date, shift, ln),
        postReport: (reportData, ln) => productionService.saveReport(lineConfig.id, reportData, ln),
        getTotalDate: (date, ln) => productionService.getTotalDate(lineConfig.id, date, ln),
        getShiftsStatus: (date, ln) => productionService.getShiftsStatus(lineConfig.id, date, ln),
        postShiftToggle: (date, shift, shiftStatus, ln) => productionService.shiftToggleStatus(lineConfig.id, date, shift, shiftStatus, ln)      
    }), [lineConfig.id]);

const { 
        tableItems, 
        totalDia,  
        totalTurno,
        totalDelta,
        metaTurnoDB,
        metaProgresiva,
        shiftsStatus,
        loading, 
        error, 
        toggleShiftDB,
        saveLocalLoss,
        saveReportToDB,
        fetchAll
    } = useProductionData(selectedDate, selectedShift, lineConfig.defaultMeta, apiConfig);

// Calculamos métricas específicas para el turno actual (lo que ven los Widgets)
    const turnMetrics = useProductionMetrics(
        totalTurno,       // Usar totalTurno para reflejar la eficiencia del turno actual
        config,           // localConfig
        metaTurnoDB,      // dbMetaTurno
        [],               // allShiftsData
        shiftsStatus      // Proveer el estatus real de los turnos desde la base de datos
    );
    
    // Calculamos métricas globales para el día completo (lo que ve el componente Delta)
    const dayMetrics = useProductionMetrics(
        totalDia,         // Valor real acumulado del día
        config,           // localConfig
        null,             // Pasar null para obligar a calcular el acumulado diario progresivo
        [],               // allShiftsData
        shiftsStatus      // Proveer el estatus real de los turnos desde la base de datos
    );

    //-----
    //DEBUG
    // console.log("Prodction Data:\n", tableItems, totalDia, totalTurno, turnoDelta);
    // console.log("Production Metrics:\n", metaAcumulada, metaTotalAcumulada, eficiencia, status);
    //console.log("metaTurnoDB:",metaTurnoDB)
    //-----

    // 5. Estados de Interfaz (UI)
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [isLossModalOpen, setIsLossModalOpen] = useState(false);
    const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
    const { isAdmin, handleUnlock, handleExpire, adminWarning, showWarning } = useAdmin();
    const [currentLossSlot, setCurrentLossSlot] = useState(null);
    const [supervisor, setSupervisor] = useState('0');
    const [lider, setLider] = useState('0');

    // Efecto para sincronizar Supervisor y Líder cuando se cargan datos guardados de la DB
    useEffect(() => {
        if (tableItems && tableItems.length > 0) {
            // Buscamos si algún item tiene información de supervisor/líder
            const savedData = tableItems.find(item => item.SUPERVISOR && item.SUPERVISOR !== '0');
            if (savedData) {
                setSupervisor(savedData.SUPERVISOR);
                setLider(savedData.LIDER);
            } else {
                setSupervisor('0');
                setLider('0');
            }
        }
    }, [tableItems, selectedShift]);

    // 6. Manejadores de Eventos

    const handleSaveFromModal = (totalMins, formattedObs, detailsArray) => {
        saveLocalLoss(currentLossSlot, totalMins, formattedObs, detailsArray);
        setIsLossModalOpen(false);
    };

    const handleSaveGoals = async (data) => {
        try {
            if (data.metaCustom) {
                await productionService.updateCustomGoal(
                    lineConfig.id, 
                    selectedDate, 
                    data.turno, 
                    data.hora, 
                    data.nuevaMeta, 
                    'Admin' // Usuario por defecto
                );
            } else if (data.metaDefaultHora) {
                await productionService.updateDefaultGoalTimeSlot(
                    lineConfig.id, 
                    data.hora, 
                    data.nuevaMeta
                );
            } else if (data.metaDefaultTurno) {
                await productionService.updateDefaultGoalShift(
                    lineConfig.id, 
                    data.turno, 
                    data.nuevaMeta
                );
            }
            alert("¡Meta actualizada con éxito!");
            fetchAll(); // Recargar datos de la tabla
        } catch (err) {
            alert("Error al intentar actualizar la meta.");
        }
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

 // Renderizado alternativo SÓLO si es la primera carga y no hay datos en absoluto
    if (loading && tableItems.length === 0) {
        return <div className="loading-screen"><p>Cargando información de producción</p></div>;
    }

    return (
        <div className="bodyTabla">
            {/* NOTIFICACIONES DISCRETAS (FLOTANTES) */}
            {loading && (
                <div className="discreet-notification loading-toast">
                    <span className="spinner-mini"></span> Sincronizando datos...
                </div>
            )}
            
            {error && (
                <div className="discreet-notification error-toast">
                    ⚠️ Conexión inestable. Mostrando datos locales.
                </div>
            )}

            {/* TOAST DE ACCESO DENEGADO */}
            {adminWarning && (
                <div className="discreet-notification warning-toast">
                    ⚠️ {adminWarning}
                </div>
            )}

            {/* NOTIFICACIÓN DE EXPIRACIÓN ADMIN */}
            {isAdmin && <AdminTimer onExpire={handleExpire} />}

            <Header line={dynamicConfig.name || 'Cargando...'}/>

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
                                            {dynamicConfig.supervisors.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Team Leader:</td>
                                    <td>
                                        <select value={lider} onChange={(e) => setLider(e.target.value)}>
                                            <option value="0" disabled>--Selecciona--</option>
                                            {dynamicConfig.leaders.map(l => <option key={l} value={l}>{l}</option>)}
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
                    percent={turnMetrics.eficiencia}
                    statusClass={turnMetrics.status} 
                    goal={turnMetrics.metaAcumulada}
                    real={totalTurno} 
                    losses={tableItems.reduce((acc, item) => acc + item.MINUTOS_PERDIDA, 0)} 
                    enableAnimation={true}
                /> 

                <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                    <Delta 
                        total={totalDia} 
                        accGoal={dayMetrics.metaTotalAcumulada} 
                        status={dayMetrics.status}
                        totalTurno={totalDelta}
                        eficiencia={dayMetrics.eficiencia}
                        activeShifts={shiftsStatus}
                        onToggleShift={toggleShiftDB}
                        isAdmin={isAdmin}
                        onAccessDenied={showWarning}
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
                onSetMeal={setMealHour}
            />

            <div className="div-btn-guardar">
                <AdminAccessButton 
                    isAdmin={isAdmin} 
                    onUnlock={handleUnlock} 
                />
                <button 
                    className="btnCambiarMeta" 
                    onClick={() => isAdmin ? setIsGoalsModalOpen(true) : showWarning("Acceso Restringido: Desbloquee con el escudo.")}
                    style={{ opacity: isAdmin ? 1 : 0.6 }}
                >
                    Ajustar Meta
                </button>
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

            <GoalsModal 
                isOpen={isGoalsModalOpen}
                onClose={() => setIsGoalsModalOpen(false)}
                onSave={handleSaveGoals}
            />

            <Footer/>
        </div>
    );
}

export default TablaEnsamble;