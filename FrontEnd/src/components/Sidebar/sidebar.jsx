import React from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Cpu, 
  Database, 
  Component, 
  Thermometer, 
  Wrench, 
  Wind,
  Activity,
  X
} from "lucide-react";
import "./sidebar.css";

const Sidebar = ({ isOpen, onClose }) => {
  const menuItems = [
    {
      title: "General",
      links: [
        { path: "/Dashboard", label: "Dashboard Global", icon: LayoutDashboard }
      ]
    },
    {
      title: "Líneas de Producción",
      links: [
        { path: "/tabla/electronics", label: "Electronics", icon: Cpu },
        { path: "/tabla/cdu", label: "CDU", icon: Database },
        { path: "/tabla/preensamble", label: "Pre-Ensamble", icon: Component },
        { path: "/tabla/thermo", label: "Thermofisher", icon: Thermometer },
        { path: "/tabla/insi", label: "Insinkerator", icon: Wrench },
        { path: "/tabla/ecmfan", label: "ECM Fan", icon: Wind }
      ]
    }
  ];

  return (
    <>
      {/* Fondo desenfocado translúcido */}
      <div 
        className={`sidebar-backdrop ${isOpen ? "show" : ""}`} 
        onClick={onClose}
      />

      {/* Menú lateral deslizable */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <Activity className="sidebar-icon" style={{ color: "#38bdf8" }} />
            <span className="sidebar-brand-text">Nidec Dashboards</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((section, secIdx) => (
            <div key={secIdx} className="sidebar-section">
              <div className="sidebar-section-title">{section.title}</div>
              {section.links.map((link, linkIdx) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={linkIdx}
                    to={link.path}
                    className={({ isActive }) => 
                      `sidebar-link ${isActive ? "active" : ""}`
                    }
                    onClick={onClose} // Cierra el menú al hacer clic en un enlace
                  >
                    <Icon className="sidebar-icon" />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
