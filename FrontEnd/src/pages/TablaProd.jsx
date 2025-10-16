import { useState } from 'react'
import { useEffect } from 'react';
import { Routes, Route } from "react-router-dom";
import React from "react";
import './TablaProd.css'
import logoNidec  from '../assets/nidec-logo.png'
import axios from 'axios';

const TablaProd = () => {

  useEffect(()=>{
    //Esta linea de aqui abajo es solo para cambiar el titulo de la pagina
    document.title="Tabla de Producción";

    //Variables de estado q voy a usar
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    //Aqui ya empezare a poner las llamadas a la API del back que se conecta al MySQL
    const consultarDatos = async () => {
      try{
        const respuesta = await axios.get("http://localhost:3001/api/productividad");
        setData(respuesta.data);
        setLoading(false);
      }catch (err){
        console.error("No se pudieron cargar los datos correctamente:", err);
        setError("Los datos del API no se cargaron correctamente");
        setLoading(false);
      }
    }

    consultarDatos();
  },[]);

  //Mientras esta cargando se mostrara este mensaje. Esto es opcional pero conviene dejarlo pq asi
  //si por x razon tarda mucho entraer los datos de la bd el usuario puede saber que esta cargando
  if (loading) return <p>Cargando datos...</p>;

  //Muestra el msj de error en caso de que falle algo. Se puede quitar pero es mejor dejarlo
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="bodyTablaProd">
      <title>Tabla Productividad</title>
      {/* Header */}
      <div  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <img style={{ maxHeight: "60px" }} src={logoNidec} alt="Nidec ACIM Logo" />
        <h2 style={{ margin: 0, paddingRight: "130px" }}>Tabla de Productividad</h2>
        <div>
          <a style={{ visibility: "hidden" }}>
            <i className="fa-solid fa-arrow-left fa-3x" style={{ color: "#457a00" }}></i>
          </a>
          <a style={{ visibility: "hidden" }}>
            <i className="fa-solid fa-arrow-right fa-3x" style={{ color: "#457a00" }}></i>
          </a>
        </div>
      </div>
 
      {/* Título */}
      <div className="divTituloTablaProd">
        <p style={{ color: "#457a00", fontSize: "30px" }}>ELECTRONICS</p>

        <p>
          <label>Linea:</label>
          <select defaultValue="0">
            <option value="0" disabled>--Seleciona una Línea--</option>
            <option value="1">Linea 1</option>
            <option value="2">Linea 2</option>
            <option value="3">Linea 3</option>
          </select>
        </p>
      </div>
      <br />
 
      {/* Formulario inicial */}
      <div>
        <table>
          <tbody>
            <tr>
              <td>Fecha:</td>
              <td><input type="date" id="selectDate" name="selectDate" /></td>
            </tr>
            <tr>
              <td>Turno:</td>
              <td>
                <select defaultValue="0">
                  <option value="0" disabled>--Seleciona un Turno--</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </td>
            </tr>
            <tr>
              <td>Supervisor:</td>
              <td><input type="text" /></td>
            </tr>
            <tr>
              <td>Team Leader:</td>
              <td><input type="text" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <br />
 
      {/* Tabla de producción */}
      <div>
        <table className="tablaProduccion">
          <caption>INFORMACION DE PRODUCCIÓN</caption>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Meta</th>
              <th>Real</th>
              <th>Modelo</th>
              <th>Perdidas</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2:00-3:00</td><td><b>180</b></td><td><b>##</b></td><td></td><td></td><td></td>
            </tr>
            <tr>
              <td>3:00-4:00</td><td><b>180</b></td><td><b>##</b></td><td></td><td></td><td></td>
            </tr>
            <tr>
              <td>4:00-5:00</td><td><b>180</b></td><td><b>##</b></td><td></td><td></td><td></td>
            </tr>
            <tr>
              <td>5:00-6:00</td><td><b>180</b></td><td><b>##</b></td><td></td><td></td><td></td>
            </tr>
            <tr>
              <td>6:00-7:00</td><td><b>180</b></td><td><b>##</b></td><td></td><td></td><td></td>
            </tr>
            <tr>
              <td>7:00-8:00</td><td><b>180</b></td><td><b>##</b></td><td></td><td></td><td></td>
            </tr>
            <tr>
              <td>8:00-9:00</td><td><b>180</b></td><td><b>##</b></td><td></td><td></td><td></td>
            </tr>
            <tr>
              <td>9:00-10:00</td><td><b>180</b></td><td><b>##</b></td><td></td><td></td><td></td>
            </tr>
            <tr>
              <td>10:00-11:00</td><td><b>180</b></td><td><b>##</b></td><td></td><td></td><td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
 
export default TablaProd;