import React, { useState, useMemo, useEffect } from 'react';
import './LossModals.css';

const GoalsModal = ({ isOpen, onClose, onSave }) => {
    // Usamos un solo estado para manejar la exclusividad de los checkboxes
    const [selectionType, setSelectionType] = useState('custom'); // 'custom', 'defaultHour', 'defaultShift'
    const [turno, setTurno] = useState('1');
    const [hora, setHora] = useState('');
    const [nuevaMeta, setNuevaMeta] = useState('');
    const [confirmPhrase, setConfirmPhrase] = useState('');

    // Generar las opciones de hora dinámicamente según el turno
    const hourOptions = useMemo(() => {
        if (turno === '1') {
            return ["06:00 - 07:00", "07:00 - 08:00", "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00"];
        } else if (turno === '2') {
            return ["14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00", "22:00 - 23:00"];
        } else if (turno === '3') {
            return ["23:00 - 00:00", "00:00 - 01:00", "01:00 - 02:00", "02:00 - 03:00", "03:00 - 04:00", "04:00 - 05:00", "05:00 - 06:00"];
        }
        return [];
    }, [turno]);

    // Resetear la hora seleccionada si cambia el turno o las opciones
    useEffect(() => {
        if (hourOptions.length > 0 && !hourOptions.includes(hora)) {
            setHora(hourOptions[0]);
        }
    }, [hourOptions, hora]);

    // Limpiar frase de confirmación al cerrar o cambiar tipo
    useEffect(() => {
        setConfirmPhrase('');
    }, [isOpen, selectionType]);

    if (!isOpen) return null;

    const handleCheckboxChange = (type) => {
        setSelectionType(type);
    };

    const isDefaultType = selectionType === 'defaultHour' || selectionType === 'defaultShift';

    const handleConfirm = () => {
        if (!nuevaMeta) return alert("Por favor ingresa un valor para la meta.");

        if (isDefaultType && confirmPhrase.trim().toLowerCase() !== 'confirmar cambio') {
            return alert('Para modificar una meta default, debe escribir exactamente "confirmar cambio" en el campo de validación.');
        }

        onSave({
            metaCustom: selectionType === 'custom',
            metaDefaultHora: selectionType === 'defaultHour',
            metaDefaultTurno: selectionType === 'defaultShift',
            turno,
            hora,
            nuevaMeta: parseInt(nuevaMeta, 10) || 0
        });
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '400px' }}>
                <h3>Configuración de Metas</h3>
                
                <div style={{ textAlign: 'left', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectionType === 'custom'} onChange={() => handleCheckboxChange('custom')} /> Meta Custom
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectionType === 'defaultHour'} onChange={() => handleCheckboxChange('defaultHour')} /> Meta Default (Hora)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectionType === 'defaultShift'} onChange={() => handleCheckboxChange('defaultShift')} /> Meta Default (Turno)
                    </label>
                </div>

                <div className="add-loss-form" style={{ flexDirection: 'column', alignItems: 'stretch', textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Ajustar metas</h4>
                    
                    <div className="form-group">
                        <label>Turnos:</label>
                        <select value={turno} onChange={(e) => setTurno(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Hora en formato (hh:mm - hh:mm):</label>
                        <select 
                            value={hora} 
                            onChange={(e) => setHora(e.target.value)} 
                            style={{ width: '100%', padding: '8px' }}
                            disabled={selectionType === 'defaultShift'}
                        >
                            {hourOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Nueva Meta:</label>
                        <input 
                            type="number" 
                            placeholder="Ej: 150" 
                            value={nuevaMeta} 
                            onChange={(e) => setNuevaMeta(e.target.value)} 
                            style={{ width: '100%', padding: '8px' }}
                        />
                    </div>

                    {isDefaultType && (
                        <div className="form-group" style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeeba' }}>
                            <p style={{ color: '#856404', fontSize: '0.85rem', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                                <strong>⚠️ ADVERTENCIA:</strong> Estás editando una <strong>Meta Default</strong>. Este cambio afectará a todos los días de producción de forma permanente.
                            </p>
                            <label style={{ color: '#856404', fontSize: '0.8rem' }}>Escribe <b>"confirmar cambio"</b> para habilitar:</label>
                            <input 
                                type="text" 
                                placeholder="Escribe aquí..." 
                                value={confirmPhrase} 
                                onChange={(e) => setConfirmPhrase(e.target.value)} 
                                style={{ width: '100%', padding: '8px', border: '1px solid #ffc107', marginTop: '5px' }}
                            />
                        </div>
                    )}
                </div>

                <div className="modal-actions" style={{ marginTop: '20px' }}>
                    <button className="btn-modal-cancel" onClick={onClose}>Cancelar</button>
                    <button className="btn-modal-confirm" onClick={handleConfirm}>Aceptar</button>
                </div>
            </div>
        </div>
    );
};

export default GoalsModal;