// import { useState, useEffect, useCallback } from 'react'; 
// import React from "react";
// import { useNavigate } from 'react-router-dom';
// import './TablaRotorWet.css'
// import logoNidec from '../assets/nidec-logo.png'
// import axios from 'axios';
// import Zero from '../assets/zeroproductividad.png';
// import ZeroBien from '../assets/ZeroBien.png'; 
// import ZeroMal from '../assets/ZeroMal.png';

// // LIBRERIAS VISUALES
// import GaugeChart from 'react-gauge-chart'
// import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
// import 'react-circular-progressbar/dist/styles.css';

// const getFormattedDate = () => {
//     const date = new Date();
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, '0');
//     const day = String(date.getDate()).padStart(2, '0');
//     return `${year}-${month}-${day}`;
// };

// const SHIFT_HOURS = {
//     '1': [6, 14, 8],
//     '2': [14, 23, 9],
//     '3': [23, 6, 7],
// };

// const getCurrentShift = () => {
//     const now = new Date();
//     const currentHour = now.getHours(); 
//     if (currentHour >= 6 && currentHour < 14) return '1';
//     if (currentHour >= 14 && currentHour < 23) return '2';
//     if (currentHour >= 23 || currentHour < 6) return '3';
//     return '0'; 
// };

// const generateHourSlots = (shiftId) => {
//     const [start, end, totalHours] = SHIFT_HOURS[shiftId];
//     const slots = [];
//     let currentHour = start;
//     for (let i = 0; i < totalHours; i++) {
//         const nextHour = (currentHour + 1) % 24;
//         const startStr = String(currentHour).padStart(2, '0') + ':00';
//         const endStr = String(nextHour).padStart(2, '0') + ':00';
//         slots.push(`${startStr}-${endStr}`);
//         currentHour = nextHour;
//     }
//     return slots;
// };

// // Función auxiliar para saber la meta de una hora específica
// const getMetaPorHoraIndividual = (startHour, shiftId, metaBase) => {
//     if (shiftId === '1' && startHour === 10) return metaBase / 2;
//     if (shiftId === '2' && startHour === 18) return metaBase / 2;
//     if (shiftId === '3' && startHour === 3) return metaBase / 2; 
//     return metaBase;
// };

// const TablaProdRotorWet = () => {
//     const navigate = useNavigate(); 
//     const [data, setData] = useState([]); 
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [modeloActual, setModeloActual] = useState('');
//     const [selectedDate, setSelectedDate] = useState(getFormattedDate());
//     const [selectedShift, setSelectedShift] = useState(getCurrentShift()); 
    
//     // Estado para Hora y Minuto actuales
//     const [currentClientHour, setCurrentClientHour] = useState(new Date().getHours());
//     const [currentClientMinute, setCurrentClientMinute] = useState(new Date().getMinutes());
    
//     // ESTADOS DE DATOS
//     const [totalDia, setTotalDia] = useState(0);
//     const [breakdown, setBreakdown] = useState({ t3: 0, t1: 0, t2: 0 }); 

//     const [enableAnimation, setEnableAnimation] = useState(true);
//     const [metaPorHora, setMetaPorHora] = useState(408); 
    
//     // Modales
//     const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
//     const [tempMetaInput, setTempMetaInput] = useState(408);
    
//     // Modal Pérdidas (Lista)
//     const [isLossModalOpen, setIsLossModalOpen] = useState(false);
//     const [currentLossSlot, setCurrentLossSlot] = useState(null);
//     const [tempLossList, setTempLossList] = useState([]); 
    
//     // Inputs Modal 
//     const [newLossMotivo, setNewLossMotivo] = useState(''); 
//     const [newLossMinutos, setNewLossMinutos] = useState('');
//     const [newLossObs, setNewLossObs] = useState('');

//     const [supervisor, setSupervisor] = useState('0'); 
//     const [lider, setLider] = useState('0'); 
    
//     // Estructura de datos editables
//     const [editableData, setEditableData] = useState({});

//     const hours = selectedShift !== '0' ? generateHourSlots(selectedShift) : [];

//     const findRowData = (listaDatos, slotBuscado) => {
//         if (!listaDatos || listaDatos.length === 0) return undefined;
//         return listaDatos.find(item => item.time_slot === slotBuscado);
//     };

