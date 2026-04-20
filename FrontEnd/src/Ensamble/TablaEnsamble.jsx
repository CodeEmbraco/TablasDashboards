//React
import React from "react";
import { useState, useEffect, useCallback } from 'react'; 
import { useNavigate } from 'react-router-dom';
//Context
import { useProduction } from '@context/ProductionContext';
import { useProductionMetrics } from '@context/useProductionMetrics';
//Componentes
import Footer from '@components/Footer/footer';
import Manual from '@components/Manual/manual';
import Header from '@components/Header/Header';
import LineSelector from '@components/LineSelector/LineSelector';
import ProductionWidgets from '@components/ProductionWidgets/ProductionWidgets';
import ZeroBien from '@assets/ZeroBien.png';
import ZeroMal from '@assets/ZeroMal.png';
//Utils
import { 
  getFormattedDate, 
  getCurrentShift, 
  generateHourSlots, 
  getMetaPorHoraIndividual 
} from '@utils/dateUtils';
import {
    calcularMetaDiaAcumulada,
    calculateShiftMeta,
} from '@utils/shiftUtils';
//Estilos
import './TablaEnsamble.css'
//API
import { 
    PREENSAMBLE_API,
    preEnsam_totalPorFechaYTurno,
    preEnsam_totalPorFecha,
    preEnsam_consultaPorHora,
    preEnsam_guardarReporte,
    preEnsam_consultarReporte
 } from './apiEnsamble.js';
// LIBRERIAS VISUALES
import GaugeChart from 'react-gauge-chart'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

//* Desarrollado por Jorge Barrón y Sean Garcia

let isFormNotNull = true;
//*Prueba de endpoint para extraer la informacion
/*  
const prueba = await PREENSAMBLE_API();
console.log("ENDPOINT PRE-ENSAMBLE\n"
            ,"PRE-ENSAMBLE COUNTER:", prueba.COUNTER 
            ,"\nPRE-ENSAMBLE PRODUCT_ID:\t", prueba.PRODUCT_ID);
*/

const TablaEnsamble = () => {
    const navigate = useNavigate(); 
    const [data, setData] = useState([]); 
    const [dataHour, setDataHour] = useState([]);
    const [total, setTotal] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modeloActual, setModeloActual] = useState('');
    const [selectedDate, setSelectedDate] = useState(getFormattedDate());
    const [selectedShift, setSelectedShift] = useState(getCurrentShift());
    const [isManualOpen, setIsManualOpen] = useState(false); 
    
    
    // Estado para Hora y Minuto actuales (para la lógica de pasos)
    const [currentClientHour, setCurrentClientHour] = useState(new Date().getHours());
    const [currentClientMinute, setCurrentClientMinute] = useState(new Date().getMinutes());
    
    // ESTADOS DE DATOS
    const [totalTurno, setTotalTurno] = useState([]);
    const [breakdown, setBreakdown] = useState({ t3: 0, t1: 0, t2: 0 }); 

    const [metaPorHora, setMetaPorHora] = useState(350);
    const [enableAnimation, SetEnableAnimation]= useState(true);
    
    // Modales
    const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
    const [tempMetaInput, setTempMetaInput] = useState(24);
    const [isLossModalOpen, setIsLossModalOpen] = useState(false);
    const [currentLossSlot, setCurrentLossSlot] = useState(null);
    const [tempLossList, setTempLossList] = useState([]); 
    
    // Inputs Modal
    const [newLossMotivo, setNewLossMotivo] = useState(''); 
    const [newLossMinutos, setNewLossMinutos] = useState('');
    const [newLossObs, setNewLossObs] = useState('');

    const [supervisor, setSupervisor] = useState('0'); 
    const [lider, setLider] = useState('0'); 
    
    const [editableData, setEditableData] = useState({});

    const hours = selectedShift !== '0' ? generateHourSlots(selectedShift) : [];

    const findRowData = (listaDatos, slotBuscado) => {
        if (!listaDatos || listaDatos.length === 0) 
        {
            console.log("found Item: UNDEFINED" );
            return undefined;
        }
        const foundItem = listaDatos.find(item => {
            const slotItem = item.time_slot || item.Hora_Slot || item.hora_slot || item.Hora;
            return slotItem === slotBuscado;
        });
        //console.log("found Item: ", foundItem);
        return foundItem;
    };

