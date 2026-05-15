// FrontEnd desarrollado por Alondra Romero y Jorge Barrón
import { useState } from 'react'
import { Routes, Route } from "react-router-dom";
import React from "react";
import { ProductionProvider } from '@context/ProductionContext'
import TablaProd from './Electronics/TablaElectronics';
import SelectIdioma from './pages/SelectLanguage';
import Login from './pages/Login';
import Menu from './pages/Menu';
import Dashboard from './pages/Dashboard';
import TablaProdCdu from './CDU/TablaCDU';
import TablaProdInsin from './Insinkerator/TablaInsinkerator';
import TablaProdRotorWet from './RotorWet/TablaRotorWet';
import TablaProdRotorIse from './RotorIse/TablaRotorISE';
import TablaEnsamble from './Ensamble/TablaEnsamble';


function App() {
  return (
    <>
    <ProductionProvider>
    <Routes>
      <Route path="/TablaElectronics" element={<TablaProd />} />
      <Route path="/TablaCDU" element={<TablaProdCdu />} />
      <Route path="/TablaEnsamble" element={<TablaEnsamble />} />
      <Route path="/TablaInsin" element={<TablaProdInsin />} />
      <Route path="/TablaRotorWet" element={<TablaProdRotorWet />} />
      <Route path="/TablaRotorIse" element={<TablaProdRotorIse />} />
      <Route path="/ElegirIdioma" element={<SelectIdioma />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Menu" element={<Menu />} />
      <Route path="/Dashboard" element={<Dashboard />} />
      <Route path="*" element={<TablaProd />} />
    </Routes>
    </ProductionProvider>
    </>
  )
}

export default App

/*

*/