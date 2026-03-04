--======================================================================
--Tablas 
--======================================================================

CREATE TABLE tbl_Electronics_HistTablaProd (
    idTabla INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    Fecha DATE NOT NULL,
    Turno TINYINT NOT NULL,
    Hora_Slot VARCHAR(11) NOT NULL, 
    Supervisor VARCHAR(100),
    Lider VARCHAR(100),
    Batch VARCHAR(25),
    Modelo VARCHAR(25),
    Perdidas INT DEFAULT 0,
    Observaciones TEXT,
    ts_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_reporte_hora (Fecha, Turno, Hora_Slot) 
);

--======================================================================
--Procedures 
--======================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS GetProduccionRealPorHora;

CREATE PROCEDURE GetProduccionRealPorHora(
    IN p_Fecha DATE,
    IN p_Turno INT
)
BEGIN
    -- Variables para almacenar el inicio y fin del periodo de consulta
    DECLARE inicio_consulta DATETIME;
    DECLARE fin_consulta DATETIME;
    
    -- 1. CALCULAR EL RANGO DE TIEMPO COMPLETO BASADO EN EL TURNO
    IF p_Turno = 1 THEN
        -- Turno 1: 06:00:00 a 13:59:59 del mismo día
        SET inicio_consulta = DATE_ADD(p_Fecha, INTERVAL 6 HOUR);
        SET fin_consulta = DATE_ADD(p_Fecha, INTERVAL 14 HOUR);
    
    ELSEIF p_Turno = 2 THEN
        -- Turno 2: 14:00:00 a 22:59:59 del mismo día
        SET inicio_consulta = DATE_ADD(p_Fecha, INTERVAL 14 HOUR);
        SET fin_consulta = DATE_ADD(p_Fecha, INTERVAL 23 HOUR);
    
    ELSEIF p_Turno = 3 THEN
        -- Turno 3: 23:00:00 del día p_Fecha a 05:59:59 del día siguiente
        SET inicio_consulta = DATE_ADD(p_Fecha, INTERVAL 23 HOUR);
        SET fin_consulta = DATE_ADD(DATE_ADD(p_Fecha, INTERVAL 1 DAY), INTERVAL 6 HOUR);
        
    END IF;
    
    SELECT
        
        P.time_slot,
        P.piezas_reales,
        
        
        H.Perdidas,
        H.Observaciones,
        H.Supervisor,
        H.Lider,
        H.Batch,
        H.Modelo
    
    FROM 
        ( 
            SELECT
                CONCAT(LPAD(HOUR(T.TestTime), 2, '0'), ':00-', 
                       LPAD((HOUR(T.TestTime) + 1) % 24, 2, '0'), ':00') AS time_slot,
                
                COUNT(T.SN) AS piezas_reales
            
            FROM 
                tinyfct T
            
            WHERE
                T.TestTime >= inicio_consulta AND T.TestTime < fin_consulta
                AND T.TestResult = 'PASS'
                AND T.Firmware_Download = 'PASS'
                
            GROUP BY
                time_slot
        ) AS P
        
    LEFT JOIN 
        tbl_Electronics_HistTablaProd H 
        ON 
            H.Fecha = p_Fecha AND H.Turno = p_Turno AND H.Hora_Slot = P.time_slot
    
    ORDER BY
        P.time_slot;

END$$

DELIMITER ;

--Procedure del boton guardar, este valida si hay un registro con la misma hora, fecha y turno. Si lo hay hace
--un update, si no hace un insert. Es un UPSERT
DROP PROCEDURE IF EXISTS GuardarReporteTablaProd;

-- 2. Crear el procedure con la lógica de inmutabilidad en el UPDATE
DELIMITER $$

CREATE PROCEDURE GuardarReporteTablaProd(
    IN p_Fecha DATE,
    IN p_Turno TINYINT,
    IN p_Hora_Slot VARCHAR(11),
    IN p_Supervisor VARCHAR(100),
    IN p_Lider VARCHAR(100),
    IN p_Batch VARCHAR(50),
    IN p_Modelo VARCHAR(50),
    IN p_Perdidas INT,
    IN p_Observaciones TEXT
)
BEGIN
    
    -- Paso 1: Intentar actualizar el registro existente
    UPDATE tbl_Electronics_HistTablaProd
    SET
        Supervisor = p_Supervisor,
        Lider = p_Lider,
        Perdidas = p_Perdidas,
        Observaciones = p_Observaciones
        
        -- IMPORTANTE: Modelo y Batch NO se actualizan aquí para preservar el historial.
        
    WHERE 
        Fecha = p_Fecha AND Turno = p_Turno AND Hora_Slot = p_Hora_Slot;

    -- Paso 2: Si no se actualizó ningún registro (ROW_COUNT() = 0), se realiza el INSERT
    IF ROW_COUNT() = 0 THEN
        -- Si el registro NO existe, se realiza el INSERT con TODOS los datos (incluyendo Modelo y Batch)
        INSERT INTO tbl_Electronics_HistTablaProd (
            Fecha, Turno, Hora_Slot, Supervisor, Lider, Batch, Modelo, Perdidas, Observaciones
        )
        VALUES (
            p_Fecha, p_Turno, p_Hora_Slot, p_Supervisor, p_Lider, p_Batch, p_Modelo, p_Perdidas, p_Observaciones
        );
    END IF;

