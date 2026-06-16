import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Utensils, Info, ShieldCogCorner } from 'lucide-react';
import './Manual.css';

import paso1 from './placeholder.png';
import delta from './img/delta.png';
import desglosemetas from './img/desglosemetas.png';
import desgloseperdidas from './img/desgloseperdidas.png';
import desglosetabla from './img/desglosetabla.png';
import desgloseturnos from './img/desgloseturnos.png';
import guardarreporte from './img/guardarreporte.png';
import selectores from './img/selectores.png';
import tabla from './img/tabla.png'
import widgetsproduccion from './img/widgetsproduccion.png';
import modal from './img/modal.png';
import adminlogin from './img/adminlogin.png';
import admintimer from './img/admintimer.png';
import adminbutton from './img/adminbutton.png';
import ajustarMeta from './img/ajustarMeta.png';
import modifyGoal from './img/modifyGoal.png';


const Manual = ({ isOpen, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const steps = [
        //{ title: "Paso 1: Inicio de Sesión", image: paso1, desc: "Ingrese sus credenciales y seleccione la línea asignada." },
        { title: "Overview de la Tabla de Productividad",
            image: tabla,
            desc: "La tabla de productividad muesta la información de la producción de la línea seleccionada. A continuación se explican sus elementos:" },
        { title: "Selectores",
            image: selectores,
            desc: `• <strong>Fecha y Turno</strong>: Selectores de la fecha y turno de la producción a consultar.
            \n• <strong>Supervisor y Team Leader</strong>: Contiene los nombres del personal respectivamente. Para guardar reportes, debe haber seleccionado una opción en cada uno.
            \n• <strong>Línea</strong>:  La línea de producción a consultar.` },
        { title: "Indicadores de Producción", 
            image: widgetsproduccion, 
            desc: `•<strong> META</strong>: Muestra el objetivo de producción para la línea seleccionada. Se calcula en base a las metas individuales por cada hora y se va sumando el acumulado cada 15 min
            •<strong> REAL</strong>: Muestra la producción real obtenida en la línea seleccionada.
            •<strong> PÉRDIDAS</strong>: Muestra los minutos totales donde la línea no estuvo en funcionamiento.` },
        { title: "Delta", 
            image: delta, 
            desc: (
                <>
                <p>Muestra la diferencia entre la producción real y la meta, incluye el desglose de la producción real por turno de la fecha seleccionada. El color indica el estado de la producción real en comparación con la meta:</p>
                <p>•<strong style={{color:'#4caf50'}}>Verde</strong>: La producción real supera la meta.</p>
                <p>•<strong style={{color:'#fbc02d'}}>Amarillo</strong>: La producción real es menor que la meta pero mayor del 90%.</p>
                <p>•<strong style={{color:'#f44336'}}>Rojo</strong>: La producción real es menor al 90% de la meta.</p>

            </>
            ) },
        { title: "Desglose de turnos", 
            image: desgloseturnos, 
            desc: (

                <>
                <p>Es posible deshabilitar los turnos que no tengan producción y evitar el impacto en los indicadores con información incompleta o errónea.</p>
                <p>El usuario debe hacer <strong>Click</strong> en el ícono de la fila del turno para deshabilitarlo.</p>
                <p>Para habilitar o deshabilitar los turnos, son necesarios los <strong style={{color: 'teal'}}>Permisos de Administrador<ShieldCogCorner/></strong></p>
                
                </>

            ) },
        { title: "HxH de Producción", 
            image: desglosetabla, 
            desc: "La tabla del HxH se divide en dos secciones: Información de Producción y Desglose de Pérdidas." },
        { title: "Información de Producción", 
            image: desglosemetas, 
            desc: (
                <>
                    <p>• <strong>Hora</strong>: La hora de la producción a consultar.</p>
                    <p>• <strong>Plan</strong>: La meta individual de cada hora del turno actual.</p>
                    <p>• <strong>Real</strong>: La producción real obtenida de cada hora del turno actual.</p>
                    <p>• <strong>Modelo</strong>: El modelo o los modelos de los componentes producidos para la hora seleccionada.</p>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '5px' }}> 
                        •<div style={{border: "2px solid #39bc4d" , borderRadius: "5px", justifyContent: "space-between", paddingInline:"5px", paddingBlockStart:"2px"}}>
                        <Utensils size={20} color="#39bc4d" strokeWidth={4} /> 
                        </div>Indica la hora de la comida, para cambiarla, haga <strong>Click</strong> en la celda de hora deseada
                    </p>
                </>
            ) },
        { title: "Desglose de Pérdidas", 
            image: desgloseperdidas, 
            desc: (
                <>
                <p>• <strong>Pérdidas</strong>: Minutos de pérdidas en la hora</p>
                <p>• <strong>Observaciones</strong>: Detalle del motivo de pérdidas registrados por el operador</p>
                <p>• <strong>Acciones</strong>: El usuario debe de hacer <strong>Click</strong> en el ícono ⚙️ para registrar pérdidas en la hora seleccionada.</p>
                </>
            )},
        { title: "Añadir Pérdidas", 
            image: modal, 
            desc: (
                <>
                <p>Para registrar una pérdida se siguen los siguientes pasos:</p>
                    <p>1. Introduzca los minutos.
                        <br />2. Seleccione el <strong>Motivo</strong> de la lista.
                        <br />3. Escriba una descripción del motivo de la pérdida.
                        <br />4. Hacer <strong>Click</strong> en <strong>Agregar</strong>, puede agregar varias pérdidas en la misma hora.
                        <br />5. Para registrar las pérdidas, haga <strong>Click</strong> en <strong>Aceptar</strong>.
                    </p>
                </>
            )},
        { title: "Guardar Reporte", 
            image: guardarreporte, 
            desc: (
                <>
                <p>Si el turno ha concluido, para guardar el reporte de pérdidas haga <strong>Click</strong> en <strong>Guardar Reporte</strong>.</p>
                {/* <p><strong style={{color: 'red'}}><Info style={{paddingTop:'10px'}}/> IMPORTANTE: SOLO GUARDAR REPORTE CUANDO SE TENGAN TODAS LAS PÉRDIDAS REGISTRADAS AL FINAL DEL TURNO</strong></p> */}
                </>
            ) },
        { title: "Permisos de Administrador", 
        image: adminbutton, 
        desc: (
            <>
                <p>
                El administrador tiene los permisos para <strong>Agregar</strong> y/o <strong>Modificar</strong> las metas de producción.
                Esto con el fin de presentar la información de la producción de la forma mas precisa y justa posible.
                </p>
            </>
        ) },
        { title: "Login de Administrador", 
        image: adminlogin, 
        desc: (
            <>
                <p>Para acceder a los <strong style={{color: 'teal'}}>permisos de administrador<ShieldCogCorner/></strong>, es necesario un <strong>usuario</strong> y una <strong>contraseña</strong> válida.</p>
            </>
        ) },
        { title: "Límite de tiempo de sesión de Administrador", 
        image: admintimer, 
        desc: (
            <>
            <p>Por seguridad, los <strong style={{color: 'teal'}}>permisos de administrador<ShieldCogCorner/></strong> manejan un límite de tiempo para poder realizar las modificaciones a las metas y a los turnos.</p>
            <p>Para desactivar los <strong style={{color: 'teal'}}>permisos de administrador<ShieldCogCorner/></strong>, haga <strong>Click</strong> en el ícono de <strong style={{color: 'red'}}>X</strong> </p>
            </>
        ) },
        { title: "Ajustar Metas", 
        image: ajustarMeta, 
        desc: (
            <>
            <p>Para acceder a la ventana de configuración de metas, son necesarios los <strong style={{color: 'teal'}}>permisos de administrador<ShieldCogCorner/></strong> ; de otra forma, el botón permanecerá deshabilitado.</p>
            </>
        ) },
        { title: "Configuración de Metas", 
        image: modifyGoal, 
        desc: (
            <>
                <p>Las opciones de configuración de las metas son las siguientes:<br/>
                • <strong>Metas Custom</strong>: Agregar una meta <strong>ÚNICA</strong> en una hora y día específicos.<br/>
                • <strong>Metas Default (Hora)</strong>: Modifica la meta de una hora específica.<br/>        
                • <strong>Metas Default (Turno)</strong>: Modifica la meta de todas las horas de un turno específico.</p>
                <p><strong style={{color: 'red'}}><Info style={{paddingTop:'10px'}}/> IMPORTANTE: MODIFICAR UNA META DEFAULT CAMBIA TANTO LAS METAS HISTÓRICAS COMO FUTURAS <br/> ¡PROCEDE CON CUIDADO!</strong></p>
            </>
        ) },
        // Agregar más páginas aquí...
    ];
    

    if (!isOpen) return null;

    const nextStep = () => {
        if (currentIndex < steps.length - 1) setCurrentIndex(currentIndex + 1);
    };

    const prevStep = () => {
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                
                <button className="modal-close-icon" onClick={onClose}>
                <X size={28} />
                </button>

                <div className="modal-header">
                <h2>{steps[currentIndex].title}</h2>
                <span className="step-counter">Página {currentIndex + 1} de {steps.length}</span>
                </div>

                <div className="carousel-grid">
                <button 
                    className="nav-arrow" 
                    onClick={prevStep} 
                    disabled={currentIndex === 0}
                >
                    <ChevronLeft size={48} />
                </button>

                <div className="image-container">
                    <img 
                    src={steps[currentIndex].image} 
                    alt="Instrucción" 
                    className="manual-image" 
                    />
                </div>

                <button 
                    className="nav-arrow" 
                    onClick={nextStep} 
                    disabled={currentIndex === steps.length - 1}
                >
                    <ChevronRight size={48} />
                </button>
                </div>

                <div className="modal-footer">
                <div className="manual-step-text">
                    {typeof steps[currentIndex].desc === 'string' ? (
                        steps[currentIndex].desc.split('\n').map((paragraph, index) => (
                            <p key={index} dangerouslySetInnerHTML={{ __html: paragraph }} />
                        ))
                    ) : (
                        steps[currentIndex].desc
                    )}
                </div>
                <div className="carousel-dots">
                    {steps.map((_, index) => (
                    <span key={index} className={`dot ${index === currentIndex ? 'active' : ''}`} />
                    ))}
                </div>
                </div>
            </div>
            </div>
);
};

export default Manual;