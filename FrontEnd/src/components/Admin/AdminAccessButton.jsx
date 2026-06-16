import React, { useState } from 'react';
import { ShieldCogCorner } from 'lucide-react';
import CredentialsModal from '../Modals/CredentialsModal';

const AdminAccessButton = ({ isAdmin, onUnlock, className = "" }) => {
    const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);

    return (
        <>
            <button 
                className={`btn-admin-access ${isAdmin ? 'admin-active' : ''} ${className}`} 
                onClick={() => setIsCredentialsModalOpen(true)}
                title={isAdmin ? "Acceso Administrador Activo" : "Bloqueado - Requiere Credenciales"}
            >
                <ShieldCogCorner strokeWidth={3} size={30}/>
            </button>

            <CredentialsModal 
                isOpen={isCredentialsModalOpen}
                onClose={() => setIsCredentialsModalOpen(false)}
                onUnlock={onUnlock}
            />
        </>
    );
};

export default AdminAccessButton;