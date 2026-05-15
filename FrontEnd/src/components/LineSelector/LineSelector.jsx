import {React} from 'react';
import {useNavigate} from "react-router-dom";
import './LineSelector.css'

const LINES = [
    { id: 'cdu', name: 'CDU', path: '/TablaCDU' },
    { id: 'electronics', name: 'Electronics', path: '/TablaElectronics' },
    { id: 'insi', name: 'Insinkerator', path: '/TablaInsin' },
    { id: 'rotorIse', name: 'Rotor Insinkerator', path: '/TablaRotorISE' },
    { id: 'rotorwet', name: 'Rotor Wet', path: '/TablaRotorWet' },
    { id: 'preensamble', name: 'Pre-Ensamble', path: '/TablaEnsamble' },
]

const LineSelector = ({currentLineId}) => {
    const navigate = useNavigate();
    const handleChange = (event) => {
        const selectedLine = LINES.find(line => line.id === event.target.value);
        if (selectedLine){
            navigate(selectedLine.path);
        }
    };

    return(
        <select 
            value={currentLineId} 
            onChange={handleChange} 
            className='lineSelect'
        >
            {LINES.map(line => (
                <option key={line.id} value={line.id}>
                    {line.name}
                </option>
            ))}
        </select>
    );
};

export default LineSelector;