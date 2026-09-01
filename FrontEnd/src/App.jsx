//react
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

//Production Context
import { ProductionProvider } from '@context/ProductionContext'

//Componentes principales
import GlobalDashboard from './pages/GlobalDashboard';
import { TablaGenericRouter } from './lines/TablaGeneric';

function App() {
  return (
    <>
      <ProductionProvider>
        <Routes>
          <Route path="/Dashboard" element={<GlobalDashboard />} />
          <Route path="/tabla/:lineId" element={<TablaGenericRouter />} />
          <Route path="*" element={<Navigate to="/tabla/electronics" replace />} />
        </Routes>
      </ProductionProvider>
    </>
  )
}

export default App;