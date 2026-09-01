import { horaSlotFormatter } from '@utils/dateUtils';
import { horasEsperadas, esHoraTerminada} from './shiftUtils';


export const construirEsqueletoTabla = (fecha, turno, porHoraBD, metaPorDefecto) => {
    const horasDelTurno = horasEsperadas(String(turno));

    return horasDelTurno.map(horaFija => {
        const item = porHoraBD.find(h => Number(h.Hora) === horaFija);
        const finalizada = esHoraTerminada(fecha, horaFija, turno);
        if(item){
            const perdidasDB = item.Perdidas?.RegistroDB;
            return {
                hora: horaSlotFormatter(horaFija),
                real: item.ProduccionTotal,
                meta: item.MetaEfectiva,
                modelos: item.Modelos,
                perdidaCalculada: finalizada ? item.Perdidas.MinutosCalculados : 0,
                perdidaJustificada: perdidasDB ? perdidasDB.PerdidasJustificada : 0,
                perdidaNoJustificada: finalizada ? (perdidasDB ? perdidasDB.PerdidasNoJustificada : item.Perdidas.MinutosCalculados) : 0,
                minutosPerdida: perdidasDB ? perdidasDB.PerdidaJustificada : 0,
                detalles: perdidasDB && perdidasDB.PerdidaDetalle ? perdidasDB.PerdidaDetalle.map(d => ({
                    IdDetalle: d.IdDetalle,
                    minutos: d.Minutos,
                    motivo: d.Motivo,
                    maquina: d.Maquina || '',
                    observacion: d.Observacion || d.Observaciones || ''
                })) : [],
                observaciones: perdidasDB && perdidasDB.PerdidaDetalle
                    ? perdidasDB.PerdidaDetalle.map( d => `${d.Minutos}m - ${d.Motivo}`).join(' | ')
                    : "",
                supervisor: perdidasDB ? perdidasDB.Supervisor : '0',
                lider: perdidasDB ? perdidasDB.Lider : '0'
            };
        } else {
            return {
                hora: horaSlotFormatter(horaFija),
                real: 0,
                meta: metaPorDefecto,
                modelos: "N/A",
                perdidaCalculada: finalizada ? 60 : 0,
                perdidaJustificada: 0,
                perdidaNoJustificada: finalizada ? 60 : 0,
                minutosPerdida: 0,
                detalles: [],
                observaciones: "",
                supervisor:'0',
                lider: '0'
            }
        }
    })
}