//     const handleLineChange = (event) => {
//         const val = event.target.value;
//         if (val === "0") { // 0 es CDU
//             navigate('/TablaCDU');
//         }else if(val === "1"){//1 es electronics
//             navigate('/Tabla');
//         }else if(val === "2"){//insinkerator
//             navigate('/TablaInsin');
//         }else if(val === "3"){//Rotor Wet
//             navigate('/TablaRotorWet');
//         }else if(val === "4"){//Rotor ISE
//             navigate('/TablaRotorIse');
//         }
//     };

//     const consultarDatos = useCallback(async (fecha, turno, isPoll = false) => {
//         if (!isPoll) setLoading(true);
        
//         try {
//             // Llamadas endpoints de Rotor Wet
//             const pTabla = axios.get(`http://10.13.225.20:3003/api/rotwet/produccion-real?fecha=${fecha}&turno=${turno}`);
//             const pTotal = axios.get(`http://10.13.225.20:3003/api/rotwet/total-dia?fecha=${fecha}`);
//             const pGuardado = axios.get(`http://10.13.225.20:3003/api/rotwet/reporte-guardado?fecha=${fecha}&turno=${turno}`);

//             // Esperamos que las 3 consultas terminen
//             const [resTabla, resTotal, resGuardado] = await Promise.all([pTabla, pTotal, pGuardado]);

//             const { t3, t1, t2 } = resTotal.data.breakdown;
//             setBreakdown({ t3, t1, t2 });

//             let diaTotal = 0;
//             if (turno === '3') diaTotal = t3;
//             else if (turno === '1') diaTotal = t3 + t1;
//             else if (turno === '2') diaTotal = t3 + t1 + t2;
//             setTotalDia(diaTotal);

//             const datosTabla = resTabla.data;
//             setData(datosTabla);

//             const rowConModelo = datosTabla.find(r => r.Modelo && r.Modelo.trim() !== '');
//             if (rowConModelo) {
//                 setModeloActual(rowConModelo.Modelo);
//             }
            
//             // Si NO es polling, reconstruimos el estado editable a partir de lo guardado en CIMA
//             // polling es lo del llamado a la bd para ir calculando la produccion en tiempo real
//             if (!isPoll) {
//                 const initialEditable = {};
//                 const slotsEsperados = generateHourSlots(turno);

//                 slotsEsperados.forEach(slot => {
//                     initialEditable[slot] = { perdidas: 0, detalles: [] };
//                 });

//                 const datosGuardados = resGuardado.data || [];

//                 if (datosGuardados.length > 0) {
//                     datosGuardados.forEach(fila => {
//                         const slotKey = fila.time_slot;
//                         const p = parseInt(fila.perdidas) || 0;
//                         const o = fila.observaciones || '';
//                         const m = fila.motivo || ''; 
                        
//                         if (initialEditable[slotKey]) {
//                             initialEditable[slotKey].perdidas = p;
//                             if (p > 0 || o !== '') {
//                                 initialEditable[slotKey].detalles.push({
//                                     minutos: p, observacion: o, motivo: m 
//                                 });
//                             }
//                         }
//                     });

//                     // Seleccionar Lider y Supervisor con base en el primer registro guardado
//                     const headerInfo = datosGuardados.find(i => i.supervisor);
//                     if (headerInfo) {
//                         setSupervisor(headerInfo.supervisor || '0');
//                         setLider(headerInfo.lider || '0');
//                     }
//                 } else {
//                     setSupervisor('0'); setLider('0');
//                 }
//                 setEditableData(initialEditable); 
//             }
            
//             setLoading(false);
//             setError(null);
//         } catch (err) {
//             console.error("Error datos:", err);
//             setError("Error en la carga de datos");
//             setLoading(false);
//         }
//     }, []);


//     const fetchAndSyncData = useCallback(async () => {
//         const isToday = selectedDate === getFormattedDate();
//         const isPollingActive = isToday && selectedShift !== '0';
        
//         if (!isPollingActive) return;

//         try {
//             const pTabla = axios.get(`http://10.13.225.20:3003/api/rotwet/produccion-real?fecha=${selectedDate}&turno=${selectedShift}`);
//             const pTotal = axios.get(`http://10.13.225.20:3003/api/rotwet/total-dia?fecha=${selectedDate}`);

//             const [resTabla, resTotal] = await Promise.all([pTabla, pTotal]);

//             const { t3, t1, t2 } = resTotal.data.breakdown;
//             setBreakdown({ t3, t1, t2 });

