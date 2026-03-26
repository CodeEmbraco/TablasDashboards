//const API_URL = import.meta.env.VITE_LOCAL_BACKEND_URL;  //?URL Local
const API_URL = import.meta.env.VITE_PUBLIC_BACKEND_URL; //?URL Publico del servidor

console.log("Url Backend Actual: ", API_URL);

//
export const ProduccionReal = async (fecha, turno) =>
{
    const res = await fetch(`${API_URL}/api/cdu/produccion-real?fecha=${fecha}&turno=${turno}`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    console.log("La respuesta del endpoint es: ", res);
    return res.json();
}

export const PREENSAMBLE_API = async() =>{
    const res = await fetch(`${API_URL}/api/ensamble/get_api_data`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    // console.log("ENDPOINT: SUCCESS!");
    return res.json();
}

export const preEnsam_registro = async(counter, product_id) => {
    const res = await fetch(`${API_URL}/api/ensamble/register_data?counter=${counter}&product_id=${product_id}`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    console.log("NUEVO REGISTRO:\nCOUNTER:\t",counter,"\nPRODUCT_ID:\t",product_id);
    return res.json();
}

export const preEnsam_consulta = async () => {
    const res = await fetch(`${API_URL}/api/ensamble/get_cima_data`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    console.log("ENDPOINT get_cima_data: SUCCESS!\n");
    return res.json();
}

export const preEnsam_consultaPorHora= async (fecha, turno) =>{
    const res = await fetch(`${API_URL}/api/ensamble/get_cima_databyhour?fecha=${fecha}&turno=${turno}`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    // console.log("Consulta por fecha y turno:\t", res);
    return res.json();
}

export const preEnsam_totalPorFecha = async (fecha) => {
    const res = await fetch(`${API_URL}/api/ensamble/get_cima_totalByDate?fecha=${fecha}`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    return res.json();
}

export const preEnsam_totalPorFechaYTurno = async (fecha) => {
    //console.log("Recibo ->\nfecha: ", fecha,"\nturno: ",turno);
    const res = await fetch(`${API_URL}/api/ensamble/get_cima_totalByDateAndShift?fecha=${fecha}`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    return res.json();
}


export const preEnsam_guardarReporte = async (formData) => {
    console.log("¿Que recibe la funcion?: ", formData)
    const res = await fetch(`${API_URL}/api/ensamble/post_cima_report`, {
        method : "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
    });
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    return res.json();
}

export const preEnsam_consultarReporte = async (fecha, turno) => {
    const res = await fetch(`${API_URL}/api/ensamble/get_cima_report?fecha=${fecha}&turno=${turno}`);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
}