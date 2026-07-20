import React, { useState } from "react";
import { Menu } from "lucide-react";
import './Header.css';
import logoNidec from '@assets/nidecacim_white.png';
import Zero from '@assets/zeroproductividad.png';
import Sidebar from "../Sidebar/sidebar";

const Header = ({ line }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <header className="header">
            <img src={logoNidec} alt="Nidec ACIM Logo" className="logoTabla" />
            {
                line ? (
                    <>
                        <h2 className="tituloPrincipal">TABLA DE PRODUCTIVIDAD {line}</h2>
                        {/* <img src={Zero} alt="Zero Productividad" className="logoZero" /> */}
                    </>
                ) : (
                    <h2 className="tituloPrincipal">LINEAS DE PRODUCCION: GA COLD MX</h2>
                )
            }
            <button
                className="menu-toggle-btn"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Abrir menú"
            >
                <Menu size={24} />
            </button>


            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </header>
    );
};

// Header.defaultProps = {
//   title: "Nidec embraco"
// };

export default Header;