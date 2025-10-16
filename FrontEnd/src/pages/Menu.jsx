import { useState } from 'react'
import { Routes, Route } from "react-router-dom";
import React from "react";
import './Menu.css'
import logoNidec  from '../assets/nidec-logo.png'

const Menu = () => {
  return (
    <>
        <div class="logoMenu">
            <img src={logoNidec} alt="Nidec ACIM Logo" />
        </div>

        <h2 className='h2Menu'>SELECCIONA LA LÍNEA DE PRODUCCIÓN</h2><br/><br/>

        <div className="contenedorMenu">
            <div className="columnaMenu">
                <a className="buttonMenu submit-btn" onclick="window.modal.showModal();">FAN</a>
                <a className="buttonMenu submit-btn" onclick="window.modal.showModal();">CDU's</a>
                <a className="buttonMenu submit-btn" onclick="window.modal.showModal();">ROTOR WET</a>
            </div>

            <div className="columnaMenu">
                <a className="buttonMenu submit-btn" href="">ELECTRONICS</a>
                <a className="buttonMenu submit-btn" onclick="window.modal.showModal();">PRE-ENSAMBLE</a>
                <a className="buttonMenu submit-btn" onclick="window.modal.showModal();">INSIKERATOR</a>
            </div>
        </div>

        <dialog id="modal">
            <h2>SIN ACCESO A ESTA LÍNEA DE PRODUCCIÓN.<br/> INTENTE DE NUEVO</h2>
            <button className="buttonMenu submit-btn" onclick="window.modal.close();">Cerrar</button>
        </dialog>
    </>
  );
};
 
export default Menu;