const consultarDatos = useCallback(async (fecha, turno, isPoll = false) => {
    if (!isPoll) setLoading(true);
    
    try {
        const [DATA_BY_HOUR, TOTAL_DIA, REPORTE_DIA, PROD_DIA_TURNO] = await Promise.all([
            preEnsam_consultaPorHora(fecha, turno),
            preEnsam_totalPorFecha(fecha),
            preEnsam_consultarReporte(fecha, turno),
            preEnsam_totalPorFechaYTurno(fecha)
            
        ]);
        //DATOS POR HORA
        setDataHour(DATA_BY_HOUR);
        console.log("=> Datos por hora: ", DATA_BY_HOUR);
        //DATO DEL TOTAL DE PRODUCCION EN EL DIA DE TODOS LOS TURNOS
        //console.log("==> Total del dia: ", TOTAL_DIA);
        setTotal(TOTAL_DIA);
        //DATO DE PRODUCCION DEL TURNO POR DIA
        //console.log("==> Produccion por turno: ", PROD_DIA_TURNO);
        setTotalTurno(PROD_DIA_TURNO);


        const initialEditable = {};
        const slotsEsperados = generateHourSlots(turno);
        
        slotsEsperados.forEach(slot => {
            initialEditable[slot] = { perdidas: 0, detalles: [] };
        });
        
        if (REPORTE_DIA && REPORTE_DIA.length > 0) {
            REPORTE_DIA.forEach(fila => {
                let slotKey = fila.time_slot;
                if (!initialEditable[slotKey] && initialEditable[slotKey + '0']) {
                    slotKey = slotKey + '0';
                }
                
                if (initialEditable[slotKey]) {
                    initialEditable[slotKey].perdidas += (fila.PERDIDAS || 0);
                    initialEditable[slotKey].detalles.push({
                        minutos: fila.PERDIDAS || 0,
                        observacion: fila.OBSERVACIONES || '',
                        motivo: fila.MOTIVO || '' 
                    });
                }
            });
            
            const headerInfo = REPORTE_DIA.find(i => i.SUPERVISOR);
            if (headerInfo) {
                setSupervisor(headerInfo.SUPERVISOR || '0');
                setLider(headerInfo.LIDER || '0');
            }
        } else {
            setSupervisor('0');
            setLider('0');
        }
        
        setEditableData(initialEditable); 
        
        if (!isPoll) setLoading(false);
        setError(null);
    } catch (err) {
        console.error("Error datos:", err);
        setError("Error en la carga de datos");
        setLoading(false);
    }
}, []); 

useEffect(() => {
    document.title = "Tabla de Producción Ensamble";
    if (selectedShift !== '0') { 
        consultarDatos(selectedDate, selectedShift, false);
    }
}, [selectedDate, selectedShift, consultarDatos]); 

useEffect(() => {
    let timerId;
    const POLLING_INTERVAL = 30 * 1000; 
    const isToday = selectedDate === getFormattedDate();
    const isPollingActive = isToday && selectedShift !== '0';

    const pollData = async () => {
        await consultarDatos(selectedDate, selectedShift, true);
        timerId = setTimeout(pollData, POLLING_INTERVAL); 
    };
    
    if (isPollingActive) {
        timerId = setTimeout(pollData, POLLING_INTERVAL);
    }

    return () => { if (timerId) clearTimeout(timerId); };
}, [selectedDate, selectedShift, consultarDatos]);

useEffect(() => {
    const timer = setTimeout(() => setEnableAnimation(false), 4000);
    return () => clearTimeout(timer);
}, []);

