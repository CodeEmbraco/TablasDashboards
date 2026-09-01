import { React } from 'react';
import { useNavigate } from "react-router-dom";
import './LineSelector.css'

const LINES = [
    { id: 'cdu', name: 'CDU', path: '/tabla/cdu' },
    { id: 'electronics', name: 'Electronics', path: '/tabla/electronics' },
    { id: 'insinkerator1', name: 'INSINKERATOR L1', path: '/tabla/insinkerator1' },
    { id: 'insinkerator2', name: 'INSINKERATOR L2', path: '/tabla/insinkerator2' },
    // { id: 'rotorIse', name: 'Rotor Insinkerator', path: '/tabla/rotorIse' },
    // { id: 'rotorwet', name: 'Rotor Wet', path: '/tabla/rotorwet' },
    { id: 'preensamble', name: 'Pre-Ensamble', path: '/tabla/preensamble' },
    { id: 'thermo', name: 'CDU TFS', path: '/tabla/thermo' },
    { id: 'ecmfan', name: 'ECM FAN', path: '/tabla/ecmfan' },
]

const LineSelector = ({ currentLineId }) => {
    const navigate = useNavigate();
    const handleChange = (event) => {
        const selectedLine = LINES.find(line => line.id === event.target.value);
        if (selectedLine) {
            navigate(selectedLine.path);
        }
    };

    return (
        <select
            value={currentLineId}
            onChange={handleChange}
        // className='lineSelect'
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