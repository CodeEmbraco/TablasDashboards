import { useState } from 'react'
import { Routes, Route } from "react-router-dom";
import React from "react";
import './SelectLanguage.css'
import logoNidec  from '../assets/nidec-logo.png'

const SelectIdioma = () => {
  return (
    <>
    <title>Elegir Idioma</title>
    <body className='bodySelectIdioma'>
        <div id="lang-screen" className="centeredSelectIdioma">
            <div className="logoSelectIdioma">
                <img src={logoNidec} alt="Nidec ACIM Logo"></img>
            </div>
            <h2>SELECCIONA UN IDIOMA</h2>
            <button class="buttonSelectIdioma">Español</button>
            <button class="buttonSelectIdioma">Inglés</button>
            <button class="buttonSelectIdioma">Portugués</button>
        </div>
    </body>
    </>
  );
};
 
export default SelectIdioma;