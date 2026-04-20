import {createContext, useContext, useState} from 'react';
import { getCurrentShift, getFormattedDate } from '@utils/dateUtils';

const ProductionContext = createContext();

export const ProductionProvider = ({children}) =>{
    const [selectedShift, setSelectedShift] = useState(getCurrentShift());
    const [selectedDate, setSelectedDate] = useState(getFormattedDate());
    const [metaPorHora, setMetaPorHora] = useState(350);

    const values = {
        selectedShift, setSelectedShift,
        selectedDate, setSelectedDate,
        metaPorHora, setMetaPorHora,
    }

    return (
        <ProductionContext.Provider value={values}>
            {children}
        </ProductionContext.Provider>
    );
};

export const useProduction = () => {
    const context = useContext(ProductionContext);
    if(!context) {throw new Error("useProduction debe usarse dentro de ProductionProvider");}
    return context;
};