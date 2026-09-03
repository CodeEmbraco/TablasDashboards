import React from 'react';

const LossDonut = ({ justificada = 0, noJustificada = 0 , finalizada = true}) => {
    // 1. Aseguramos números y límites
    const just = Math.min(Number(justificada) || 0, 60);
    const noJust = Math.min(Number(noJustificada) || 0, 60);
    const total = just + noJust;

    // 2. Porcentajes
    const porcNoJustificada = (noJust / 60) * 100;
    const porcJustificada = (just / 60) * 100;

    // 3. Colores
    const colorNoJustificada = '#ef5350'; // Rojo
    const colorJustificada = '#42a5f5';   // Azul
    const colorFondo = '#e0e0e0';         // Gris
    const colorExito = '#4caf50';         // Verde para horas sin errores

    // 4. Gradiente 
    const gradient = `conic-gradient(
        ${colorNoJustificada} 0% ${porcNoJustificada}%,
        ${colorJustificada} ${porcNoJustificada}% ${porcNoJustificada + porcJustificada}%,
        ${colorFondo} ${porcNoJustificada + porcJustificada}% 100%
    )`;

    // 5. Lógica de texto y color central
    let textoCentral = '-';
    let colorTexto = '#9e9e9e';

    if(!finalizada){
        //Hora en curso o futura
        textoCentral = '-';
        colorTexto = '#9e9e9e';
    }else if (noJust > 0) {
        // Faltan minutos por justificar (Rojo)
        textoCentral = noJust;
        colorTexto = colorNoJustificada;
    } else if (just > 0 && noJust === 0) {
        // Hubo pérdida pero ya se justificó toda (Azul)
        textoCentral = '✓';
        colorTexto = colorJustificada;
    } else if (total === 0) {
        // Hora perfecta, no hay pérdidas calculadas (Verde)
        textoCentral = '✓';
        colorTexto = colorExito;
    }

    return (
        <div 
            style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundImage: gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            title={`Justificada: ${just}m | No Justificada: ${noJust}m`}
        >
            <div 
                style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: colorTexto
                }}
            >
                {textoCentral}
            </div>
        </div>
    );
};

export default LossDonut;