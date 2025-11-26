import { useState } from 'react'
import { Routes, Route } from "react-router-dom";
import React from "react";
import './Dashboard.css'
import logoNidec  from '../assets/nidec-logo.png'
import Footer from '../components/footer';
import Zero from '../assets/zeroproductividad.png';

//FrontEnd por Alondra Romero y Jorge Barrón 

const Dashboard = () => {
  return (
    <>
    <div className='bodyDashboardElec'>
        <header className="headerDashboardElectronics">
            <img src={logoNidec} alt="Nidec ACIM Logo" className="logoTablaProd" />
            <h2 className="tituloPrincipalDashboardElectronics">ELECTRONICS PRODUCTION DASHBOARD</h2>
        </header>

        <div></div>

    <Footer></Footer>
    </div>
    </>
  );
};
 
export default Dashboard;