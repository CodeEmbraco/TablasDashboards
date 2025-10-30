import { useState, useEffect, useCallback } from 'react';
import React from "react";
import './TablaProd.css'
import logoNidec from '../assets/nidec-logo.png'
import axios from 'axios';
import Footer from '../components/footer';

// Diseño por Alondra Romero 
// Desarrollado por Jorge Barrón

// Función auxiliar para obtener y formatear la fecha del dia q sea actualmente
const getFormattedDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

//Arreglo de horas
const SHIFT_HOURS = {
    '1': [6, 14, 8],// Turno 1: 06:00 a 14:00 (8 horas)
    '2': [14, 23, 9],// Turno 2: 14:00 a 23:00 (9 horas)
    '3': [23, 6, 7],// Turno 3: 23:00 a 06:00 (7 horas)
};

//Determinar el turno en base a la hora actual
const getCurrentShift = () => {
    const now = new Date();
    const currentHour = now.getHours(); 

    // Turno 1: 06:00 a 14:00
    if (currentHour >= 6 && currentHour < 14) {
        return '1';
    }
    // Turno 2: 14:00 a 23:00
    if (currentHour >= 14 && currentHour < 23) {
        return '2';
    }
    // Turno 3: 23:00 a 06:00 (incluye la medianoche)
    if (currentHour >= 23 || currentHour < 6) {
        return '3';
    }
    return '0'; //por si acasoooo llega a fallar
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

    // Variables de estado q voy a usar
    const [data, setData] = useState([]); // Datos completos de la API 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modeloActual, setModeloActual] = useState('');
    const [selectedDate, setSelectedDate] = useState(getFormattedDate());//esta es la d la fecha
    const [selectedShift, setSelectedShift] = useState(getCurrentShift()); //para el turno automatico
    const [currentClientHour, setCurrentClientHour] = useState(new Date().getHours());// para controlar el polling
    
    
    const [batch, setBatch] = useState('');
    const [supervisor, setSupervisor] = useState('0'); 
    const [lider, setLider] = useState('0'); 
    const [editableData, setEditableData] = useState({});


    //Horas 
    const hours = selectedShift !== '0' ? generateHourSlots(selectedShift) : [];

    //FUNCIÓN DE CONSULTA PRINCIPAL**
    const consultarDatos = useCallback(async (fecha, turno) => {
        // La lógica de loading/error se debe manejar fuera del Polling
        
        try {
            // Usamos el endpoint y enviamos los parámetros
            const url = `http://localhost:3001/api/produccion-real?fecha=${fecha}&turno=${turno}`;
            const respuesta = await axios.get(url);
            
            //json con datos completos
            const apiData = respuesta.data;
            setData(apiData);
            
            //Carga inicial de datos
            const initialEditable = {};
            apiData.forEach(item => {
                initialEditable[item.time_slot] = {
                    perdidas: item.Perdidas || 0, 
                    observaciones: item.Observaciones || '', 
                };
            });
            
            setEditableData(initialEditable); 

            // Los campos de cabecera los tomamos del primer registro que tenga datos
            const firstRowWithData = apiData.find(item => item.Batch);
            
            if (firstRowWithData) {
                setBatch(firstRowWithData.Batch || '');
                setSupervisor(firstRowWithData.Supervisor || '0');
                setLider(firstRowWithData.Lider || '0');
            } else {
                // Limpiar si no hay datos
                setBatch('');
                setSupervisor('0');
                setLider('0');
            }
            
            setLoading(false);
            setError(null);
        } catch (err) {
            console.error("No se pudieron cargar los datos correctamente:", err);
            setError("Los datos del API no se cargaron correctamente");
            setLoading(false);
        }
    }, []); 

    //FUNCIÓN Q SOLO ACTUALIZA EL VALOR REAL
    const actualizarReal = useCallback(async (fecha, turno) => {
        try {
            const url = `http://localhost:3001/api/produccion-real?fecha=${fecha}&turno=${turno}`;
            const respuesta = await axios.get(url);
            
            // Solo actualizamos el estado principal de datos, sin tocar loading/editableData/etc.
            setData(respuesta.data); 

        } catch (err) {
            console.error("Error en Polling de datos Real:", err);
        }
    }, []);

    //SOLO ACTUALIZA EL MODELO
    const actualizarModelo = useCallback(async () => {
        try {
            const respuesta = await axios.get("http://localhost:3001/api/getModeloElectronics");
            if (respuesta.data && respuesta.data.length > 0) {
                // Solo actualiza si el valor es diferente para evitar renderizados innecesarios
                setModeloActual(prev => {
                    const newModel = respuesta.data[0].Model;
                    return newModel !== prev ? newModel : prev;
                });
            }
        } catch(err) {
            console.error("Error en Polling de Modelo:", err);
        }
    }, []);


    // 1. useEffect Principal (Carga Inicial y Recarga por Cambio de Fecha/Turno)
    useEffect(() => {
        //Esta linea de aqui abajo es solo para cambiar el titulo de la pagina
        document.title = "Tabla de Producción";

        // Carga inicial y recarga si el usuario cambia el filtro
        if (selectedShift !== '0') { 
            setLoading(true); // Mostrar loading al inicio y al cambiar filtros
            consultarDatos(selectedDate, selectedShift);
        }
        
        // Carga inicial del modelo 
        actualizarModelo(); 

        
    }, [selectedDate, selectedShift, consultarDatos, actualizarModelo]); 

    
    // 2. useEffect para Actualizar la Hora del Cliente CADA MINUTO
    useEffect(() => {
        // Sincroniza la hora del cliente cada 60s
        const minuteUpdater = setInterval(() => {
            setCurrentClientHour(new Date().getHours());
        }, 60000); 

        return () => clearInterval(minuteUpdater);
    }, []);


    // 3. useEffect para el Polling Dirigido (Real y Modelo)
    useEffect(() => {
        let timerId;
        const POLLING_INTERVAL = 10000; // 10 segundos

        const isToday = selectedDate === getFormattedDate();
        const currentHour = new Date().getHours();
        
        // Define el slot de tiempo que corresponde a la hora actual del reloj del cliente
        const activeSlotStart = String(currentHour).padStart(2, '0') + ':00';
        const nextHour = (currentHour + 1) % 24;
        const activeSlotEnd = String(nextHour).padStart(2, '0') + ':00'; 
        const activeSlot = `${activeSlotStart}-${activeSlotEnd}`;
        
        // La condición de Polling para datos de producción: Debe ser HOY Y la hora actual debe estar en el turno
        const isProductionPollingActive = isToday && hours.includes(activeSlot);
        
        // El Polling de Modelo debe ser activo siempre que estemos en el día actual y un turno válido
        const isModelPollingActive = isToday && selectedShift !== '0';

        // Función combinada de polling
        const pollData = () => {
            if (isProductionPollingActive) {
                actualizarReal(selectedDate, selectedShift);
            }
            
            if (isModelPollingActive) {
                actualizarModelo();
            }
            
            // Programa la siguiente llamada
            timerId = setTimeout(pollData, POLLING_INTERVAL); 
        };
        
        if (isProductionPollingActive || isModelPollingActive) {
             pollData();
        }

        // Función de limpieza
        return () => {
            if (timerId) {
                clearTimeout(timerId);
            }
        };
        // Dependencias import
    }, [selectedDate, selectedShift, hours, actualizarReal, actualizarModelo, currentClientHour]);


    //Mientras esta cargando se mostrara este mensaje. Esto es opcional pero conviene dejarlo pq asi
    //si por x razon tarda mucho entraer los datos de la bd el usuario puede saber que esta cargando
    if (loading) return <p>Cargando datos...</p>;

    //Muestra el msj de error en caso de que falle algo. Se puede quitar pero es mejor dejarlo
    if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

    //esto de aqui es para q el usuario pueda seguir cambiando la fecha
    const handleDateChange = (event) => {
        setSelectedDate(event.target.value);
    };

    //Para manejar el turno
    const handleShiftChange = (event) => {
        setSelectedShift(event.target.value);
    };
    
    
    const handleTableDataChange = (timeSlot, field, value) => {
        setEditableData(prev => ({
            ...prev,
            [timeSlot]: {
                ...prev[timeSlot],
                [field]: value,
            },
        }));
    };
    
    
    const handleGuardar = async () => {
        if (selectedShift === '0' || !batch || supervisor === '0' || lider === '0') {
            alert('Por favor, selecciona Turno, Supervisor, Team Leader y completa Batch antes de guardar.');
            return;
        }

        // 1. arreglo de datos a enviar, FILTRANDO solo los slots editados
        const reportData = hours
            .map(timeSlot => {
                const editableRow = editableData[timeSlot] || {};
                
                // Chequea si el usuario ha ingresado Perdidas (debe ser > 0 o un número) o Observaciones (debe tener texto)
                const perdidasNum = parseInt(editableRow.perdidas) || 0;
                const observacionesTxt = editableRow.observaciones || '';
                
                const tieneDatosEditados = perdidasNum > 0 || observacionesTxt.trim().length > 0;

                if (!tieneDatosEditados) {
                    return null; // No enviar slots sin datos manuales
                }
                
                return {
                    Fecha: selectedDate,
                    Turno: selectedShift,
                    Hora_Slot: timeSlot,
                    Supervisor: supervisor,
                    Lider: lider,
                    Batch: batch, 
                    Modelo: modeloActual, 
                    
                    Perdidas: perdidasNum,
                    Observaciones: observacionesTxt,
                };
            })
            .filter(row => row !== null);

        if (reportData.length === 0) {
            alert('No hay datos nuevos o editados para guardar.');
            return;
        }

        // 2. Enviar a la API
        try {
            await axios.post('http://localhost:3001/api/guardar-reporte', reportData);
            alert('Reporte guardado exitosamente!');
            //Volvemos a consultar datos para refrescar la vista después de guardar
            consultarDatos(selectedDate, selectedShift); 
        } catch (err) {
            console.error("Error al guardar:", err);
            alert('Error al guardar el reporte. Revisa la consola del servidor y del navegador.');
        }
    };
    
    const getRealValue = (timeSlot) => {

        //Determinar la hora de inicio del slot:
        const slotStartHour = parseInt(timeSlot.split(':')[0], 10);
        
        //Busca el dato de producción real en el array 'data':
        const rowData = data.find(row => row.time_slot === timeSlot); 
        
        const realValue = rowData ? rowData.piezas_reales : 0; 

        //para colocar un 0 en automatico
        const isToday = selectedDate === getFormattedDate();
        
        // Si el valor es CERO, estamos en la hora actual (currentClientHour)
        // en el día de hoy, muestra '##'.
        if (realValue === 0 && isToday && slotStartHour === currentClientHour) {
            return '##'; // Indica que el tiempo aún está corriendo
        }

        // Muestra 0 si no hay valor real y ya pasó la hora (cierre de slot)
        if (realValue === 0 && isToday && slotStartHour < currentClientHour) {
            return 0; 
        }
        
        // Si no se cumple la condición anterior, devuelve el valor real
        return realValue; 
    };

    //Función para obtener el valor Meta ajustado (Running Rate)
    const getMetaValue = (timeSlot) => {
        const rowData = data.find(row => row.time_slot === timeSlot); 
        
        const metaAjustada = rowData ? rowData.Meta_Ajustada_Futura : 180;
        
        // Si ya existe producción real (> 0), mantenemos la meta estándar (180) para la hora transcurrida.
        if (rowData && rowData.piezas_reales > 0) {
            return 180;
        }
        
        // Para horas futuras o en curso con 0 piezas, retorna la meta ajustada
        return metaAjustada;
    };


    return (
        <div className="bodyTablaProd">
            <title>Tabla Productividad</title>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <img style={{ maxHeight: "60px" }} src={logoNidec} alt="Nidec ACIM Logo" />
                <h2 style={{ margin: 0, paddingRight: "130px" }}>Tabla de Productividad</h2>
                <div>
                    <a style={{ visibility: "hidden" }}>
                        <i className="fa-solid fa-arrow-left fa-3x" style={{ color: "#457a00" }}></i>
                    </a>
                    <a style={{ visibility: "hidden" }}>
                        <i className="fa-solid fa-arrow-right fa-3x" style={{ color: "#457a00" }}></i>
                    </a>
                </div>
            </div>

            {/* Título */}
            <div className="divTituloTablaProd">
                <p style={{ color: "#457a00", fontSize: "30px" }}>ELECTRONICS</p>

                <p>
                    <label>Linea:</label>
                    <select defaultValue="1">
                        <option value="0" disabled>--Seleciona una Línea--</option>
                        <option value="1">Ensamble Final</option>
                    </select>
                </p>
                
                <div>
                    <label>Batch: </label>
                    <input 
                        type="text" 
                        id="lblBatchActual" 
                        name="lblBatchActual" 
                        value={batch} 
                        onChange={(e) => setBatch(e.target.value)} 
                    />
                </div>
                <div><label>Modelo: </label><input type="text" id="lblModeloActual" value={modeloActual} name="lblModeloActual" disabled /></div>
            </div>
            <br />

            {/* Formulario inicial */}
            <div>
                <table>
                    <tbody>
                        <tr>
                            <td>Fecha:</td>
                            <td><input type="date" id="selectDate" name="selectDate" value={selectedDate} onChange={handleDateChange} /></td>
                        </tr>
                        <tr>
                            <td>Turno:</td>
                            <td>
                                <select value={selectedShift} onChange={handleShiftChange}>
                                    <option value="0" disabled>--Seleciona un Turno--</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>Supervisor:</td>
                            <td>
                                <select 
                                    id="slcSupervisorTabla" 
                                    value={supervisor} 
                                    onChange={(e) => setSupervisor(e.target.value)}
                                >
                                    <option value="0" disabled>--Selecciona un Supervisor--</option>
                                    <option value="Supervisor 1">Supervisor 1</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>Team Leader:</td>
                            <td>
                                <select 
                                    id="slcLiderTabla" 
                                    value={lider} 
                                    onChange={(e) => setLider(e.target.value)}
                                >
                                    <option value="0" disabled>--Selecciona un Lider--</option>
                                    <option value="Lider 1">Lider 1</option>
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <br />

            {/* Tabla de producción */}
            <div>
                <table className="tablaProduccion">
                    <caption>INFORMACION DE PRODUCCIÓN</caption>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Meta</th>
                            <th>Real</th>
                            <th>Perdidas</th>
                            <th>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hours.map((timeSlot, index) => {
                            const currentEditable = editableData[timeSlot] || {}; // Obtiene los datos editables de esta fila
                            
                            return (
                                <tr key={index}>
                                    <td>{timeSlot}</td>
                                    <td><b>{getMetaValue(timeSlot)}</b></td> 
                                    <td><b>{getRealValue(timeSlot)}</b></td> 
                                    
                                    {/* 2. INPUT PARA PÉRDIDAS */}
                                    <td>
                                        <input
                                            type="number"
                                            style={{ width: '80px', textAlign: 'center' }}
                                            value={currentEditable.perdidas || ''} 
                                            onChange={(e) => handleTableDataChange(timeSlot, 'perdidas', e.target.value)}
                                        />
                                    </td>
                                    
                                    {/* 3. INPUT PARA OBSERVACIONES */}
                                    <td>
                                        <input
                                            type="text"
                                            style={{ width: '150px' }}
                                            value={currentEditable.observaciones || ''}
                                            onChange={(e) => handleTableDataChange(timeSlot, 'observaciones', e.target.value)}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="div-btn-guardar">
                <button 
                    className="btnGuardarTablaProd" 
                    onClick={handleGuardar} // Asignamos la función de guardar al botón
                >
                    Guardar
                </button>
            </div>
        </div>
    );
};

export default TablaProd;