END$$

DELIMITER ;

/*
prueba de nuevo procedure mas robusto para evitar q si la prod real es cero no se muestren los datos de la bd

DELIMITER $$

DROP PROCEDURE IF EXISTS GetProduccionRealPorHora;

CREATE PROCEDURE GetProduccionRealPorHora(
    IN p_Fecha DATE,
    IN p_Turno INT
)
BEGIN
    DECLARE inicio_consulta DATETIME;
    DECLARE HORAS_TOTALES INT;
    
    -- 1. Configuración de horarios
    IF p_Turno = 1 THEN
        SET inicio_consulta = DATE_ADD(p_Fecha, INTERVAL 6 HOUR);
        SET HORAS_TOTALES = 8;
    ELSEIF p_Turno = 2 THEN
        SET inicio_consulta = DATE_ADD(p_Fecha, INTERVAL 14 HOUR);
        SET HORAS_TOTALES = 9;
    ELSEIF p_Turno = 3 THEN
        SET inicio_consulta = DATE_ADD(p_Fecha, INTERVAL 23 HOUR);
        SET HORAS_TOTALES = 7;
    END IF;
    
    -- 2. CTE para generar TODOS los slots de hora (Tabla Base)
    WITH RECURSIVE AllSlots AS (
        SELECT 
            0 as n,
            inicio_consulta as slot_start,
            DATE_ADD(inicio_consulta, INTERVAL 1 HOUR) as slot_end
        UNION ALL
        SELECT 
            n + 1,
            DATE_ADD(slot_start, INTERVAL 1 HOUR),
            DATE_ADD(slot_end, INTERVAL 1 HOUR)
        FROM AllSlots
        WHERE n < HORAS_TOTALES - 1
    )
    
    -- 3. Consulta Final
    SELECT
        -- Generamos el string "06:00-07:00" usando la tabla temporal
        CONCAT(LPAD(HOUR(S.slot_start), 2, '0'), ':00-', 
               LPAD(HOUR(S.slot_end), 2, '0'), ':00') AS time_slot,
               
        IFNULL(P.piezas_reales, 0) AS piezas_reales,
        
        H.Perdidas,
        H.Observaciones,
        H.Supervisor,
        H.Lider,
        H.Batch,
        H.Modelo

    FROM AllSlots S
    
    -- LEFT JOIN con la Producción Real
    LEFT JOIN (
        SELECT 
            -- CORRECCIÓN: No seleccionamos TestTime crudo. 
            -- Calculamos el slot aquí mismo para agrupar por él.
            CONCAT(LPAD(HOUR(TestTime), 2, '0'), ':00-', 
                   LPAD((HOUR(TestTime) + 1) % 24, 2, '0'), ':00') AS p_time_slot,
            COUNT(SN) as piezas_reales
        FROM tinyfct
        WHERE TestResult = 'PASS' 
          AND Firmware_Download = 'PASS'
          -- Filtramos por fecha aquí para optimizar velocidad
          AND TestTime >= inicio_consulta AND TestTime < (inicio_consulta + INTERVAL HORAS_TOTALES HOUR)
        GROUP BY p_time_slot -- Agrupamos por el string generado
    ) P ON P.p_time_slot = CONCAT(LPAD(HOUR(S.slot_start), 2, '0'), ':00-', LPAD(HOUR(S.slot_end), 2, '0'), ':00')
    
    -- LEFT JOIN con el Historial/Reporte
    LEFT JOIN tbl_Electronics_HistTablaProd H 
        ON H.Fecha = p_Fecha 
        AND H.Turno = p_Turno 
        AND H.Hora_Slot = CONCAT(LPAD(HOUR(S.slot_start), 2, '0'), ':00-', LPAD(HOUR(S.slot_end), 2, '0'), ':00')
                                 
    ORDER BY S.slot_start;

END$$

DELIMITER ;


============
PROCEDURE NUEVO PARA AGRUPAR LOS MODELOS POR HORA PARA LA NUEVA COLUMNA
============

DELIMITER $$

DROP PROCEDURE IF EXISTS GetProduccionRealPorHora;

CREATE PROCEDURE GetProduccionRealPorHora(
    IN p_Fecha DATE,
    IN p_Turno INT
)
BEGIN
    DECLARE inicio_consulta DATETIME;
    DECLARE HORAS_TOTALES INT;
    
    -- 1. Configuración de horarios
    IF p_Turno = 1 THEN
        SET inicio_consulta = DATE_ADD(p_Fecha, INTERVAL 6 HOUR);
        SET HORAS_TOTALES = 8;
    ELSEIF p_Turno = 2 THEN
        SET inicio_consulta = DATE_ADD(p_Fecha, INTERVAL 14 HOUR);
        SET HORAS_TOTALES = 9;
    ELSEIF p_Turno = 3 THEN
        SET inicio_consulta = DATE_ADD(p_Fecha, INTERVAL 23 HOUR);
        SET HORAS_TOTALES = 7;
    END IF;
    
    -- 2. CTE para generar TODOS los slots de hora (Tabla Base)
    WITH RECURSIVE AllSlots AS (
        SELECT 
            0 as n,
            inicio_consulta as slot_start,
            DATE_ADD(inicio_consulta, INTERVAL 1 HOUR) as slot_end
        UNION ALL
        SELECT 
            n + 1,
            DATE_ADD(slot_start, INTERVAL 1 HOUR),
            DATE_ADD(slot_end, INTERVAL 1 HOUR)
        FROM AllSlots
        WHERE n < HORAS_TOTALES - 1
    )
    
    -- 3. Consulta Final
    SELECT
        CONCAT(LPAD(HOUR(S.slot_start), 2, '0'), ':00-', 
               LPAD(HOUR(S.slot_end), 2, '0'), ':00') AS time_slot,
               
        -- Total de piezas (Suma de todos los modelos en esa hora)
        IFNULL(P.total_piezas, 0) AS piezas_reales,
        
        -- AQUÍ ESTÁ LA MAGIA: El desglose de modelos automático
        -- Si hay producción, muestra "Modelo (Cant) / Modelo (Cant)". Si no, vacío.
        IFNULL(P.modelos_detalle, '') AS Modelo, 
        
        -- Datos del Historial (Pérdidas y Observaciones manuales)
        H.Perdidas,
        H.Observaciones,
        
        -- Datos de cabecera (Si existen en el historial, úsalos)
        H.Supervisor,
        H.Lider,
        H.Batch

    FROM AllSlots S
    
    -- JOIN COMPLEJO para agrupar modelos
    LEFT JOIN (
        SELECT 
            time_slot_calc,
            SUM(qty) as total_piezas,
            -- Genera el string: "ModeloA (10) / ModeloB (20)"
            GROUP_CONCAT(CONCAT(Model, ' (', qty, ')') SEPARATOR ' / ') as modelos_detalle
        FROM (
            -- Sub-subconsulta: Cuenta piezas por Hora Y Modelo
            SELECT 
                CONCAT(LPAD(HOUR(TestTime), 2, '0'), ':00-', 
                       LPAD((HOUR(TestTime) + 1) % 24, 2, '0'), ':00') AS time_slot_calc,
                Model,
                COUNT(SN) as qty
            FROM tinyfct
            WHERE TestResult = 'PASS' 
              AND Firmware_Download = 'PASS'
              AND TestTime >= inicio_consulta AND TestTime < (inicio_consulta + INTERVAL HORAS_TOTALES HOUR)
            GROUP BY time_slot_calc, Model
        ) AS GroupedByModel
        GROUP BY time_slot_calc
    ) P ON P.time_slot_calc = CONCAT(LPAD(HOUR(S.slot_start), 2, '0'), ':00-', LPAD(HOUR(S.slot_end), 2, '0'), ':00')
    
    -- JOIN con Historial para traer lo manual
    LEFT JOIN tbl_Electronics_HistTablaProd H 
        ON H.Fecha = p_Fecha 
        AND H.Turno = p_Turno 
        AND H.Hora_Slot = CONCAT(LPAD(HOUR(S.slot_start), 2, '0'), ':00-', LPAD(HOUR(S.slot_end), 2, '0'), ':00')
                                 
    ORDER BY S.slot_start;

END$$

DELIMITER ;

*/



INSERT INTO `tiny_sql`.`tinyfct` 
(
    `Station`, 
    `CH`, 
    `Model`, 
    `Lot`, 
    `TestTime`, 
    `SN`, 
    `OP`, 
    `TestResult`, 
    `FailItem`, 
    `Firmware_Download`
) 
VALUES 
(
    'HVAC FVT1',           -- Station
    'CH1',                 -- CH
    '51M328145',           -- Model
    '711789',              -- Lot
    '2025/11/14 09:30:00', -- TestTime (Fecha clave para tus pruebas)
    '51M32814571178911XQ', -- SN
    'OP10',                -- OP
    'PASS',                -- TestResult
    'N/A',                 -- FailItem
    'PASS'                 -- Firmware_Download
);