//             let diaTotal = 0;
//             if (selectedShift === '3') diaTotal = t3;
//             else if (selectedShift === '1') diaTotal = t3 + t1;
//             else if (selectedShift === '2') diaTotal = t3 + t1 + t2;
//             setTotalDia(diaTotal);

//             const datosTabla = resTabla.data;
//             setData(datosTabla);

//             const rowConModelo = datosTabla.find(r => r.Modelo && r.Modelo.trim() !== '');
//             if (rowConModelo) {
//                 setModeloActual(prev => {
//                     const newM = rowConModelo.Modelo;
//                     return newM !== prev ? newM : prev;
//                 });
//             }

//         } catch (err) {
//             console.error("Error polling:", err);
//         }
//     }, [selectedDate, selectedShift]); 


//     useEffect(() => {
//         document.title = "Tabla de Producción Rotor Wet";
//         if (selectedShift !== '0') { 
//             consultarDatos(selectedDate, selectedShift);
//         }
//     }, [selectedDate, selectedShift, consultarDatos]);

//     useEffect(() => {
//         const timer = setTimeout(() => {
//             setEnableAnimation(false);
//         }, 4000);
//         return () => clearTimeout(timer);
//     }, []);

//     useEffect(() => {
//         const timeUpdater = setInterval(() => {
//             const now = new Date();
//             setCurrentClientHour(now.getHours());
//             setCurrentClientMinute(now.getMinutes());
//         }, 10000); 
//         return () => clearInterval(timeUpdater);
//     }, []);

//     useEffect(() => {
//         let timerId;
//         const POLLING_INTERVAL = 10000; 
//         const isToday = selectedDate === getFormattedDate();
//         const isPollingActive = isToday && selectedShift !== '0';

//         const pollData = () => {
//             fetchAndSyncData();
//             timerId = setTimeout(pollData, POLLING_INTERVAL); 
//         };
        
//         if (isPollingActive) {
//              pollData();
//         }

//         return () => { if (timerId) clearTimeout(timerId); };
//     }, [selectedDate, selectedShift, fetchAndSyncData]);


//     if (loading) return <p>Cargando datos...</p>;
//     if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

//     const handleDateChange = (event) => setSelectedDate(event.target.value);
//     const handleShiftChange = (event) => setSelectedShift(event.target.value);
    
//     // --- MODAL LÓGICA ---
//     const openLossModal = (timeSlot) => {
//         const currentData = editableData[timeSlot] || { detalles: [] };
//         setTempLossList([...(currentData.detalles || [])]);
//         setCurrentLossSlot(timeSlot);
//         setNewLossMinutos('');
//         setNewLossObs('');
//         setNewLossMotivo(''); 
//         setIsLossModalOpen(true);
//     };

//     const closeLossModal = () => {
//         setIsLossModalOpen(false);
//         setCurrentLossSlot(null);
//     };

//     const addLossItem = () => {
//         if (!newLossMinutos) { alert("Debes ingresar los minutos"); return; }
//         const minutos = parseInt(newLossMinutos);
//         if (minutos < 0) { alert("Los minutos no pueden ser negativos"); return; }
        
//         const newItem = { 
//             minutos: minutos, 
//             observacion: newLossObs,
//             motivo: newLossMotivo 
//         };
//         setTempLossList([...tempLossList, newItem]);
//         setNewLossMinutos('');
//         setNewLossObs('');
//         setNewLossMotivo(''); 
//     };

//     const removeLossItem = (index) => {
//         const newList = [...tempLossList];
//         newList.splice(index, 1);
//         setTempLossList(newList);
//     };

//     const saveLossesFromModal = () => {
//         const totalMinutos = tempLossList.reduce((sum, item) => sum + (parseInt(item.minutos) || 0), 0);
//         setEditableData(prev => ({
//             ...prev,
//             [currentLossSlot]: {
//                 ...prev[currentLossSlot],
//                 perdidas: totalMinutos, 
//                 detalles: tempLossList  
//             }
//         }));
//         closeLossModal();
//     };

//     const handleGuardar = async () => {
//         if (selectedShift === '0' || supervisor === '0' || lider === '0') {
//             alert('Por favor, llena todos los campos.');
//             return;
//         }
        
//         const reportData = hours.map(timeSlot => {
//             const rowData = editableData[timeSlot] || {};
//             const detalles = rowData.detalles || [];
            
