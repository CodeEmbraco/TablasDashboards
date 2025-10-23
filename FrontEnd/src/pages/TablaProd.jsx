import { useState, useEffect } from 'react';
import React from "react";
import './TablaProd.css'
import logoNidec from '../assets/nidec-logo.png'
import axios from 'axios';
import Footer from '../components/footer';

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
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modeloActual, setModeloActual] = useState('');
    const [selectedDate, setSelectedDate] = useState(getFormattedDate());//esta es la d la fecha
    const [selectedShift, setSelectedShift] = useState(getCurrentShift()); //para el turno automatico
    const [currentClientHour, setCurrentClientHour] = useState(new Date().getHours());


    //Horas 
    const hours = selectedShift !== '0' ? generateHourSlots(selectedShift) : [];

    //Función de consulta principal
    const consultarDatos = async (fecha, turno) => {
        // Cambiamos loading a true al inicio de la consulta
        setLoading(true); 
        try {
            // Usamos tu nuevo endpoint y enviamos los parámetros
            const url = `http://localhost:3001/api/produccion-real?fecha=${fecha}&turno=${turno}`;
            const respuesta = await axios.get(url);
            
            //json con datos completos
            setData(respuesta.data);
            
            setLoading(false);
            setError(null);
        } catch (err) {
            console.error("No se pudieron cargar los datos correctamente:", err);
            setError("Los datos del API no se cargaron correctamente");
            setLoading(false);
        }
    }

    useEffect(() => {
        //Esta linea de aqui abajo es solo para cambiar el titulo de la pagina
        document.title = "Tabla de Producción";

        const obtenerModeloActual = async () => {
            try {
                const respuesta = await axios.get("http://localhost:3001/api/getModeloElectronics");
                setModeloActual(respuesta.data[0].Model);
                // NOTA: No hacemos setLoading(false) aquí, lo dejamos para el consultarDatos
            } catch(err) {
                console.error("No se pudo cargar el modelo correctamente:", err);
                setError("El modelo actual no se cargo correctamente. Revisa la conexion");
                setLoading(false); // Detenemos la carga si esto falla
            }
        }

        obtenerModeloActual();
        
        if (selectedShift !== '0') { 
            consultarDatos(selectedDate, selectedShift);
        }
        
    }, [selectedDate, selectedShift]); // Dependencias: Se ejecuta al inicio y cuando cambian fecha o turno

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
    
    
    const getRealValue = (timeSlot) => {

        //Determinar la hora de inicio del slot:
        const slotStartHour = parseInt(timeSlot.split(':')[0], 10);
        
        //Busca el dato de producción real en el array 'data':
        const rowData = data.find(row => row.time_slot === timeSlot); 
        
        const realValue = rowData ? rowData.piezas_reales : 0; 

        //para colocar un 0 en automatico
        const isToday = selectedDate === getFormattedDate();
        
        // Si el valor es CERO, estamos en el día/turno actual, y la hora de inicio del slot
        // es mayor o igual a la hora actual del cliente, muestra '##'.
        if (realValue === 0 && isToday && slotStartHour >= currentClientHour) {
            // Nota: Aquí estamos asumiendo que un valor de 0 significa 'aún no ha pasado' o 'no se ha producido nada'.
            // Si el turno cruza la medianoche (Turno 3), esta lógica es simple y funcional para el día de hoy.
            return '##'; // Indica que el tiempo aún no ha transcurrido
        }
        
        // Si no se cumple la condición anterior, devuelve el valor real (0 si no se encontró, o el número si existe)
        return realValue; 
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
                <div><label>Batch: </label><input type="text" id="lblBatchActual" name="lblBatchActual" /></div>
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
                                <select id="slcSupervisorTabla" defaultValue="0">
                                    <option value="0" disabled>--Selecciona un Supervisor--</option>
                                    <option value="Supervisor 1">Supervisor 1</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td>Team Leader:</td>
                            <td>
                                <select id="slcLiderTabla" defaultValue="0">
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
                        {hours.map((timeSlot, index) => (
                            <tr key={index}>
                                <td>{timeSlot}</td>
                                <td><b>180</b></td>
                                
                                <td><b>{getRealValue(timeSlot)}</b></td> 
                                
                                <td></td>
                                <td></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="div-btn-guardar">
                <button className="btnGuardarTablaProd" >Guardar</button>
            </div>
            
        </div>
    );
};

export default TablaProd;