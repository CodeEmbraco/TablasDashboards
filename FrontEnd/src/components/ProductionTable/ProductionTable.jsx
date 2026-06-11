import React from 'react';
import ProductionRow from "@components/ProductionRow/ProductionRow";
import '@styles/global.css';

const ProductionTable = ({ items, onOpenModal, caption, localConfig, onSetMeal }) => {
    console.log("localConfig", localConfig);
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
                                key={row.HORA} 
                                row={row}
                                onOpenModal={onOpenModal}
                                isMealHour={localConfig.mealHour === row.HORA}
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