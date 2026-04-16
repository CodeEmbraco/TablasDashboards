import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import './Manual.css';

// Imágenes (asegúrate de que las rutas sean correctas en tu proyecto)
import paso1 from './placeholder.png';
import paso2 from './placeholder.png';

const Manual = ({ isOpen, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const steps = [
        { title: "Paso 1: Inicio de Sesión", image: paso1, desc: "Ingrese sus credenciales y seleccione la línea asignada." },
        { title: "Paso 2: Escaneo de Lote", image: paso2, desc: "Escanee el código QR del contenedor para iniciar el registro." },
        // Agrega más pasos aquí...
    ];

    if (!isOpen) return null;

    const nextStep = () => {
        if (currentIndex < steps.length - 1) setCurrentIndex(currentIndex + 1);
    };

    const prevStep = () => {
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                
                <button className="modal-close-icon" onClick={onClose}>
                <X size={28} />
                </button>

                <div className="modal-header">
                <h2>{steps[currentIndex].title}</h2>
                <span className="step-counter">Paso {currentIndex + 1} de {steps.length}</span>
                </div>

                <div className="carousel-grid">
                <button 
                    className="nav-arrow" 
                    onClick={prevStep} 
                    disabled={currentIndex === 0}
                >
                    <ChevronLeft size={48} />
                </button>

                <div className="image-container">
                    <img 
                    src={steps[currentIndex].image} 
                    alt="Instrucción" 
                    className="manual-image" 
                    />
                </div>

                <button 
                    className="nav-arrow" 
                    onClick={nextStep} 
                    disabled={currentIndex === steps.length - 1}
                >
                    <ChevronRight size={48} />
                </button>
                </div>

                <div className="modal-footer">
                <p className="manual-step-text">{steps[currentIndex].desc}</p>
                <div className="carousel-dots">
                    {steps.map((_, index) => (
                    <span key={index} className={`dot ${index === currentIndex ? 'active' : ''}`} />
                    ))}
                </div>
                </div>
            </div>
            </div>
);
};

export default Manual;