//             const totalMin = detalles.length > 0 
//                 ? detalles.reduce((acc, curr) => acc + parseInt(curr.minutos || 0), 0)
//                 : (rowData.perdidas || 0);
            
//             const motivosConcatenados = detalles.length > 0
//                 ? detalles.map(d => d.motivo).filter(Boolean).join(',')
//                 : 'N/A';

//             const obsCombinadas = detalles.length > 0
//                 ? detalles.map(d => `${d.minutos}m: ${d.observacion}`).join(' | ')
//                 : (rowData.observaciones || '');
            
//             return {
//                 Fecha: selectedDate,
//                 Turno: selectedShift,
//                 Hora_Slot: timeSlot,
//                 Supervisor: supervisor,
//                 Lider: lider,
//                 Batch: motivosConcatenados, 
//                 Modelo: modeloActual,
//                 Perdidas: totalMin,
//                 Observaciones: obsCombinadas
//             };
//         });

//         try {
//             await axios.post('http://10.13.225.20:3003/api/rotwet/guardar-reporte', reportData);
//             alert('Guardado exitosamente!');
//             consultarDatos(selectedDate, selectedShift); 
//         } catch (err) {
//             console.error("Error al guardar:", err);
//             alert('Error al guardar.');
//         }
//     };
    
//     // logica del apartado visual
//     const getMetaValue = (timeSlot) => {
//         const startHour = parseInt(timeSlot.split(':')[0], 10);
//         return getMetaPorHoraIndividual(startHour, selectedShift, metaPorHora);
//     };
    
//     const getRealValue = (timeSlot) => {
//         const slotStartHour = parseInt(timeSlot.split(':')[0], 10);
//         const rowData = findRowData(data, timeSlot);
//         const realValue = rowData ? (parseFloat(rowData.piezas_reales) || 0) : 0;
//         const isToday = selectedDate === getFormattedDate();
//         if (realValue === 0 && isToday) {
//             if (slotStartHour === currentClientHour) return '##';
//             if (slotStartHour > currentClientHour) return 0; 
//         }
//         return realValue; 
//     };
    
//     const getModeloPorHora = (timeSlot) => {
//         const rowData = findRowData(data, timeSlot);
//         return rowData ? (rowData.Modelo || rowData.modelo || '') : '';
//     };

//     const openMetaModal = () => { setTempMetaInput(metaPorHora); setIsMetaModalOpen(true); };
//     const closeMetaModal = () => setIsMetaModalOpen(false);
//     const confirmNewMeta = () => {
//         const val = parseInt(tempMetaInput);
//         if (val > 0) { setMetaPorHora(val); closeMetaModal(); }
//         else { alert("Por favor ingresa un número válido mayor a 0"); }
//     };

//     // --- ADHERENCIA ESCALONADA ---
//     const calculateShiftMeta = (shiftId) => {
//         const isToday = selectedDate === getFormattedDate();
//         if (selectedDate < getFormattedDate()) return getFullShiftMeta(shiftId);
//         if (selectedDate > getFormattedDate()) return 0;

//         const currentShift = getCurrentShift();
//         const shiftOrder = ['3', '1', '2'];
//         const currentIndex = shiftOrder.indexOf(currentShift);
//         const targetIndex = shiftOrder.indexOf(shiftId);

//         if (targetIndex < currentIndex) return getFullShiftMeta(shiftId);
//         if (targetIndex > currentIndex) return 0;

//         let metaAcum = 0;
//         const slots = generateHourSlots(shiftId);
        
//         for (let slot of slots) {
//             const startHour = parseInt(slot.split(':')[0], 10);
//             const hourlyMeta = getMetaPorHoraIndividual(startHour, shiftId, metaPorHora);

//             if (startHour === currentClientHour) {
//                 const quarterPart = Math.ceil(hourlyMeta / 4); 
                
//                 if (currentClientMinute >= 59) {
//                     metaAcum += hourlyMeta; 
//                 } else if (currentClientMinute >= 45) {
//                     metaAcum += Math.min(hourlyMeta, quarterPart * 3);
//                 } else if (currentClientMinute >= 30) {
//                     metaAcum += Math.min(hourlyMeta, quarterPart * 2);
//                 } else if (currentClientMinute >= 15) {
//                     metaAcum += Math.min(hourlyMeta, quarterPart);
//                 }
//                 break; 
//             } else {
//                 metaAcum += hourlyMeta;
//             }
//         }
//         return metaAcum;
//     };