useEffect(() => {
    const timeUpdater = setInterval(() => {
        const now = new Date();
        setCurrentClientHour(now.getHours());
        setCurrentClientMinute(now.getMinutes());
    }, 50000); 
    return () => clearInterval(timeUpdater);
}, []);

    if (loading) return <p>Cargando datos...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

    const handleDateChange = (event) => setSelectedDate(event.target.value);
    const handleShiftChange = (event) => setSelectedShift(event.target.value);
    
    // Logica del modal
    const openLossModal = (timeSlot) => {
        const currentData = editableData[timeSlot] || { detalles: [] };
        setTempLossList([...(currentData.detalles || [])]);
        setCurrentLossSlot(timeSlot);
        setNewLossMinutos('');
        setNewLossObs('');
        setNewLossMotivo(''); 
        setIsLossModalOpen(true);
    };

    const closeLossModal = () => {
        setIsLossModalOpen(false);
        setCurrentLossSlot(null);
    };

    const addLossItem = () => {
        if(newLossMotivo == "") {alert("Debes ingresar el motivo"); isFormNotNull = false; return;}
        if (!newLossMinutos) { alert("Debes ingresar los minutos"); isFormNotNull = false; return; }
        const minutos = parseInt(newLossMinutos);
        if (minutos < 0) { alert("Los minutos no pueden ser negativos"); isFormNotNull = false; return; }
        
        const newItem = { 
            minutos: minutos, 
            observacion: newLossObs,
            motivo: newLossMotivo
        };
        setTempLossList([...tempLossList, newItem]);
        setNewLossMinutos('');
        setNewLossObs('');
        setNewLossMotivo('');
        isFormNotNull = true;
    };

    const removeLossItem = (index) => {
        const newList = [...tempLossList];
        newList.splice(index, 1);
        setTempLossList(newList);
    };

    const saveLossesFromModal = () => {
        if(!isFormNotNull) {alert("Favor de completar los campos"); return}
        const totalMinutos = tempLossList.reduce((sum, item) => sum + (parseInt(item.minutos) || 0), 0);
        setEditableData(prev => ({
            ...prev,
            [currentLossSlot]: {
                ...prev[currentLossSlot],
                perdidas: totalMinutos, 
                detalles: tempLossList  
            }
        }));
        closeLossModal();
    };

    const handleGuardar = async () => {
        if (selectedShift === '0' || supervisor === '0' || lider === '0') {
            alert('Por favor, llena todos los campos.');
            return;
        }
        
        const reportDataFlat = [];
        hours.forEach(timeSlot => {
            const rowData = editableData[timeSlot] || {};
            const detalles = rowData.detalles || [];
            let modeloHora = getModeloPorHora(timeSlot); console.log(modeloHora);
            if (detalles.length > 0) {
                detalles.forEach(det => {
                    if (det.minutos > 0 || (det.observacion && det.observacion.trim() !== '')) {
                        reportDataFlat.push({
                            Fecha: selectedDate, Turno: selectedShift, Hora_Slot: timeSlot,
                            Supervisor: supervisor, Lider: lider, Modelo: modeloHora,
                            Perdidas: det.minutos, Observaciones: det.observacion,
                            Motivo: det.motivo 
                        });
                    }
                });
            } else {
                 reportDataFlat.push({
                    Fecha: selectedDate, Turno: selectedShift, Hora_Slot: timeSlot,
                    Supervisor: supervisor, Lider: lider, Modelo: modeloHora,
                    Perdidas: 0, Observaciones: '', Motivo: ''
                });
            }
            // console.log(reportDataFlat);
        });

        if (reportDataFlat.length === 0) {
            alert('No hay datos válidos para guardar.');
            return;
        }

        try {
            //console.log("Form Final:\n",reportDataFlat);
            let request = await preEnsam_guardarReporte(reportDataFlat);
            alert('Guardado exitosamente!\n', request.message);
            consultarDatos(selectedDate, selectedShift); 
        } catch (err) {
            console.error("Error al guardar:", err);
            alert('Error al guardar.');
        }
    };
    
    // --- LÓGICA DE VISUALIZACIÓN ---
    const getMetaValue = (timeSlot) => {
        const startHour = parseInt(timeSlot.split(':')[0], 10);
        return getMetaPorHoraIndividual(startHour, selectedShift, metaPorHora);
    };
    
    const getRealValue = (timeSlot) => {
        const slotStartHour = parseInt(timeSlot.split(':')[0], 10);
        const rowData = findRowData(dataHour, slotStartHour);
        const realValue = rowData ? (rowData.ProduccionTotal || 0) : 0;
        const isToday = selectedDate === getFormattedDate();
        if (realValue === 0 && isToday) {
            if (slotStartHour === currentClientHour) return '##';
            if (slotStartHour > currentClientHour) return 0; 
        }
        return realValue; 
    };
    
    const getModeloPorHora = (timeSlot) => {
        const slotStartHour = parseInt(timeSlot.split(':')[0], 10);
        const rowData = findRowData(dataHour, slotStartHour);
        return rowData ? (rowData.Modelo || rowData.modelo || rowData.Modelos || '') : '';
    };

    const openMetaModal = () => { setTempMetaInput(metaPorHora); setIsMetaModalOpen(true); };
    const closeMetaModal = () => setIsMetaModalOpen(false);
    const confirmNewMeta = () => {
        const val = parseInt(tempMetaInput);
        if (val > 0) { setMetaPorHora(val); closeMetaModal(); }
        else { alert("Por favor ingresa un número válido mayor a 0"); }
    };

    

    

    // Cálculos Finales
    const totalMetaTurno = calculateShiftMeta(selectedShift, selectedDate, currentClientMinute, currentClientHour, metaPorHora);
    //console.log("data: ",total);
    // const totalReal = data.reduce((sum, item) => sum + parseFloat(item.piezas_reales || item.Piezas_Reales || item.Real || 0), 0);
    
    const totalReal = parseInt(total.TOTAL_DIA, 10);
    // console.log("-> total real",total.CONTADOR);
    const totalPerdidas = Object.values(editableData).reduce((sum, item) => sum + (parseInt(item.perdidas) || 0), 0);
    
    const rawPercentReal = totalMetaTurno > 0 ? (totalReal / totalMetaTurno) : 0;
    const chartPercentReal = Math.min(1, rawPercentReal);

    const metaDiaAcumulada = calcularMetaDiaAcumulada(selectedShift);
    
    //Estado del dia bueno y malo
    const diaStatusClass = total.TOTAL_DIA >= metaDiaAcumulada ? 'status-good' : 'status-bad';
    
    const percentDia = Math.min(100, (total.TOTAL_DIA / (metaDiaAcumulada || 1)) * 100);
    const delta = total.TOTAL_DIA - metaDiaAcumulada;
    const deltaSigno = delta > 0 ? "+" : ""; 
    const deltaColor = delta >= 0 ? "#388E3C" : "#D32F2F"; 

    return (
        <div className="bodyTablaEnsamble">
            <title>Productivity Chart</title>
            <Header line="PRE-ENSAMBLE"/>

            <div className="top-panel-container-ensamble">
                <div className="panel-left-ensamble">
                    <section className="datosGenerales-ensamble">
                        <table>
                            <tbody>
                                <tr>
                                    <td>Fecha:</td>
                                    <td><input type="date" value={selectedDate} onChange={handleDateChange} /></td>
                                </tr>
                                <tr>
                                    <td>Turno:</td>
                                    <td>
                                        <select value={selectedShift} onChange={handleShiftChange}>
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
                                            <option value="Hugo Zapata">Hugo Zapata</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Team Leader:</td>
                                    <td>
                                        <select value={lider} onChange={(e) => setLider(e.target.value)}>
                                            <option value="0" disabled>--Selecciona--</option>
                                            <option value="Eden Medellín">Eden Medellín</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Línea:</td>
                                    <td>
                                        <LineSelector currentLineId="preensam"/>
                                    </td>
                                </tr>
                            </tbody>
                        </table>          
                    </section>
                </div>

                <div className="panel-right-ensamble">
                    <div className="medidores-container-ensamble">
                        {/* <ProductionWidgets 
                        percent={chartPercentReal} 
                        goal={totalMetaTurno} 
                        real={totalReal} 
                        losses={totalPerdidas} 
                        enableAnimation="enableAnimation"/> 
                        */}
                        <div className="medidor-ensamble">
                            <h3>Meta</h3>
                            <div className="gauge-wrapper-ensamble">
                                <GaugeChart 
                                    id="gauge-meta" nrOfLevels={1} colors={["#1976D2"]} arcWidth={0.3} percent={1} 
                                    textColor="#333" needleColor="#b0b0b0" needleBaseColor="#b0b0b0" hideText={true} 
                                    animate={enableAnimation} 
                                />
                                <div className="gauge-value-text-ensamble">{totalMetaTurno}</div>
                            </div>
                        </div>
                        <div className="medidor-ensamble">
                            <h3>Real</h3>
                            <div className="gauge-wrapper-ensamble">
                                <GaugeChart 
                                    id="gauge-real" nrOfLevels={3} colors={["#EA4228", "#F5CD19", "#5BE12C"]} arcWidth={0.3} percent={chartPercentReal} 
                                    textColor="#333" needleColor="#333" needleBaseColor="#333" hideText={true}
                                    animate={enableAnimation} 
                                />
                                <div className="gauge-value-text-ensamble" style={{ color: totalReal >= totalMetaTurno ? '#388E3C' : '#333' }}>
                                    {totalReal}
                                </div>
                            </div>
                        </div>
                        <div className="medidor-ensamble">
                            <h3>Pérdidas</h3>
                            <div className="donut-wrapper-ensamble">
                                <CircularProgressbar 
                                    value={totalPerdidas} maxValue={totalMetaTurno || 100} text={`${totalPerdidas}`}
                                    styles={buildStyles({ textColor: "#D32F2F", pathColor: "#D32F2F", trailColor: "#eee", textSize: '30px', pathTransitionDuration: 0.5 })}
                                />
                            </div>
                        </div>

                        <div className="medidor-ensamble-card">
                            <div className={`card-total-dia-ensamble ${diaStatusClass}`}>
                                <div className="total-dia-content-wrapper">
                                    <div className="total-dia-left">
                                        <h4>Total Día</h4>
                                        <p className="total-dia-number-ensamble">
                                            {total.TOTAL_DIA} 
                                            <span style={{fontSize:'0.9rem', fontWeight:'normal', color:'#777'}}>/ {metaDiaAcumulada}</span>
                                        </p>
                                        <div className="delta-container" style={{color: deltaColor, fontWeight:'bold', fontSize:'1.1rem', marginTop:'5px'}}>
                                            Delta: {deltaSigno}{delta}
                                        </div>
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
                                </div>
                                <div className="progress-bar-container-ensamble">
                                    <div className="progress-bar-fill-ensamble" style={{ width: `${percentDia}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="medidor-ensamble-image">
                            <img 
                                src={diaStatusClass === 'status-good' ? ZeroBien : ZeroMal} 
                                alt="Estado de Producción" 
                                className="indicador-imagen-ensamble"
                            />
                        </div>

                    </div>
                </div>
            </div>

            <button 
                onClick={() => setIsManualOpen(true)}
                style={{ padding: '10px 20px', cursor: 'pointer' }}
                >
                📖 Ver Manual de Uso
            </button>
            <Manual isOpen={isManualOpen} onClose={() => setIsManualOpen(false)}/> 

            <section className="contenedorTabla-ensamble">
                <table className="tablaProduccion-ensamble">
                    <caption>INFORMACIÓN DE PRODUCCIÓN</caption>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Plan</th>
                            <th>Real</th>
                            <th>Modelo</th>
                            <th>Pérdidas</th>
                            <th>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hours.map((timeSlot, index) => {
                            const currentEditable = editableData[timeSlot] || {};
                            
                            const meta = getMetaValue(timeSlot);
                            const realValDisplay = getRealValue(timeSlot);
                            const realNum = parseFloat(realValDisplay);
                            const slotHour = parseInt(timeSlot.split(':')[0], 10);
                            const isToday = selectedDate === getFormattedDate();
                            const todayStr = getFormattedDate();

                            let cellClass = "";
                            let isPastHour = false;

                            if (selectedDate < todayStr) {
                                isPastHour = true;
                            } else if (isToday) {
                                if (slotHour < currentClientHour) {
                                    isPastHour = true;
                                }
                                if (selectedShift === '3' && slotHour === 23 && currentClientHour < 23) {
                                    isPastHour = true;
                                }
                            }

                            if (!isNaN(realNum) && realValDisplay !== '##' && realNum >= meta) {
                                cellClass = "celda-cumplida-ensamble";
                            } else if (isPastHour) {
                                cellClass = "celda-no-cumplida-ensamble";
                            }

                            const obsResumen = (currentEditable.detalles || []).map(d => d.observacion).filter(Boolean).join(' | ');

                            return (
                                <tr key={index}>
                                    <td>{timeSlot}</td>
                                    <td><b>{meta}</b></td>
                                    <td className={cellClass}><b>{realValDisplay}</b></td>
                                    <td style={{ fontSize: '0.75rem', color: '#555', whiteSpace: 'normal', maxWidth: '150px' }}>
                                        {getModeloPorHora(timeSlot)}
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            readOnly 
                                            className="input-loss-clickable-ensamble"
                                            style={{ width: '80px', textAlign: 'center', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
                                            value={currentEditable.perdidas > 0 ? `${currentEditable.perdidas} min` : ''}
                                            onClick={() => openLossModal(timeSlot)}
                                            placeholder="+"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            readOnly
                                            className="input-loss-clickable-ensamble"
                                            style={{ width: '90%', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
                                            value={obsResumen}
                                            onClick={() => openLossModal(timeSlot)}
                                            placeholder="Ver notas..."
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            <div className="div-btn-guardar-ensamble">
                <button className="btnCambiarMeta-ensamble" onClick={openMetaModal}>Ajustar Meta</button>
                <button className="btnGuardarTablaEnsamble" onClick={handleGuardar}>Guardar</button>
            </div>

            {isMetaModalOpen && (
                <div className="modal-overlay-ensamble">
                    <div className="modal-content-ensamble">
                        <h3>Definir Meta por Hora</h3>
                        <p>Ingresa la nueva cantidad:</p>
                        <input type="number" className="input-meta-modal-ensamble" value={tempMetaInput} onChange={(e) => setTempMetaInput(e.target.value)} />
                        <div className="modal-actions-ensamble">
                            <button className="btn-modal-cancel-ensamble" onClick={closeMetaModal}>Cancelar</button>
                            <button className="btn-modal-confirm-ensamble" onClick={confirmNewMeta}>Aceptar</button>
                        </div>
                    </div>
                </div>
            )}

            {isLossModalOpen && (
                <div className="modal-overlay-ensamble">
                    <div className="modal-content-large-ensamble">
                        <h3>Registro de Eventos: {currentLossSlot}</h3>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <table className="loss-list-table-ensamble">
                                <thead>
                                    <tr>
                                        <th style={{width: '80px'}}>Minutos</th>
                                        <th>Motivo</th>
                                        <th>Descripción / Observación</th>
                                        <th style={{width: '50px'}}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tempLossList.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={{fontWeight:'bold', color:'#D32F2F'}}>{item.minutos} min</td>
                                            <td>{item.motivo}</td>
                                            <td>{item.observacion}</td>
                                            <td><button className="btn-delete-loss-ensamble" onClick={() => removeLossItem(idx)}>X</button></td>
                                        </tr>
                                    ))}
                                    {tempLossList.length === 0 && (
                                        <tr><td colSpan="4" style={{textAlign:'center', color:'#999'}}>Sin eventos registrados</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="total-display-ensamble">
                            Total Pérdidas: {tempLossList.reduce((sum, item) => sum + (parseInt(item.minutos)||0), 0)} min
                        </div>
                        
                        <div className="add-loss-form-ensamble">
                            <div className="form-group-ensamble">
                                <label>Minutos:</label>
                                <input type="number" placeholder="0" style={{width: '80px'}} value={newLossMinutos} onChange={(e) => setNewLossMinutos(e.target.value)} />
                            </div>
                            
                            <div className="form-group-ensamble">
                                <label>Motivo:</label>
                                <select 
                                    style={{width: '150px', padding:'8px', borderRadius:'4px', border:'1px solid #ccc'}}
                                    value={newLossMotivo} 
                                    onChange={(e) => setNewLossMotivo(e.target.value)}
                                    //required
                                >
                                    <option value="" disabled>--Selecciona--</option>
                                    <option value="A1">A1 - Falla Mecánica</option>
                                    <option value="A2">A2 - Falla Eléctrica</option>
                                    <option value="A3">A3 - Neumática u otras</option>
                                    <option value="B1">B1 - Falta de Energía</option>
                                    <option value="B2">B2 - Falta de Aire Comprimido</option>
                                    <option value="B3">B3 - Falta de Vapor</option>
                                    <option value="C1">C1 - Falta de Material</option>
                                    <option value="C2">C2 - Falta de ...</option>
                                    <option value="D1">D1 - Hora de Comida</option>
                                    <option value="D2">D2 - Simulacro de Emergencia</option>
                                    <option value="E1">E1 - Falta de Operador</option>
                                    <option value="E2">E2 - Gymnastic</option>
                                    <option value="E3">E3 - Entrenamiento</option>
                                    <option value="E4">E4 - Baño</option>
                                    <option value="E5">E5 - Junta</option>
                                    <option value="F1">F1 - Cambio de Herramienta</option>
                                    <option value="F2">F2 - Changeover</option>
                                    <option value="F3">F3 - Cambio de Materia Prima</option>
                                    <option value="G1">G1 - Ajuste de Maquina</option>
                                    <option value="G2">G2 - Ajuste de Herramientas</option>
                                    <option value="H1">H1 - Paros Menores - Bloqueo</option>
                                    <option value="H2">H2 - Paros Menores - Starving</option>
                                    <option value="H3">H3 - Paros Menores - Inactivo</option>
                                    <option value="H4">H4 - Paros Menores - Fallo</option>
                                    <option value="I1">I1 - Perdida de Velocidad</option>
                                    <option value="J1">J1 - Scrap</option>
                                    <option value="J2">J2 - Re-Trabajo</option>
                                </select>
                            </div>

                            <div className="form-group-ensamble" style={{flex:1}}>
                                <label>Descripción:</label>
                                <input type="text" placeholder="Escribe la causa..." style={{width: '100%'}} value={newLossObs} onChange={(e) => setNewLossObs(e.target.value)} />
                            </div>
                            <button className="btn-add-loss-ensamble" onClick={addLossItem}>Agregar</button>
                        </div>

                        <div className="modal-actions-ensamble" style={{marginTop: '10px'}}>
                            <button className="btn-modal-cancel-ensamble" onClick={closeLossModal}>Cancelar</button>
                            <button className="btn-modal-confirm-ensamble" onClick={saveLossesFromModal}>Aceptar</button>
                        </div>
                    </div>
                    
                </div>
            )}
            
            <Footer></Footer>
        </div>

    );
}

export default TablaEnsamble;