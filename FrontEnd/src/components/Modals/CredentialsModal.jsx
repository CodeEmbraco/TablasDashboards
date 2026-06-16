import React, { useState } from 'react';
import './LossModals.css';

const CredentialsModal = ({ isOpen, onClose, onUnlock }) => {
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    const handleLogin = () => {
        // Validación simple de credenciales
        if (user.toLowerCase() === 'admin' && password === '1234') {
            onUnlock();
            onClose();
            setUser('');
            setPassword('');
        } else {
            alert('Usuario o Contraseña incorrectos');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '350px' }}>
                <h3>Acceso de Administrador</h3>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
                    Ingrese sus credenciales para habilitar la edición de metas y turnos.
                </p>
                
                <div className="add-loss-form" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div className="form-group">
                        <label>Usuario:</label>
                        <input 
                            type="text" 
                            value={user} 
                            onChange={(e) => setUser(e.target.value)} 
                            placeholder="Ej: admin"
                        />
                    </div>
                    <div className="form-group" style={{ marginTop: '10px' }}>
                        <label>Contraseña:</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="••••"
                        />
                    </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '25px' }}>
                    <button className="btn-modal-cancel" onClick={onClose}>Cancelar</button>
                    <button className="btn-modal-confirm" onClick={handleLogin}>Desbloquear</button>
                </div>
            </div>
        </div>
    );
};

export default CredentialsModal;