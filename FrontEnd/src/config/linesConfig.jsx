import preensambleImg from '@assets/materials/preensamble.png';
import cduImg from '@assets/materials/cdu.png';
import electronicsImg from '@assets/materials/electronics.png';
import insinkeratorImg from '@assets/materials/insinkerator.png';
import ecmfanImg from '@assets/materials/ecmfan.png';
import thermoImg from '@assets/materials/thermo.png';
//?Rotores se dejan on hold por el momento
// import rotoriseImg from '@assets/materials/rotorise.png';
// import rotorwetImg from '@assets/materials/rotorwet.png';

export const LINES_CONFIG = {
    preensamble: {
        name: "PRE-ENSAMBLE",
        id: "preensamble",
        defaultMeta: 350,
        supervisors: ["Hugo Zapata"],
        leaders: ["Eden Medellín"],
        imgURL: preensambleImg
    },
    cdu: {
        name: "CDU",
        id: "cdu",
        defaultMeta: 24,
        supervisors: ["Pablo Muñoz"],
        leaders: ["Jesús Hernández", "Jose Vasquez"],
        imgURL: cduImg
    },
    thermo: {
        name: "CDU TFS",
        id: "thermo",
        defaultMeta: 3,
        supervisors: ["Pablo Muñoz"],
        leaders: ["Jesús Hernández", "Jose Vasquez"],
        imgURL: thermoImg
    },
    electronics:{
        name: "ELECTRONICS",
        id: "electronics",
        defaultMeta: 180,
        supervisors: ["Alfredo Martínez"],
        leaders: ["Brenda Barrón", "Basilia Martin"],
        imgURL: electronicsImg
    },
    insinkerator:{
        name: "INSINKERATOR ES",
        id: "insi",
        defaultMeta: 140,
        supervisors: ["Hugo Zapata"],
        leaders: ["Cesar Rangel", "Jorge Carrizales", "Gerardo Sánchez", "Rosa Navarro", "Juan Flores", "Patricio Rico", "Eva Morales", "Jesús Arias"],
        imgURL: insinkeratorImg
    },
    // rotorise:{
    //     name: "ROTOR INSINKERATOR",
    //     id: "rotise",
    //     defaultMeta: 408,
    //     supervisors: ["Rubén Núñez"],
    //     leaders: ["Rosa Irene Gonzalez"]
    // },
    // rotorwet:{
    //     name: "ROTOR WET",
    //     id: "rotwet",
    //     defaultMeta: 408,
    //     supervisors: ["Rubén Núñez"],
    //     leaders: ["Alejandro Castillo","Edgar Rodriguez","Jaime Jiménez"]
    // },
    ecmfan:{
        name: "ECM FAN",
        id: "ecmfan",
        defaultMeta: 60,
        supervisors: ["Por Definir"],
        leaders: ["Por Definir"],
        imgURL: ecmfanImg
    },
};