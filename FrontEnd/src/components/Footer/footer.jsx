import React from 'react';
import { useState, useEffect, useCallback } from 'react'; 

const Footer = () => {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="app-footer">
            <p>&copy; {currentYear} Nidec ACIM Embraco Mty. Todos los derechos reservados.</p>
            <p>Tablas de Productividad | Departamento TI COLD MÉXICO</p>
        </footer>
    );
};

export default Footer;