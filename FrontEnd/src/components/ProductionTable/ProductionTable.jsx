import React from 'react';
import ProductionRow from "@components/ProductionRow/ProductionRow";
import '@styles/global.css';

const ProductionTable = ({ items, onOpenModal, caption, localConfig, onUpdateMeta, onSetMeal }) => {
    return (
        <section className="contenedorTabla">
            <table className="tablaProduccion">
                {caption && <caption>{caption}</caption>}
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Plan</th>
                        <th>Real</th>
                        <th>Modelo</th>
                        <th>Pérdidas</th>
                        <th>Observaciones</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length > 0 ? (
                        items.map((row) => (
                            <ProductionRow 
                                key={row.TIME_SLOT} 
                                row={row}
                                onOpenModal={onOpenModal}
                                isMealHour={localConfig.mealHour === row.TIME_SLOT}
                                customMeta={localConfig.customMetas[row.TIME_SLOT]}
                                onUpdateMeta={onUpdateMeta}
                                onSetMeal={onSetMeal}
                            />
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7" className="empty-table-msg">
                                No hay datos disponibles para la selección actual.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </section>
    );
};

export default ProductionTable;