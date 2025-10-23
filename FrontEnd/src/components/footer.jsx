import React from 'react';
import './Footer.css'; // Importa el archivo CSS

const Footer = () => {
    // Obtenemos el año actual para que no quede estático
    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <p>&copy; {currentYear} Nidec ACIM Embraco Mty. Todos los derechos reservados.</p>
            <p>Plataforma de Producción v1.0</p>
        </footer>
    );
};

export default Footer;