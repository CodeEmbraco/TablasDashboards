import { useState } from 'react'
import { useEffect } from 'react';
import { Routes, Route } from "react-router-dom";
import React from "react";
import './Login.css'
import logoNidec  from '../assets/nidec-logo.png'

const Login = () => {

    useEffect(()=>{
        document.title="Iniciar Sesion";
    },[]);

  return (
    <>
    <div className='bodyLogin'>
        <div id="login-screen" class="hidden">
            <div class="logoLogin">
                <img src={logoNidec} alt="Nidec ACIM Logo"></img>
            </div>

            <div class="login-title">
                <h2>¡BIENVENIDO!</h2>
                <p>FAVOR DE INGRESAR SUS CREDENCIALES</p>
            </div>

            <div class="login-container">
                <input name="txtLoginUser" placeholder={"Usuario"}/>
                <input name="txtLoginPass" placeholder={"Contraseña"}/>
                <span class="link">Olvidé mi contraseña</span>
                <a class="buttonLogin" href="./menu.html">Ingresar</a>
            </div>
        </div>
    </div>
    </>
  );
};
 
export default Login;