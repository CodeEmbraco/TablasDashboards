// FrontEnd desarrollado por Alondra Romero y Jorge Barrón
import { useState } from 'react'
import { Routes, Route } from "react-router-dom";
import React from "react";
import logoNidec  from './assets/nidec-logo.png'
import TablaProd from './pages/TablaProd';
import SelectIdioma from './pages/SelectLanguage';
import Login from './pages/Login';
import Menu from './pages/Menu';
import Footer from './components/footer';
import Zero from './assets/zeroproductividad.png';
import Dashboard from './pages/Dashboard';
import TablaProdCdu from './CDU/TablaCDU';
import TablaProdInsin from './Insinkerator/TablaInsinkerator';
import TablaProdRotorWet from './RotorWet/TablaRotorWet';
import TablaProdRotorIse from './RotorIse/TablaRotorISE';
import TablaEnsamble from './Ensamble/TablaEnsamble';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Routes>
      <Route path="/Tabla" element={<TablaProd />} />
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
    </>
  )
}

export default App

/*

*/