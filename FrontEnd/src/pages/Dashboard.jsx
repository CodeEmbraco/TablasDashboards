import React, { useState, useEffect } from "react";
import './Dashboard.css';
import logoNidec from '../assets/nidec-logo.png';
import Footer from '../components/footer';
import Zero from '../assets/zeroproductividad.png';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

// Componente Reloj
const Reloj = () => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <div className="reloj">{currentTime}</div>;
};

const Dashboard = () => {

  // estados de datos
  const [productivityData, setProductivityData] = useState([0, 0, 0]); 
  const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [currentModel, setCurrentModel] = useState("---");
  
  // estados para el downtime
  const [downtimeLabels, setDowntimeLabels] = useState([]);
  const [downtimeValues, setDowntimeValues] = useState([]);

  // logica de target y estados de kpi
  const [goalPerHour, setGoalPerHour] = useState(180); 
  const [isEditingTarget, setIsEditingTarget] = useState(false); 
  
  const [kpiMetrics, setKpiMetrics] = useState({
    target: 0,
    actual: 0,
    oee: 0,
    adherence: 0,
    currentShiftIndex: 0 
  });

  //definir los horarios por turnos
  const shiftSlots = {
    1: ['06:00-07:00', '07:00-08:00', '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00'],
    2: ['14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00', '21:00-22:00', '22:00-23:00'],
    3: ['23:00-00:00', '00:00-01:00', '01:00-02:00', '02:00-03:00', '03:00-04:00', '04:00-05:00', '05:00-06:00']
  };

  // conexion al backendd
  useEffect(() => {
    const fetchData = async () => {
      try {
        //datos de turnos
        const resTurnos = await fetch('http://localhost:3002/api/dashboard/productivity-shifts');
        const dataTurnos = await resTurnos.json();
        setProductivityData(dataTurnos);

        // datos semanales
        const resWeekly = await fetch('http://localhost:3002/api/dashboard/weekly-production');
        const dataWeekly = await resWeekly.json();
        setWeeklyData(dataWeekly);

        //modelo actual
        const resModel = await fetch('http://localhost:3002/api/dashboard/current-model');
        if (resModel.ok) {
            const dataModel = await resModel.json();
            setCurrentModel(dataModel.model);
        }

        //downtime - perdidass
        const resDown = await fetch('http://localhost:3002/api/dashboard/downtime');
        if (resDown.ok) {
            const dataDown = await resDown.json();
            processDowntimeData(dataDown.shift, dataDown.data);
        }

      } catch (error) {
        console.error("Error al obtener datos:", error);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 60000); 
    return () => clearInterval(interval);
  }, []);

  // Función auxiliar para procesar los datos de Downtime
  const processDowntimeData = (shift, dbRows) => {
    // obterner los slots base de los turnos
    const slots = shiftSlots[shift] || shiftSlots[1];
    
    //limpiar etiquetas para eje x
    const labels = slots.map(slot => slot.split('-')[0]);

    //mapear los valores de la bd
    const values = slots.map(slot => {
        // Buscamos si existe registro en la BD 
        const row = dbRows.find(r => r.Hora_Slot === slot);
        return row ? row.total_perdidas : 0;
    });

    setDowntimeLabels(labels);
    setDowntimeValues(values);
  };

  //logica de kpis
  useEffect(() => {
    const calculateKPIs = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      let shiftIndex = 0;      
      let shiftDuration = 8;   
      let hoursElapsed = 0;    

      if (currentHour >= 6 && currentHour < 14) {
        shiftIndex = 0; 
        shiftDuration = 8;
        hoursElapsed = currentHour - 6 + (now.getMinutes() / 60);
      } else if (currentHour >= 14 && currentHour < 23) {
        shiftIndex = 1;
        shiftDuration = 9;
        hoursElapsed = currentHour - 14 + (now.getMinutes() / 60);
      } else {
        shiftIndex = 2;
        shiftDuration = 7;
        if (currentHour >= 23) {
           hoursElapsed = currentHour - 23 + (now.getMinutes() / 60);
        } else {
           hoursElapsed = (24 - 23) + currentHour + (now.getMinutes() / 60);
        }
      }

      const currentActual = productivityData[shiftIndex] || 0;
      const totalShiftTarget = Math.round((shiftDuration * goalPerHour) - (0.5 * goalPerHour));
      const effectiveHours = hoursElapsed > shiftDuration ? shiftDuration : hoursElapsed;
      const expectedSoFar = effectiveHours * goalPerHour; 
      
      let adherenceVal = 0;
      if (expectedSoFar > 0) adherenceVal = (currentActual / expectedSoFar) * 100;
      
      let oeeVal = 0;
      if (totalShiftTarget > 0) oeeVal = (currentActual / totalShiftTarget) * 100;

      setKpiMetrics({
        target: totalShiftTarget,
        actual: currentActual,
        oee: oeeVal.toFixed(1),
        adherence: adherenceVal.toFixed(1),
        currentShiftIndex: shiftIndex
      });
    };

    calculateKPIs();
    const timer = setInterval(calculateKPIs, 1000);
    return () => clearInterval(timer);
  }, [productivityData, goalPerHour]); 


  // manejadores
  const handleTargetDoubleClick = () => setIsEditingTarget(true);
  const handleTargetChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) setGoalPerHour(val);
  };
  const handleTargetBlur = () => setIsEditingTarget(false);
  const handleKeyDown = (e) => { if (e.key === 'Enter') setIsEditingTarget(false); };
  
  const getDashboardTheme = () => {
    const value = parseFloat(kpiMetrics.adherence);
    if (isNaN(value) || value >= 80) return 'theme-green';
    if (value >= 50) return 'theme-yellow';
    return 'theme-red';
  };


  //* GRAFICAS
  
  //grafica DOWNTIME 
  const dataDowntime = {
    labels: downtimeLabels, 
    datasets: [{
      label: 'Perdidas',
      data: downtimeValues, 
      borderColor: '#dc3545', // Rojo para PERDIDAS
      backgroundColor: '#dc3545',
      tension: 0.1,
      pointRadius: 5
    }]
  };

  const dataScrap = {
    labels: ['06:00', '07:00', '08:00', '09:00', '10:00','11:00','12:00','13:00','14:00'],
    datasets: [
      {
        label: 'Pieza/Linea1',
        data: [7, 25, 30, 18, 34, 27, 36, 14, 22, 12],
        borderColor: '#039645',
        backgroundColor: '#039645',
      },
      {
        label: 'Pieza/Linea2',
        data: [15, 3, 22, 31, 28, 19, 12, 36, 15, 25],
        borderColor: '#000000',
        backgroundColor: '#000000',
      }
    ]
  };

  const dataToolCrib = {
    labels: ['Elemento 1', 'Elemento 2', 'Elemento 3', 'Elemento 4', 'Elemento 5'],
    datasets: [{
      label: 'Serie 1',
      data: [0, 12, 38, 30, 32],
      borderColor: '#4caf50',
      backgroundColor: '#4caf50',
    }]
  };

  const dataProductivity = {
    labels: [
      `Turno 1 (${productivityData[0]})`, 
      `Turno 2 (${productivityData[1]})`, 
      `Turno 3 (${productivityData[2]})`
    ],
    datasets: [{
      label: 'Produced Pieces',
      data: productivityData,
      backgroundColor: '#4caf50'
    }]
  };

  const dataDailyProduction = {
    labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    datasets: [{
        label: 'Producción',
        data: weeklyData,
        backgroundColor: '#039645',
        barPercentage: 0.6, 
    }]
  };

  const optionsResponsive = { responsive: true, maintainAspectRatio: false };
  const optionsHorizontal = { indexAxis: 'y', responsive: true, maintainAspectRatio: false };

  return (
    <>
    <div className='bodyDashboardElec'>
        <header className="headerDashboardElectronics">
            <img src={logoNidec} alt="Nidec ACIM Logo" className="logoTablaProd" />
            <h2 className="tituloPrincipalDashboardElectronics">ELECTRONICS PRODUCTION DASHBOARD</h2>
        </header><br></br>

        <div className='divPrincipalDashboard'>

          {/* Grafico 1: Downtime */}
          <div className='cardDashboard'>
            <div className='tituloDashboard'>PERDIDAS</div>
            <div style={{ height: '300px', width: '100%' }}> 
                <Line data={dataDowntime} options={optionsResponsive} />
            </div>
          </div>

          {/* Sección Central: OEE */}
          <div className={`dashboardOEE ${getDashboardTheme()}`}>
            <div className='dashboardOEE-Header'>
              <div className='tituloDashboard'>END OF LINE DASHBOARD</div>
              <div className='right-headerDash'>
                <img src={Zero} alt="Zero Productividad"  />
                <div className='modelBoxDash'>Model: <br></br>{currentModel}</div>
              </div>
            </div>
            <div className='box highlight'>
              <div>ADHERENCE:</div><div className='large'>{kpiMetrics.oee}%</div>
            </div>
            <div className='box target' onDoubleClick={handleTargetDoubleClick} style={{ cursor: 'pointer' }}>
              <div>TARGET (turno: {kpiMetrics.currentShiftIndex + 1}):</div>
              {isEditingTarget ? (
                <input type="number" value={goalPerHour} onChange={handleTargetChange} onBlur={handleTargetBlur} onKeyDown={handleKeyDown} autoFocus style={{ fontSize: '24px', width: '80px', textAlign: 'center' }} />
              ) : (<div className='large'>{kpiMetrics.target}</div>)}
              <div style={{ fontSize: '12px', marginTop: '5px' }}>(Base: {goalPerHour}/hr)</div>
            </div>
            <div className='box highlight'>
              <div>OEE:</div><div className='large'>{kpiMetrics.adherence}%</div>
            </div>
            <div className='box actualDash'>
              <div>ACTUAL:</div><div className='large'>{kpiMetrics.actual}</div>
            </div>
            <div className='rejection'>
              <div>REJECTION: <span>0%</span></div><Reloj />
            </div>
          </div>

          {/* Otros Graficos */}
          <div className='cardDashboard'>
            <div className='tituloDashboard'>Scrap Cost Per Piece</div>
            <div style={{ height: '300px', width: '100%' }}>
                <Line data={dataScrap} options={optionsResponsive} />
            </div>
          </div>
          <div className='cardDashboard'>
            <div className='tituloDashboard'>Tool Crib Per Piece</div>
            <div style={{ height: '300px', width: '100%' }}>
                <Line data={dataToolCrib} options={optionsResponsive} />
            </div>
          </div>
          <div className='cardDashboard'>
            <div className='tituloDashboard'>Productivity of the day</div>
            <div style={{ height: '300px', width: '100%' }}>
                <Bar data={dataProductivity} options={optionsResponsive} />
            </div>
          </div>
          <div className='cardDashboard'>
            <div className='tituloDashboard'>Daily Production Product Pieces</div>
            <div style={{ height: '300px', width: '100%' }}>
                <Bar data={dataDailyProduction} options={optionsHorizontal} />
            </div>
          </div>

        </div>
    <Footer></Footer>
    </div>
    </>
  );
};

export default Dashboard;