//     const getFullShiftMeta = (shiftId) => {
//         const slots = generateHourSlots(shiftId);
//         return slots.reduce((acc, slot) => {
//              const start = parseInt(slot.split(':')[0], 10);
//              return acc + getMetaPorHoraIndividual(start, shiftId, metaPorHora);
//         }, 0);
//     };

//     const totalMetaTurno = calculateShiftMeta(selectedShift);
//     const totalReal = data.reduce((sum, item) => sum + (parseFloat(item.piezas_reales) || 0), 0);
//     const totalPerdidas = Object.values(editableData).reduce((sum, item) => sum + (parseInt(item.perdidas) || 0), 0);
    
//     const rawPercentReal = totalMetaTurno > 0 ? (totalReal / totalMetaTurno) : 0;
//     const chartPercentReal = Math.min(1, rawPercentReal);
    
//     //logica para las metas del dia
//     const calcularMetaDiaAcumulada = () => {
//         let metaAcum = 0;

//         //turno 3
//         if (selectedShift === '3') {
//             metaAcum += calculateShiftMeta('3');
//         } else {
//             if (breakdown.t3 > 0) {
//                 metaAcum += getFullShiftMeta('3');
//             }
//         }

//         // turno 1
//         if (selectedShift === '1') {
//             metaAcum += calculateShiftMeta('1');
//         } else if (selectedShift === '2') {
//             if (breakdown.t1 > 0) {
//                 metaAcum += getFullShiftMeta('1');
//             }
//         }

//         // turno 2
//         if (selectedShift === '2') {
//             metaAcum += calculateShiftMeta('2');
//         }
        
//         return metaAcum;
//     };

//     const metaDiaAcumulada = calcularMetaDiaAcumulada();
//     const diaStatusClass = totalDia >= metaDiaAcumulada ? 'status-good-rotwet' : 'status-bad-rotwet';
//     const percentDia = Math.min(100, (totalDia / (metaDiaAcumulada || 1)) * 100);
//     const delta = totalDia - metaDiaAcumulada;
//     const deltaSigno = delta > 0 ? "+" : ""; 
//     const deltaColor = delta >= 0 ? "#388E3C" : "#D32F2F"; 

//     return (
//         <div className="bodyTabla-rotwet">
//             <title>Tabla Productividad Rotor Wet</title>
//             <header className="header-rotwet">
//                 <img src={logoNidec} alt="Nidec ACIM Logo" className="logoTabla-rotwet" />
//                 <h2 className="tituloPrincipal-rotwet">TABLA DE PRODUCTIVIDAD ROTOR WET</h2>
//                 <img src={Zero} alt="Zero Productividad" className="logoZero-rotwet" />
//             </header>

//             <div className="top-panel-container-rotwet">
//                 <div className="panel-left-rotwet">
//                     <section className="datosGenerales-rotwet">
//                         <table>
//                             <tbody>
//                                 <tr>
//                                     <td>Fecha:</td>
//                                     <td><input type="date" value={selectedDate} onChange={handleDateChange} /></td>
//                                 </tr>
//                                 <tr>
//                                     <td>Turno:</td>
//                                     <td>
//                                         <select value={selectedShift} onChange={handleShiftChange}>
//                                             <option value="0" disabled>--Selecciona--</option>
//                                             <option value="1">1</option>
//                                             <option value="2">2</option>
//                                             <option value="3">3</option>
//                                         </select>
//                                     </td>
//                                 </tr>
//                                 <tr>
//                                     <td>Supervisor:</td>
//                                     <td>
//                                         <select value={supervisor} onChange={(e) => setSupervisor(e.target.value)}>
//                                             <option value="0" disabled>--Selecciona--</option>
//                                             <option value="Rubén Núñez">Rubén Núñez</option>
//                                         </select>
//                                     </td>
//                                 </tr>
//                                 <tr>
//                                     <td>Team Leader:</td>
//                                     <td>
//                                         <select value={lider} onChange={(e) => setLider(e.target.value)}>
//                                             <option value="0" disabled>--Selecciona--</option>
//                                             <option value="Alejandro Castillo">Alejandro Castillo</option>
//                                             <option value="Edgar Rodriguez">Edgar Rodriguez</option>
//                                             <option value="Jaime Jiménez">Jaime Jiménez</option>
//                                         </select>
//                                     </td>
//                                 </tr>
//                                 <tr>
//                                     <td>Línea:</td>
//                                     <td>
//                                         <select value="3" onChange={handleLineChange}>
//                                             <option value="0">CDU</option>
//                                             <option value="1">Electronics</option>
//                                             <option value="2">Insinkerator</option>
//                                             <option value="3">Rotor Wet</option>
//                                             <option value="4">Rotor Ise</option>
//                                         </select>
//                                     </td>
//                                 </tr>
//                             </tbody>
//                         </table>
//                     </section>
//                 </div>

