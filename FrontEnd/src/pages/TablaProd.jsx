import { useState, useEffect, useCallback } from 'react'; 
import React from "react";
import './TablaProd.css';
import logoNidec from '../assets/nidec-logo.png';
import axios from 'axios';
import Footer from '../components/footer';
import Zero from '../assets/zeroproductividad.png';

const getFormattedDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const SHIFT_HOURS = {
    '1': [6, 14, 8],
    '2': [14, 23, 9],
    '3': [23, 6, 7],
};

const SHIFT_TOTAL_META = {
    '1': 1440, 
    '2': 1620, 
    '3': 1260, 
    '0': 1     
};

const getCurrentShift = () => {
    const now = new Date();
    const currentHour = now.getHours(); 
    if (currentHour >= 6 && currentHour < 14) return '1';
    if (currentHour >= 14 && currentHour < 23) return '2';
    if (currentHour >= 23 || currentHour < 6) return '3';
    return '0'; 
};

const generateHourSlots = (shiftId) => {
    const [start, end, totalHours] = SHIFT_HOURS[shiftId];
    const slots = [];
    let currentHour = start;
    for (let i = 0; i < totalHours; i++) {
        const nextHour = (currentHour + 1) % 24;
        const startStr = String(currentHour).padStart(2, '0') + ':00';
        const endStr = String(nextHour).padStart(2, '0') + ':00';
        slots.push(`${startStr}-${endStr}`);
        currentHour = nextHour;
    }
    return slots;
};

