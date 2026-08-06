import { poolPLIS, poolCIMA, poolINSI, poolFAN, mysqlPool, poolDBSV } from "./dbConnections.js";

export const linesRegistry = {
    cdu: {
        lineId: "cdu",
        dbType: "mssql",
        prodPool: poolPLIS,
        goalsPool: poolDBSV,
        procedures: {
            hourly: "CDU_HOURLY",
            totalDay: "CDU_TOTALDAY",
            totalShift: "CDU_TOTALSHIFT",
            shift: "CDU_SHIFT"
        },
        params: {
            date: "fechaParam",
            shift: "turnoParam"
        }
    },
    thermo: {
        lineId: "thermo",
        dbType: "mssql",
        prodPool: poolPLIS,
        goalsPool: poolDBSV,
        procedures: {
            hourly: "THERMO_HOURLY",
            totalDay: "THERMO_TOTALDAY",
            totalShift: "THERMO_TOTALSHIFT",
            shift: "THERMO_SHIFT"
        },
        params: {
            date: "fechaParam",
            shift: "turnoParam"
        }
    },
    preensamble: {
        lineId: "preensamble",
        dbType: "mssql",
        prodPool: poolDBSV,
        goalsPool: poolDBSV,
        procedures: {
            hourly: "sp_preensamble_hourly",
            totalDay: "sp_preensamble_totalday",
            totalShift: "sp_preensamble_totalshift",
            shift: "sp_preensamble_shift"
        },
        params: {
            date: "fechaParam",
            shift: "turnoParam"
        }
    },
    insi: {
        lineId: "insi",
        dbType: "mssql",
        prodPool: poolINSI,
        goalsPool: poolDBSV,
        procedures: {
            hourly: "INSINK_sp_prodByHour",
            totalDay: "INSINK_sp_totalProdByDate",
            totalShift: "INSINK_sp_queryByDateAndShift",
            shift: "INSINK_sp_ShiftTotalByDate"
        },
        params: {
            date: "FECHA",
            shift: "TURNO"
        },
        hasLineNo: true,
        tableMap: {
            1: "EIN_01",
            2: "EIN_02"
        }
    },
    ecmfan: {
        lineId: "ecmfan",
        dbType: "mssql",
        prodPool: poolFAN,
        goalsPool: poolDBSV,
        procedures: {
            hourly: "ECMFAN_HOURLY",
            totalDay: "ECMFAN_TOTALDAY",
            totalShift: "ECMFAN_TOTALSHIFT",
            shift: "ECMFAN_SHIFT"
        },
        params: {
            date: "fechaParam",
            shift: "turnoParam"
        }
    },
    electronics: {
        lineId: "electronics",
        dbType: "mysql",
        prodPool: mysqlPool,
        goalsPool: poolDBSV,
        procedures: {
            hourly: "ELECTRO_HOURLY",
            totalDay: "ELECTRO_TOTALDAY",
            totalShift: "ELECTRO_TOTALSHIFT",
            shift: "ELECTRO_SHIFT"
        },
        params: {
            date: "fecha",
            shift: "turno"
        }
    }
};
