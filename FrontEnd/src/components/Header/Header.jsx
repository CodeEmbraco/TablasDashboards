import React, {useEffect} from "react";
import './Header.css'
// import logoNidec from '@assets/nidec-logo.png'
import logoNidec from '@assets/nidecacim_white.png'
import Zero from '@assets/zeroproductividad.png';

const Header = ({line}) =>{
    return(
        <header className="header">
            <img src={logoNidec} alt="Nidec ACIM Logo" className="logoTabla" />
            {
                line ? (
                    <>
                    <h2 className="tituloPrincipal">TABLA DE PRODUCTIVIDAD {line}</h2>
                    <img src={Zero} alt="Zero Productividad" className="logoZero" />
                    </>
                ) : (
                    <h2 className="tituloPrincipal">LINEAS DE PRODUCCION: GA COLD MX</h2>
                )
            }
        </header>
    );
};

// Header.defaultProps = {
//   title: "Nidec embraco"
// };

export default Header;