//                 <div className="panel-right-rotwet">
//                     <div className="medidores-container-rotwet">
//                         <div className="medidor-rotwet">
//                             <h3>Meta</h3>
//                             <div className="gauge-wrapper-rotwet">
//                                 <GaugeChart 
//                                     id="gauge-meta" nrOfLevels={1} colors={["#1976D2"]} arcWidth={0.3} percent={1} 
//                                     textColor="#333" needleColor="#b0b0b0" needleBaseColor="#b0b0b0" hideText={true} 
//                                     animate={enableAnimation} 
//                                 />
//                                 <div className="gauge-value-text-rotwet">{totalMetaTurno}</div>
//                             </div>
//                         </div>
//                         <div className="medidor-rotwet">
//                             <h3>Real</h3>
//                             <div className="gauge-wrapper-rotwet">
//                                 <GaugeChart 
//                                     id="gauge-real" nrOfLevels={3} colors={["#EA4228", "#F5CD19", "#5BE12C"]} arcWidth={0.3} percent={chartPercentReal} 
//                                     textColor="#333" needleColor="#333" needleBaseColor="#333" hideText={true}
//                                     animate={enableAnimation} 
//                                 />
//                                 <div className="gauge-value-text-rotwet" style={{ color: totalReal >= totalMetaTurno ? '#388E3C' : '#333' }}>
//                                     {totalReal}
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="medidor-rotwet">
//                             <h3>Pérdidas</h3>
//                             <div className="donut-wrapper-rotwet">
//                                 <CircularProgressbar 
//                                     value={totalPerdidas} maxValue={totalMetaTurno || 100} text={`${totalPerdidas}`}
//                                     styles={buildStyles({ textColor: "#D32F2F", pathColor: "#D32F2F", trailColor: "#eee", textSize: '30px', pathTransitionDuration: 0.5 })}
//                                 />
//                             </div>
//                         </div>

//                         <div className="medidor-rotwet-card">
//                             <div className={`card-total-dia-rotwet ${diaStatusClass}`}>
//                                 <div className="total-dia-content-wrapper-rotwet">
//                                     <div className="total-dia-left-rotwet">
//                                         <h4>Total Día</h4>
//                                         <p className="total-dia-number-rotwet">
//                                             {totalDia} 
//                                             <span style={{fontSize:'0.9rem', fontWeight:'normal', color:'#777'}}>/ {metaDiaAcumulada}</span>
//                                         </p>
//                                         <div className="delta-container-rotwet" style={{color: deltaColor}}>
//                                             Delta: {deltaSigno}{delta}
//                                         </div>
//                                     </div>
//                                     <div className="total-dia-right-breakdown-rotwet">
//                                         <div className="breakdown-item-rotwet">
//                                             <span>T3:</span> <strong>{breakdown.t3}</strong>
//                                         </div>
//                                         <div className="breakdown-item-rotwet">
//                                             <span>T1:</span> <strong>{breakdown.t1}</strong>
//                                         </div>
//                                         <div className="breakdown-item-rotwet">
//                                             <span>T2:</span> <strong>{breakdown.t2}</strong>
//                                         </div>
//                                     </div>
//                                 </div>
//                                 <div className="progress-bar-container-rotwet">
//                                     <div className="progress-bar-fill-rotwet" style={{ width: `${percentDia}%` }}></div>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="medidor-rotwet-image">
//                             <img 
//                                 src={diaStatusClass === 'status-good-rotwet' ? ZeroBien : ZeroMal} 
//                                 alt="Estado de Producción" 
//                                 className="indicador-imagen-rotwet"
//                             />
//                         </div>

//                     </div>
//                 </div>
//             </div>

