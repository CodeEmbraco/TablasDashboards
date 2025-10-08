import { useState } from 'react'
import { Routes, Route } from "react-router-dom";
import React from "react";
import logoNidec  from './assets/nidec-logo.png'
import TablaProd from './pages/TablaProd';
import SelectIdioma from './pages/SelectLanguage';
import Login from './pages/Login';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Routes>
      <Route path="/Tabla" element={<TablaProd />} />
      <Route path="/ElegirIdioma" element={<SelectIdioma />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/Menu" element={<SelectIdioma />} />
      <Route path="/Dashboard" element={<SelectIdioma />} />
      <Route path="*" element={<SelectIdioma />} />
    </Routes>
    </>
  )
}

export default App
