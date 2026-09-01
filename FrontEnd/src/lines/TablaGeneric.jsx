// React & Router
import React, { useState, useMemo, useEffect } from "react";
import { useParams } from 'react-router-dom';

// Context & Hooks
import { useProduction } from '@context/ProductionContext';
import { useProductionMetrics } from '@hooks/useProductionMetrics';
import { useProductionData } from '@hooks/useProductionData';
import { useLocalLineConfig } from "@hooks/useLocalLineConfig.js";
import { useAdmin } from '@hooks/useAdmin';

// Configuración de Líneas
import { LINES_CONFIG } from '@config/linesConfig';

// Services
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

/**
 * TablaGeneric
 * Componente genérico de tabla de producción.
 * Consolida la lógica duplicada de TablaCDU, TablaElectronics, TablaEnsamble,
 * TablaThermo, TablaECMFAN y TablaInsinkerator en un único componente reutilizable.
 *
 * @param {string} lineConfigKey - Clave del objeto LINES_CONFIG (ej: "cdu", "electronics", "insinkerator")
 *
 * Los archivos originales por línea permanecen como fallback sin modificaciones.
 */
const TablaGeneric = ({ lineConfigKey }) => {
    const { selectedDate, selectedShift, setSelectedDate, setSelectedShift } = useProduction();

    // Obtener la configuración de línea de manera dinámica
    const lineConfig = LINES_CONFIG[lineConfigKey];

    // Estado de sublinea: solo activo cuando la línea tiene hasSubLines: true (ej: Insinkerator)
    const hasSubLines = lineConfig?.hasSubLines === true;
    const [lineNo, setLineNo] = useState(1);

    const { config, setMealHour } = useLocalLineConfig(lineConfig?.id, lineConfig?.defaultMeta);

    // Estado para la configuración dinámica recuperada de la base de datos
    const [dynamicConfig, setDynamicConfig] = useState({
        name: "",
        supervisors: [],
        leaders: []
    });

    // Carga de configuración dinámica (Nombre de línea y Personal)
    useEffect(() => {
        if (!lineConfig?.id) return;
        const fetchLineInfo = async () => {
            try {
                const data = await productionService.getLinesConfig(lineConfig.id);
                if (data && data.LineId) {
                    setDynamicConfig({
                        name: data.Nombre || lineConfig.id,
                        supervisors: data.Supervisores.map(s => ({
                            id: String(s.PersonalId),
                            name: s.Nombre
                        })),
                        leaders: data.Lideres.map(l =>({
                            id: String(l.PersonalId),
                            name: l.Nombre
                        }))
                    });
                }
            } catch (err) {
                console.error("Error al cargar configuración de línea:", err);
            }
        };
        fetchLineInfo();
    }, [lineConfig?.id]);

    const apiConfig = useMemo(() => ({
        getDailyProduction: (date) => productionService.getDailyProduction(lineConfig.id, date),
        syncParentLoss: (date, hour, mins) => productionService.syncParentLoss(lineConfig.id, date, hour, mins),
        addLossDetail: (lossId, detail) => productionService.addLossDetail(lossId,detail),
        deleteLossDetail: (detailId) => productionService.deleteLossDetail(detailId),
        getShiftsStatus: (date) => productionService.getShiftsStatus(lineConfig.id, date),
        postShiftToggle: (date, shift, shiftStatus) => productionService.shiftToggleStatus(lineConfig.id, date, shift, shiftStatus)
    }), [lineConfig?.id]);

    const {
        tableItems,
        totalDia,
        totalTurno,
        totalDelta,
        shiftsStatus,
        loading,
        error,
        toggleShiftDB,
        isSaving,
        deleteLossDetail,
        saveLossRealTime,
        fetchAll
    } = useProductionData(lineConfig.id,selectedDate, selectedShift, lineConfig?.defaultMeta, apiConfig);

    const metrics = useProductionMetrics(
        tableItems,
        totalDelta,
        shiftsStatus,
        totalTurno,
        totalDia,
        selectedDate,
        selectedShift
    );

    const turnMetrics = metrics.turno;
    const dayMetrics = metrics.dia;

    // Estados de Interfaz (UI)
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [isLossModalOpen, setIsLossModalOpen] = useState(false);
    const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
    const { isAdmin, handleUnlock, handleExpire, adminWarning, showWarning } = useAdmin();
    const [currentLossSlot, setCurrentLossSlot] = useState(null);
    const [supervisor, setSupervisor] = useState('0');
    const [lider, setLider] = useState('0');

    // Efecto para sincronizar Supervisor y Líder cuando se cargan datos guardados de la DB
    useEffect(() => {
        if (dynamicConfig && dynamicConfig.length > 0) {
            const savedData = dynamicConfig.find(item => item.Supervisores && item.Supervisores !== '0');
            if (savedData) {
                setSupervisor(savedData.SUPERVISOR);
                setLider(savedData.LIDER);
            } else {
                setSupervisor('0');
                setLider('0');
            }
        }
    }, [tableItems, selectedShift, ...(hasSubLines ? [lineNo] : [])]);

    // Manejadores de Eventos
    const handleSaveFromModal = (totalMins, detailsArray) => {
        saveLossRealTime(currentLossSlot, totalMins, detailsArray);
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
                    'Admin',
                    ...(hasSubLines ? [lineNo] : [])
                );
            } else if (data.metaDefaultHora) {
                await productionService.updateDefaultGoalTimeSlot(
                    lineConfig.id,
                    data.hora,
                    data.nuevaMeta,
                    ...(hasSubLines ? [lineNo] : [])
                );
            } else if (data.metaDefaultTurno) {
                await productionService.updateDefaultGoalShift(
                    lineConfig.id,
                    data.turno,
                    data.nuevaMeta,
                    ...(hasSubLines ? [lineNo] : [])
                );
            }
            alert("¡Meta actualizada con éxito!");
            fetchAll();
        } catch (err) {
            alert("Error al intentar actualizar la meta.");
        }
    };

    // Guardia: config inválida (lineConfigKey no encontrado en LINES_CONFIG)
    if (!lineConfig) {
        return (
            <div className="loading-screen">
                <p>Línea de producción no encontrada: <strong>{lineConfigKey}</strong></p>
            </div>
        );
    }

    // Renderizado alternativo SÓLO si es la primera carga y no hay datos en absoluto
    if (loading && tableItems.length === 0) {
        return <div className="loading-screen"><p>Cargando información de producción</p></div>;
    }

    // Título del header: si tiene sublineas, agrega el número de linea
    const headerTitle = hasSubLines
        ? `${dynamicConfig.name || 'Cargando...'} - L${lineNo}`
        : (dynamicConfig.name || 'Cargando...');

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

            {/* TOAST DE SINCRONIZACION DE PERDIDAS */}
            {isSaving && (
            <div className="discreet-notification loading-toast" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', borderLeftColor: '#4caf50' }}>
                <span className="spinner-mini" style={{ borderLeftColor: '#2e7d32' }}></span> 
                Guardando información...
            </div>
            )}

            {/* NOTIFICACIÓN DE EXPIRACIÓN ADMIN */}
            {isAdmin && <AdminTimer onExpire={handleExpire} />}

            <Header line={headerTitle} />

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
                                            {dynamicConfig.supervisors.map(s => (
                                                <option key={typeof s === 'object' ? s.id : s} value={typeof s === 'object' ? s.id : s}>
                                                    {typeof s === 'object' ? s.name : s}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Team Leader:</td>
                                    <td>
                                        <select value={lider} onChange={(e) => setLider(e.target.value)}>
                                            <option value="0" disabled>--Selecciona--</option>
                                            {dynamicConfig.leaders.map(l => (
                                                <option key={typeof l === 'object' ? l.id : l} value={typeof l === 'object' ? l.id : l}>
                                                    {typeof l === 'object' ? l.name : l}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>

                                {/* Selector de sublinea: solo visible cuando hasSubLines === true */}
                                {hasSubLines && (
                                    <tr>
                                        <td>N°:</td>
                                        <td>
                                            <select value={lineNo} onChange={(e) => setLineNo(parseInt(e.target.value))}>
                                                <option value={1}>{dynamicConfig.name || lineConfig.id} 1</option>
                                                <option value={2}>{dynamicConfig.name || lineConfig.id} 2</option>
                                            </select>
                                        </td>
                                    </tr>
                                )}

                                <tr>
                                    <td>Línea:</td>
                                    <td><LineSelector currentLineId={lineConfig.id} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                </div>

                <ProductionWidgets
                    percent={turnMetrics.eficiencia}
                    statusClass={dayMetrics.status}
                    goal={turnMetrics.metaAcumulada}
                    real={totalTurno}
                    losses={tableItems.reduce((acc, item) => acc + item.MINUTOS_PERDIDA, 0)}
                    enableAnimation={true}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            </div>

            {/* MODALES */}
            <Manual isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />

            <LossModal
                isOpen={isLossModalOpen}
                onClose={() => setIsLossModalOpen(false)}
                onSave={handleSaveFromModal}
                onDeleteDetail={deleteLossDetail}
                currentSlot={currentLossSlot}
                initialData={tableItems.find(i => (i.TIME_SLOT ?? i.time_slot) === currentLossSlot)?.DETALLES || []}
                perdidaCalculada={tableItems.find(i => (i.TIME_SLOT ?? i.time_slot) === currentLossSlot)?.PERDIDA_CALCULADA || 0}
            />

            <GoalsModal
                isOpen={isGoalsModalOpen}
                onClose={() => setIsGoalsModalOpen(false)}
                onSave={handleSaveGoals}
            />

            <Footer />
        </div>
    );
};

export default TablaGeneric;

/**
 * TablaGenericRouter
 * Wrapper para usar TablaGeneric con React Router dynamic params.
 * Uso en App.jsx:
 *   <Route path="/tabla/:lineId" element={<TablaGenericRouter />} />
 *
 * Ejemplos de URLs:
 *   /tabla/cdu          → equivalente a /TablaCDU
 *   /tabla/electronics  → equivalente a /TablaElectronics
 *   /tabla/preensamble  → equivalente a /TablaEnsamble
 *   /tabla/insinkerator → equivalente a /TablaInsin (con selector L1/L2)
 */
export const TablaGenericRouter = () => {
    const { lineId } = useParams();
    return <TablaGeneric lineConfigKey={lineId} />;
};