//             <section className="contenedorTabla-rotwet">
//                 <table className="tablaProduccion-rotwet">
//                     <caption>INFORMACIÓN DE PRODUCCIÓN</caption>
//                     <thead>
//                         <tr>
//                             <th>Hora</th>
//                             <th>Plan</th>
//                             <th>Real</th>
//                             <th>Modelo</th>
//                             <th>Pérdidas</th>
//                             <th>Observaciones</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {hours.map((timeSlot, index) => {
//                             const currentEditable = editableData[timeSlot] || {};
                            
//                             const meta = getMetaValue(timeSlot);
//                             const realValDisplay = getRealValue(timeSlot);
//                             const realNum = parseFloat(realValDisplay);
//                             const slotHour = parseInt(timeSlot.split(':')[0], 10);
//                             const isToday = selectedDate === getFormattedDate();
//                             const todayStr = getFormattedDate();

//                             let cellClass = "";
//                             let isPastHour = false;

//                             if (selectedDate < todayStr) {
//                                 isPastHour = true;
//                             } else if (isToday) {
//                                 if (slotHour < currentClientHour) {
//                                     isPastHour = true;
//                                 }
//                                 if (selectedShift === '3' && slotHour === 23 && currentClientHour < 23) {
//                                     isPastHour = true;
//                                 }
//                             }

//                             if (!isNaN(realNum) && realValDisplay !== '##' && realNum >= meta) {
//                                 cellClass = "celda-cumplida-rotwet";
//                             } else if (isPastHour) {
//                                 cellClass = "celda-no-cumplida-rotwet";
//                             }

//                             const obsResumen = (currentEditable.detalles || []).length > 0 
//                                 ? (currentEditable.detalles || []).map(d => d.observacion).filter(Boolean).join(' | ')
//                                 : (currentEditable.observaciones || '');

//                             return (
//                                 <tr key={index}>
//                                     <td>{timeSlot}</td>
//                                     <td><b>{meta}</b></td>
//                                     <td className={cellClass}><b>{realValDisplay}</b></td>
//                                     <td style={{ fontSize: '0.75rem', color: '#555', whiteSpace: 'normal', maxWidth: '150px' }}>
//                                         {getModeloPorHora(timeSlot)}
//                                     </td>
//                                     <td>
//                                         <input
//                                             type="text"
//                                             readOnly 
//                                             className="input-loss-clickable-rotwet"
//                                             style={{ width: '80px', textAlign: 'center', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
//                                             value={currentEditable.perdidas > 0 ? `${currentEditable.perdidas} min` : ''}
//                                             onClick={() => openLossModal(timeSlot)}
//                                             placeholder="+"
//                                         />
//                                     </td>
//                                     <td>
//                                         <input
//                                             type="text"
//                                             readOnly
//                                             className="input-loss-clickable-rotwet"
//                                             style={{ width: '90%', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}
//                                             value={obsResumen}
//                                             onClick={() => openLossModal(timeSlot)}
//                                             placeholder="Ver notas..."
//                                         />
//                                     </td>
//                                 </tr>
//                             );
//                         })}
//                     </tbody>
//                 </table>
//             </section>

//             <div className="div-btn-guardar-rotwet">
//                 <button className="btnCambiarMeta-rotwet" onClick={openMetaModal}>Ajustar Meta</button>
//                 <button className="btnGuardarTabla-rotwet" onClick={handleGuardar}>Guardar</button>
//             </div>

//             {isMetaModalOpen && (
//                 <div className="modal-overlay-rotwet">
//                     <div className="modal-content-rotwet">
//                         <h3>Definir Meta por Hora</h3>
//                         <p>Ingresa la nueva cantidad:</p>
//                         <input type="number" className="input-meta-modal-rotwet" value={tempMetaInput} onChange={(e) => setTempMetaInput(e.target.value)} />
//                         <div className="modal-actions-rotwet">
//                             <button className="btn-modal-cancel-rotwet" onClick={closeMetaModal}>Cancelar</button>
//                             <button className="btn-modal-confirm-rotwet" onClick={confirmNewMeta}>Aceptar</button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {isLossModalOpen && (
//                 <div className="modal-overlay-rotwet">
//                     <div className="modal-content-large-rotwet">
//                         <h3>Registro de Eventos: {currentLossSlot}</h3>
//                         <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
//                             <table className="loss-list-table-rotwet">
//                                 <thead>
//                                     <tr>
//                                         <th style={{width: '80px'}}>Minutos</th>
//                                         <th>Motivo</th>
//                                         <th>Descripción / Observación</th>
//                                         <th style={{width: '50px'}}></th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {tempLossList.map((item, idx) => (
//                                         <tr key={idx}>
//                                             <td style={{fontWeight:'bold', color:'#D32F2F'}}>{item.minutos} min</td>
//                                             <td>{item.motivo}</td>
//                                             <td>{item.observacion}</td>
//                                             <td><button className="btn-delete-loss-rotwet" onClick={() => removeLossItem(idx)}>X</button></td>
//                                         </tr>
//                                     ))}
//                                     {tempLossList.length === 0 && (
//                                         <tr><td colSpan="4" style={{textAlign:'center', color:'#999'}}>Sin eventos registrados</td></tr>
//                                     )}
//                                 </tbody>
//                             </table>
//                         </div>
//                         <div className="total-display-rotwet">
//                             Total Pérdidas: {tempLossList.reduce((sum, item) => sum + (parseInt(item.minutos)||0), 0)} min
//                         </div>
                        
