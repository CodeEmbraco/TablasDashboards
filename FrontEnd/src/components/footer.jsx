import React from 'react';
import './Footer.css'; 

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <p>&copy; {currentYear} Nidec ACIM Embraco Mty. Todos los derechos reservados.</p>
            <p>Dashboard Electronics | Desarrollado por Jorge Barrón y Alondra Romero</p>
        </footer>
    );
};

export default Footer;