const TablaProd = () => {

    const [data, setData] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modeloActual, setModeloActual] = useState('');
    const [selectedDate, setSelectedDate] = useState(getFormattedDate());
    const [selectedShift, setSelectedShift] = useState(getCurrentShift()); 
    const [currentClientHour, setCurrentClientHour] = useState(new Date().getHours());
    
    const [batch, setBatch] = useState('');
    const [supervisor, setSupervisor] = useState('0'); 
    const [lider, setLider] = useState('0'); 
    const [editableData, setEditableData] = useState({});

    const hours = selectedShift !== '0' ? generateHourSlots(selectedShift) : [];

    const consultarDatos = useCallback(async (fecha, turno, isPoll = false) => {
        
        if (!isPoll) { 
             setLoading(true);
        }
        
        try {
            const url = `http://10.13.225.156:3001/api/produccion-real?fecha=${fecha}&turno=${turno}`;
            const respuesta = await axios.get(url);
            const apiData = respuesta.data;
            
            setData(apiData);
            
            if (!isPoll) {
                const initialEditable = {};
                apiData.forEach(item => {
                    const valPerdidas = (item.Perdidas !== undefined && item.Perdidas !== null) ? item.Perdidas 
                                      : (item.perdidas !== undefined && item.perdidas !== null) ? item.perdidas 
                                      : 0;
                    const valObservaciones = item.Observaciones || item.observaciones || '';

                    initialEditable[item.time_slot] = {
                        perdidas: valPerdidas, 
                        observaciones: valObservaciones, 
                    };
                });
                
                setEditableData(initialEditable); 

                const firstRowWithData = apiData.find(item => (item.Batch || item.batch));
                
                if (firstRowWithData) {
                    setBatch(firstRowWithData.Batch || firstRowWithData.batch || '');
                    setSupervisor(firstRowWithData.Supervisor || firstRowWithData.supervisor || '0');
                    setLider(firstRowWithData.Lider || firstRowWithData.lider || '0');
                } else {
                    setBatch('');
                    setSupervisor('0');
                    setLider('0');
                }
            }
            
            setLoading(false);
            setError(null);
        } catch (err) {
            console.error("Error datos:", err);
            setError("Error en la carga de datos");
            setLoading(false);
        }
    }, []); 

    const actualizarModelo = useCallback(async () => {
        try {
            const respuesta = await axios.get("http://10.13.225.156:3001/api/getModeloElectronics");
            if (respuesta.data && respuesta.data.length > 0) {
                setModeloActual(prev => {
                    const newModel = respuesta.data[0].Model;
                    return newModel !== prev ? newModel : prev;
                });
            }
        } catch(err) {
            console.error("Error polling Modelo:", err);
        }
    }, []);

    const fetchAndSyncData = useCallback(async () => {
        const isToday = selectedDate === getFormattedDate();
        const isPollingActive = isToday && selectedShift !== '0';
        
        if (!isPollingActive) return;

        try {
            const url = `http://10.13.225.156:3001/api/produccion-real?fecha=${selectedDate}&turno=${selectedShift}`;
            const [respuestaReal, respuestaModelo] = await Promise.all([
                axios.get(url),
                axios.get("http://10.13.225.156:3001/api/getModeloElectronics")
            ]);
            
            setData(respuestaReal.data); 

            if (respuestaModelo.data && respuestaModelo.data.length > 0) {
                setModeloActual(prev => {
                    const newModel = respuestaModelo.data[0].Model;
                    return newModel !== prev ? newModel : prev;
                });
            }

        } catch (err) {
            console.error("Error polling:", err);
        }
    }, [selectedDate, selectedShift]); 


    useEffect(() => {
        document.title = "Tabla de Producción";
        if (selectedShift !== '0') { 
            consultarDatos(selectedDate, selectedShift);
        }
        actualizarModelo();
    }, [selectedDate, selectedShift, consultarDatos, actualizarModelo]);


    useEffect(() => {
        const minuteUpdater = setInterval(() => {
            setCurrentClientHour(new Date().getHours());
        }, 60000); 
        return () => clearInterval(minuteUpdater);
    }, []);

    useEffect(() => {
        let timerId;
        const POLLING_INTERVAL = 10000; 
        const isToday = selectedDate === getFormattedDate();
        const isPollingActive = isToday && selectedShift !== '0';

        const pollData = () => {
            fetchAndSyncData();
            timerId = setTimeout(pollData, POLLING_INTERVAL); 
        };
        
        if (isPollingActive) {
             pollData();
        }

        return () => { if (timerId) clearTimeout(timerId); };
    }, [selectedDate, selectedShift, fetchAndSyncData]);


    if (loading) return <p>Cargando datos...</p>;
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

    const handleDateChange = (event) => setSelectedDate(event.target.value);
    const handleShiftChange = (event) => setSelectedShift(event.target.value);
    
    const handleTableDataChange = (timeSlot, field, value) => {
        setEditableData(prev => ({
            ...prev,
            [timeSlot]: { ...prev[timeSlot], [field]: value },
        }));
    };
    
    const handleGuardar = async () => {
        if (selectedShift === '0' || !batch || supervisor === '0' || lider === '0') {
            alert('Por favor, completa los campos de cabecera.');
            return;
        }
        const reportData = hours.map(timeSlot => {
            const editableRow = editableData[timeSlot] || {};
            const perdidasNum = parseInt(editableRow.perdidas) || 0;
            const observacionesTxt = editableRow.observaciones || '';
            
            if (perdidasNum === 0 && observacionesTxt.trim() === '') return null;
            
            return {
                Fecha: selectedDate, Turno: selectedShift, Hora_Slot: timeSlot,
                Supervisor: supervisor, Lider: lider, Batch: batch, Modelo: modeloActual, 
                Perdidas: perdidasNum, Observaciones: observacionesTxt,
            };
        }).filter(row => row !== null);

        if (reportData.length === 0) {
            alert('No hay datos nuevos para guardar.');
            return;
        }

        try {
            await axios.post('http://10.13.225.156:3001/api/guardar-reporte', reportData);
            alert('Guardado exitosamente!');
            consultarDatos(selectedDate, selectedShift); 
        } catch (err) {
            console.error("Error al guardar:", err);
            alert('Error al guardar.');
        }
    };
    
    const getRealValue = (timeSlot) => {
        const slotStartHour = parseInt(timeSlot.split(':')[0], 10);
        const rowData = data.find(row => row.time_slot === timeSlot); 
        const realValue = rowData ? rowData.piezas_reales : 0; 
        const isToday = selectedDate === getFormattedDate();
        
        if (realValue === 0 && isToday) {
            if (slotStartHour === currentClientHour) return '##';
            if (slotStartHour > currentClientHour) return 0; 
        }
        return realValue; 
    };

    const getMetaValue = (timeSlot) => {
        return 180;
    };
    
    // Helper para mostrar el modelo en la tabla
    const getModeloPorHora = (timeSlot) => {
        const rowData = data.find(row => row.time_slot === timeSlot);
        return rowData ? (rowData.Modelo || rowData.modelo || '') : '';
    };

    // ** CÁLCULOS PARA MEDIDORES  **
    
    const totalMetaTurno = SHIFT_TOTAL_META[selectedShift] || 1; 

    const totalReal = data.reduce((sum, item) => sum + (parseFloat(item.piezas_reales) || 0), 0);
    
    const totalPerdidas = Object.values(editableData).reduce((sum, item) => sum + (parseInt(item.perdidas) || 0), 0);

    const percentMeta = 100; 
    const percentReal = Math.min(100, (totalReal / totalMetaTurno) * 100);
    const percentPerdidas = Math.min(100, (totalPerdidas / totalMetaTurno) * 100);

    const rotationMeta = 180; 
    const rotationReal = (percentReal / 100) * 180;
    const rotationPerdidas = (percentPerdidas / 100) * 180;


    return (
        <div className="bodyTablaProd">
            <title>Tabla Productividad</title>
            <header className="header">
                <img src={logoNidec} alt="Nidec ACIM Logo" className="logoTablaProd" />
                <h2 className="tituloPrincipal">TABLA DE PRODUCTIVIDAD</h2>
                <img src={Zero} alt="Zero Productividad" className="logoZero" />
            </header>

            <section className="infoGeneral">
                <p className="tituloArea">ELECTRONICS</p>
                <div className="camposLinea">
                    <label>Línea:
                        <select defaultValue="1"><option value="1">Ensamble Final</option></select>
                    </label>
                    <label>Modelo: <input type="text" value={modeloActual} disabled /></label>
                    <label>Batch: <input type="text" value={batch} onChange={(e) => setBatch(e.target.value)} /></label>
                </div>
            </section>

            <div className="medidores-container">
                <div className="medidor">
                    <h3>Meta</h3>
                    <div className="gauge">
                        <div className="gauge-fill" style={{ transform: `rotate(${rotationMeta}deg)` }}></div>
                        <div className="gauge-cover"></div>
                    </div>
                </div>
                <div className="medidor">
                    <h3>Real</h3>
                    <div className="gauge">
                        <div className="gauge-fill" style={{ transform: `rotate(${rotationReal}deg)` }}></div>
                        {/* <div className="gauge-cover">{percentReal.toFixed(1)}%</div> */}
                        <div className="gauge-cover"></div>
                    </div>
                </div>
                <div className="medidor">
                    <h3>Pérdidas</h3>
                    <div className="gauge">
                        <div className="gauge-fill" style={{ transform: `rotate(${rotationPerdidas}deg)` }}></div>
                        {/* <div className="gauge-cover">{percentPerdidas.toFixed(1)}%</div> */}
                        <div className="gauge-cover"></div>
                    </div>
                </div>
            </div>

            <section className="datosGenerales">
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
                                    <option value="Supervisor 1">Hugo Zapata</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>Team Leader:</td>
                            <td>
                                <select value={lider} onChange={(e) => setLider(e.target.value)}>
                                    <option value="0" disabled>--Selecciona--</option>
                                    <option value="Jose Rojas">Jose Rojas</option>
                                    <option value="Brenda Barrón">Brenda Barrón</option>
                                    <option value="Basilia Martin">Basilia Martin</option>
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section className="contenedorTabla">
                <table className="tablaProduccion">
                    <caption>INFORMACIÓN DE PRODUCCIÓN</caption>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Meta</th>
                            <th>Real</th>
                            <th>Modelo</th> 
                            <th>Pérdidas</th>
                            <th>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hours.map((timeSlot, index) => {
                            const currentEditable = editableData[timeSlot] || {};
                            return (
                                <tr key={index}>
                                    <td>{timeSlot}</td>
                                    <td><b>{getMetaValue(timeSlot)}</b></td>
                                    <td><b>{getRealValue(timeSlot)}</b></td>
                                    
                                    <td style={{ fontSize: '0.75rem', color: '#555', whiteSpace: 'normal', maxWidth: '150px' }}>
                                        {getModeloPorHora(timeSlot)}
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            style={{ width: '80px', textAlign: 'center' }}
                                            value={currentEditable.perdidas || ''}
                                            onChange={(e) => handleTableDataChange(timeSlot, 'perdidas', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            style={{ width: '90%' }}
                                            value={currentEditable.observaciones || ''}
                                            onChange={(e) => handleTableDataChange(timeSlot, 'observaciones', e.target.value)}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            <div className="div-btn-guardar">
                <button className="btnGuardarTablaProd" onClick={handleGuardar}>Guardar</button>
            </div>
        </div>
    );
};

export default TablaProd;