//                         <div className="add-loss-form-rotwet">
//                             <div className="form-group-rotwet">
//                                 <label>Minutos:</label>
//                                 <input type="number" placeholder="0" style={{width: '80px'}} value={newLossMinutos} onChange={(e) => setNewLossMinutos(e.target.value)} />
//                             </div>
                            
//                             <div className="form-group-rotwet">
//                                 <label>Motivo:</label>
//                                 <select 
//                                     style={{width: '150px', padding:'8px', borderRadius:'4px', border:'1px solid #ccc'}}
//                                     value={newLossMotivo} 
//                                     onChange={(e) => setNewLossMotivo(e.target.value)}
//                                 >
//                                     <option value="" disabled>--Selecciona--</option>
//                                     <option value="A1">A1 - Falla Mecánica</option>
//                                     <option value="A2">A2 - Falla Eléctrica</option>
//                                     <option value="A3">A3 - Neumática u otras</option>
//                                     <option value="B1">B1 - Falta de Energía</option>
//                                     <option value="B2">B2 - Falta de Aire Comprimido</option>
//                                     <option value="B3">B3 - Falta de Vapor</option>
//                                     <option value="C1">C1 - Falta de Material</option>
//                                     <option value="C2">C2 - Falta de ...</option>
//                                     <option value="D1">D1 - Hora de Comida</option>
//                                     <option value="D2">D2 - Simulacro de Emergencia</option>
//                                     <option value="E1">E1 - Falta de Operador</option>
//                                     <option value="E2">E2 - Gymnastic</option>
//                                     <option value="E3">E3 - Entrenamiento</option>
//                                     <option value="E4">E4 - Baño</option>
//                                     <option value="E5">E5 - Junta</option>
//                                     <option value="F1">F1 - Cambio de Herramienta</option>
//                                     <option value="F2">F2 - Changeover</option>
//                                     <option value="F3">F3 - Cambio de Materia Prima</option>
//                                     <option value="G1">G1 - Ajuste de Maquina</option>
//                                     <option value="G2">G2 - Ajuste de Herramientas</option>
//                                     <option value="H1">H1 - Paros Menores - Bloqueo</option>
//                                     <option value="H2">H2 - Paros Menores - Starving</option>
//                                     <option value="H3">H3 - Paros Menores - Inactivo</option>
//                                     <option value="H4">H4 - Paros Menores - Fallo</option>
//                                     <option value="I1">I1 - Perdida de Velocidad</option>
//                                     <option value="J1">J1 - Scrap</option>
//                                     <option value="J2">J2 - Re-Trabajo</option>
//                                 </select>
//                             </div>

//                             <div className="form-group-rotwet" style={{flex:1}}>
//                                 <label>Descripción:</label>
//                                 <input type="text" placeholder="Escribe la causa..." style={{width: '100%'}} value={newLossObs} onChange={(e) => setNewLossObs(e.target.value)} />
//                             </div>
//                             <button className="btn-add-loss-rotwet" onClick={addLossItem}>Agregar</button>
//                         </div>

//                         <div className="modal-actions-rotwet" style={{marginTop: '10px'}}>
//                             <button className="btn-modal-cancel-rotwet" onClick={closeLossModal}>Cancelar</button>
//                             <button className="btn-modal-confirm-rotwet" onClick={saveLossesFromModal}>Aceptar</button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// export default TablaProdRotorWet;