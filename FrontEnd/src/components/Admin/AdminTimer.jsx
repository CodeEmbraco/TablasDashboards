import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const AdminTimer = ({ onExpire }) => {
    const [timeLeft, setTimeLeft] = useState(120);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    onExpire();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [onExpire]);

    const circumference = 100.53; // 2 * pi * 16

    return (
        <div className={`discreet-notification admin-expiry-toast ${timeLeft <= 10 ? 'warning' : ''}`}>
            <div className="timer-ring">
                <svg width="36" height="36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#eee" strokeWidth="3" />
                    <circle
                        cx="18" cy="18" r="16" fill="none"
                        stroke={timeLeft <= 10 ? "#d32f2f" : "#009b4a"}
                        strokeWidth="3"
                        strokeDasharray={circumference}
                        strokeDashoffset={(circumference * timeLeft) / 120}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
                        transform="rotate(-90 18 18)"
                    />
                </svg>
                <span className="timer-seconds">{timeLeft}</span>
            </div>
            <div className="admin-msg">
                <strong>Modo Admin</strong>
                <span>{timeLeft <= 10 ? "⚠️ Expirando pronto" : "Acceso habilitado"}</span>
            </div>
            <button className="btn-logout-timer" onClick={onExpire} title="Cerrar sesión admin">
                <X size={16} />
            </button>
        </div>
    );
};

export default AdminTimer;