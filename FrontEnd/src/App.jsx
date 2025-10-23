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

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Routes>
      <Route path="/Tabla" element={<TablaProd />} />
      <Route path="/ElegirIdioma" element={<SelectIdioma />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Menu" element={<Menu />} />
      <Route path="/Dashboard" element={<SelectIdioma />} />
      <Route path="*" element={<SelectIdioma />} />
    </Routes>
    </>
  )
}

export default App
