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

-- Si el procedure ya existe, primero debes eliminarlo
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