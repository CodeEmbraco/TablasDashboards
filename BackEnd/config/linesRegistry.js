import { poolPLIS, poolCIMA, poolINSI, poolFAN, mysqlPool } from "./dbConnections.js";

export const linesRegistry = {
    cdu: {
        lineId: "cdu",
        dbType: "mssql",
        prodPool: poolPLIS,
        goalsPool: poolCIMA,
        histPool: poolCIMA,
        histTable: "tbl_HistProdCDU",
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
        goalsPool: poolCIMA,
        histPool: poolCIMA,
        histTable: "tbl_HistProdThermo",
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
        prodPool: poolCIMA,
        goalsPool: poolCIMA,
        histPool: poolCIMA,
        histTable: "tbl_HistProdPreEnsam",
        procedures: {
            hourly: "preEnsam_sp_prodByHour",
            totalDay: "preEnsam_sp_totalProdByDate",
            totalShift: "preEnsam_sp_queryByDateAndShift",
            shift: "preEnsam_sp_ShiftTotalByDate"
        },
        params: {
            date: "FECHA",
            shift: "TURNO"
        }
    },
    insi: {
        lineId: "insi",
        dbType: "mssql",
        prodPool: poolINSI,
        goalsPool: poolCIMA,
        histPool: poolINSI,
        histTable: "EIN_PERDIDAS",
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
        hasLineNo: true
    },
    ecmfan: {
        lineId: "ecmfan",
        dbType: "mssql",
        prodPool: poolFAN,
        goalsPool: poolCIMA,
        histPool: poolCIMA,
        histTable: "tbl_HistProdECMFAN",
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
        goalsPool: poolCIMA,
        histPool: poolCIMA,
        histTable: "tbl_HistProdElectro",
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
