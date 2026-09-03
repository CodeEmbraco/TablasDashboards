import { horaSlotFormatter } from '@utils/dateUtils';
import { horasEsperadas, esHoraTerminada} from './shiftUtils';


export const construirEsqueletoTabla = (fecha, turno, porHoraBD) => {
    const horasDelTurno = horasEsperadas(String(turno));

    return horasDelTurno.map(horaFija => {
        const item = porHoraBD.find(h => Number(h.Hora) === horaFija);
        const finalizada = esHoraTerminada(fecha, horaFija, turno);
        const perdidasDB = item.Perdidas?.RegistroDB;

        const baseCalculada = finalizada ? (item.Perdidas?.MinutosCalculados || 0) : 0;
        const justificada = perdidasDB?.PerdidaJustificada || 0;
        const noJustificada = finalizada ? Math.max(0, baseCalculada - justificada) : 0;

        return {
            hora: horaSlotFormatter(horaFija),
            finalizada: finalizada,
            real: item.ProduccionTotal,
            meta: item.MetaEfectiva,
            modelos: item.Modelos,
            perdidaCalculada: finalizada ? baseCalculada : 0,
            perdidaJustificada: justificada,
            perdidaNoJustificada: finalizada ? noJustificada : 0,
            minutosPerdida: perdidasDB ? perdidasDB.PerdidaJustificada : 0,
            detalles: perdidasDB && perdidasDB.PerdidaDetalle ? perdidasDB.PerdidaDetalle.map(d => ({
                IdDetalle: d.IdDetalle,
                minutos: d.Minutos,
                motivo: d.Motivo,
                maquina: d.Maquina || '',
                observacion: d.Observacion || d.Observaciones || ''
            })) : [],
            observaciones: perdidasDB && perdidasDB.PerdidaDetalle
                ? perdidasDB.PerdidaDetalle.map( d => `${d.Minutos}m - ${d.Motivo} - ${d.Detalle}`).join(' | ')
                : "",
            supervisor: perdidasDB ? perdidasDB.Supervisor : '0',
            lider: perdidasDB ? perdidasDB.Lider : '0'
        };
    })
};