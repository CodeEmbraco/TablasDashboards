// FrontEnd desarrollado por Alondra Romero y Jorge Barrón
import { useState } from 'react'
import { Routes, Route } from "react-router-dom";
import React from "react";
import { ProductionProvider } from '@context/ProductionContext'
import TablaElectronics from './lines/Electronics/TablaElectronics';
// import SelectIdioma from './pages/deprecated/SelectLanguage';
// import Login from './pages/deprecated/Login';
// import Menu from './pages/deprecated/Menu';
// import Dashboard from './pages/deprecated/Dashboard';
import TablaProdCdu from './lines/CDU/TablaCDU';
import TablaInsinkerator from './lines/Insinkerator/TablaInsinkerator';
// import TablaProdRotorWet from './lines/RotorWet/TablaRotorWet';
// import TablaProdRotorIse from './lines/RotorIse/TablaRotorISE';
import TablaEnsamble from './lines/Ensamble/TablaEnsamble';
import TablaThermo from './lines/Thermofisher/TablaThermo';
import TablaECMFAN from './lines/ECMFAN/TablaECMFAN';
import GlobalDashboard from './pages/GlobalDashboard';
import { TablaGenericRouter } from './lines/TablaGeneric';



function App() {
  return (
    <>
    <ProductionProvider>
    <Routes>
      <Route path="/TablaElectronics" element={<TablaElectronics />} />
      <Route path="/TablaCDU" element={<TablaProdCdu />} />
      <Route path="/TablaEnsamble" element={<TablaEnsamble />} />
      <Route path="/TablaThermo" element={<TablaThermo />} />
      <Route path="/TablaInsin" element={<TablaInsinkerator />} />
      {/* <Route path="/TablaRotorWet" element={<TablaProdRotorWet />} />
      <Route path="/TablaRotorIse" element={<TablaProdRotorIse />} /> */}
      <Route path="/TablaECMFAN" element={<TablaECMFAN />} />
      {/* <Route path="/ElegirIdioma" element={<SelectIdioma />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Menu" element={<Menu />} /> */}
      <Route path="/Dashboard" element={<GlobalDashboard />} />
      {/* Ruta genérica: /tabla/:lineId (ej: /tabla/cdu, /tabla/electronics, /tabla/insinkerator) */}
      <Route path="/tabla/:lineId" element={<TablaGenericRouter />} />
      <Route path="*" element={<TablaElectronics />} />
    </Routes>
    </ProductionProvider>
    </>
  )
}

export default App;