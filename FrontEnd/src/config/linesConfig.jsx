import preensambleImg from '@assets/materials/preensamble.png';
import cduImg from '@assets/materials/cdu.png';
import electronicsImg from '@assets/materials/electronics.png';
import insinkeratorImg from '@assets/materials/insinkerator.png';
import ecmfanImg from '@assets/materials/ecmfan.png';
import thermoImg from '@assets/materials/thermo_v2.png';
//?Rotores se dejan on hold por el momento
// import rotoriseImg from '@assets/materials/rotorise.png';
// import rotorwetImg from '@assets/materials/rotorwet.png';

/**
 * Configuración base local. 
 * El Nombre, Supervisores y Líderes ahora se recuperan dinámicamente de la BD 
 * mediante el servicio productionService.getLinesConfig(id).
 */
export const LINES_CONFIG = {
    preensamble: {
        id: "preensamble",
        defaultMeta: 350,
        imgURL: preensambleImg
    },
    cdu: {
        id: "cdu",
        defaultMeta: 24,
        imgURL: cduImg
    },
    thermo: {
        id: "thermo",
        defaultMeta: 3,
        imgURL: thermoImg
    },
    electronics: {
        id: "electronics",
        defaultMeta: 180,
        imgURL: electronicsImg
    },
    insinkerator: {
        id: "insi",
        defaultMeta: 140,
        imgURL: insinkeratorImg
    },
    ecmfan: {
        id: "ecmfan",
        defaultMeta: 60,
        imgURL: ecmfanImg
    },
};