/*
  Modelo relacional - Centro Médico (SQL Server)
  Idempotente: se puede correr varias veces sin romper nada.
  Usuarios <- Pacientes / Medicos (herencia tabla-por-subclase, PK = FK)
  Pacientes 1 - 0..* Turnos 0..* - 1 Medicos
*/

IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Usuarios (
    ID_Usuario   INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Usuarios PRIMARY KEY,
    Nombre       NVARCHAR(100) NOT NULL,
    Email        VARCHAR(150)  NOT NULL CONSTRAINT UQ_Usuarios_Email UNIQUE,
    PasswordHash VARCHAR(100)  NOT NULL,           -- hash bcrypt, nunca la clave plana
    Rol          VARCHAR(20)   NOT NULL CONSTRAINT CK_Usuarios_Rol CHECK (Rol IN ('PACIENTE', 'MEDICO')),
    Activo       BIT           NOT NULL CONSTRAINT DF_Usuarios_Activo DEFAULT (1),
    FechaAlta    DATETIME2(0)  NOT NULL CONSTRAINT DF_Usuarios_FechaAlta DEFAULT (SYSUTCDATETIME())
  );
END
GO

IF OBJECT_ID('dbo.Pacientes', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Pacientes (
    ID_Paciente      INT NOT NULL CONSTRAINT PK_Pacientes PRIMARY KEY
                     CONSTRAINT FK_Pacientes_Usuarios REFERENCES dbo.Usuarios (ID_Usuario),
    ObraSocial       NVARCHAR(100) NULL,
    HistorialClinico NVARCHAR(MAX) NULL
  );
END
GO

IF OBJECT_ID('dbo.Medicos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Medicos (
    ID_Medico    INT NOT NULL CONSTRAINT PK_Medicos PRIMARY KEY
                 CONSTRAINT FK_Medicos_Usuarios REFERENCES dbo.Usuarios (ID_Usuario),
    Especialidad NVARCHAR(100) NOT NULL,
    Matricula    VARCHAR(20)   NOT NULL CONSTRAINT UQ_Medicos_Matricula UNIQUE
  );
END
GO

IF OBJECT_ID('dbo.Turnos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Turnos (
    ID_Turno          INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Turnos PRIMARY KEY,
    ID_Paciente       INT NOT NULL CONSTRAINT FK_Turnos_Pacientes REFERENCES dbo.Pacientes (ID_Paciente),
    ID_Medico         INT NOT NULL CONSTRAINT FK_Turnos_Medicos REFERENCES dbo.Medicos (ID_Medico),
    FechaHora         DATETIME2(0) NOT NULL,      -- en UTC
    DuracionMin       SMALLINT     NOT NULL CONSTRAINT DF_Turnos_Duracion DEFAULT (30),
    -- Máquina de estados: PENDIENTE -> CONFIRMADO | RECHAZADO | CANCELADO ; CONFIRMADO -> CANCELADO
    Estado            VARCHAR(15)  NOT NULL CONSTRAINT DF_Turnos_Estado DEFAULT ('PENDIENTE')
                      CONSTRAINT CK_Turnos_Estado CHECK (Estado IN ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO', 'CANCELADO')),
    Motivo            NVARCHAR(250) NULL,
    FechaAlta         DATETIME2(0) NOT NULL CONSTRAINT DF_Turnos_FechaAlta DEFAULT (SYSUTCDATETIME()),
    FechaModificacion DATETIME2(0) NULL
  );

  -- Búsqueda de agenda del médico (validación de superposición)
  CREATE INDEX IX_Turnos_Medico_FechaHora ON dbo.Turnos (ID_Medico, FechaHora) INCLUDE (Estado, DuracionMin);
  -- "Mis turnos" del paciente
  CREATE INDEX IX_Turnos_Paciente_FechaHora ON dbo.Turnos (ID_Paciente, FechaHora) INCLUDE (Estado);
END
GO
