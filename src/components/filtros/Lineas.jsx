import React from 'react';
import { useNavigate } from 'react-router-dom';

const SelectorLinea = ({ lineaActual }) => {
    const navigate = useNavigate();

    const handleLineChange = (event) => {
        const val = event.target.value;
        if (val === "0") {
            navigate('/TablaCDU');
        } else if (val === "1") {
            navigate('/Tabla');
        } else if (val === "2") {
            navigate('/TablaInsin');
        } else if (val === "3") {
            navigate('/TablaRotorWet');
        } else if (val === "4") {
            navigate('/TablaRotorIse');
        } else if (val === "5") {
            navigate('/TablaEnsamble');
        }
    };

    return (
        <select value={lineaActual} onChange={handleLineChange}>
            <option value="0">CDU</option>
            <option value="1">Electronics</option>
            <option value="2">Insinkerator</option>
            <option value="3">Rotor Wet</option>
            <option value="4">Rotor Ise</option>
            <option value="5">Pre Ensamble</option>
        </select>
    );
};

export default SelectorLinea;