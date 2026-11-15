/*
  Procedimientos almacenados.
  Las reglas de negocio se informan con THROW 5000x; la API las traduce a 404/409
  (ver repositories/sql/erroresSql.js).
    50001 superposición de turnos
    50002 email ya registrado
    50003 turno no reprogramable
    50004 médico o turno inexistente
*/

CREATE OR ALTER PROCEDURE dbo.sp_Paciente_Registrar
  @Nombre       NVARCHAR(100),
  @Email        VARCHAR(150),
  @PasswordHash VARCHAR(100),
  @ObraSocial   NVARCHAR(100) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  BEGIN TRAN;
    IF EXISTS (SELECT 1 FROM dbo.Usuarios WITH (UPDLOCK, HOLDLOCK) WHERE Email = @Email)
      THROW 50002, N'Ya existe un usuario con ese email.', 1;

    INSERT INTO dbo.Usuarios (Nombre, Email, PasswordHash, Rol)
    VALUES (@Nombre, @Email, @PasswordHash, 'PACIENTE');

    DECLARE @Id INT = SCOPE_IDENTITY();

    INSERT INTO dbo.Pacientes (ID_Paciente, ObraSocial)
    VALUES (@Id, @ObraSocial);
  COMMIT;

  SELECT u.ID_Usuario AS id, u.Nombre AS nombre, u.Email AS email, u.PasswordHash AS passwordHash,
         u.Rol AS rol, u.Activo AS activo, p.ObraSocial AS obraSocial, p.HistorialClinico AS historialClinico
  FROM dbo.Usuarios u
  JOIN dbo.Pacientes p ON p.ID_Paciente = u.ID_Usuario
  WHERE u.ID_Usuario = @Id;
END
GO

/*
  Alta de turno. La superposición también se valida en TurnoServicio (testeable con mocks),
  pero acá se vuelve a validar DENTRO de una transacción con UPDLOCK + HOLDLOCK:
  si dos pacientes piden el mismo horario al mismo tiempo, solo uno lo consigue.
*/
CREATE OR ALTER PROCEDURE dbo.sp_Turno_Crear
  @IdPaciente  INT,
  @IdMedico    INT,
  @FechaHora   DATETIME2(0),
  @DuracionMin SMALLINT = 30,
  @Motivo      NVARCHAR(250) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @Fin DATETIME2(0) = DATEADD(MINUTE, @DuracionMin, @FechaHora);

  BEGIN TRAN;
    IF NOT EXISTS (
      SELECT 1
      FROM dbo.Medicos m
      JOIN dbo.Usuarios u ON u.ID_Usuario = m.ID_Medico
      WHERE m.ID_Medico = @IdMedico AND u.Activo = 1
    )
      THROW 50004, N'El médico no existe o está inactivo.', 1;

    IF EXISTS (
      SELECT 1
      FROM dbo.Turnos WITH (UPDLOCK, HOLDLOCK)
      WHERE ID_Medico = @IdMedico
        AND Estado IN ('PENDIENTE', 'CONFIRMADO')
        AND FechaHora < @Fin
        AND DATEADD(MINUTE, DuracionMin, FechaHora) > @FechaHora
    )
      THROW 50001, N'El médico ya tiene un turno en ese horario.', 1;

    INSERT INTO dbo.Turnos (ID_Paciente, ID_Medico, FechaHora, DuracionMin, Estado, Motivo)
    VALUES (@IdPaciente, @IdMedico, @FechaHora, @DuracionMin, 'PENDIENTE', @Motivo);

    DECLARE @Id INT = SCOPE_IDENTITY();
  COMMIT;

  SELECT ID_Turno AS id, ID_Paciente AS pacienteId, ID_Medico AS medicoId, FechaHora AS fechaHora,
         DuracionMin AS duracionMin, Estado AS estado, Motivo AS motivo
  FROM dbo.Turnos
  WHERE ID_Turno = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Turno_Reprogramar
  @IdTurno   INT,
  @FechaHora DATETIME2(0)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @IdMedico INT, @Estado VARCHAR(15), @DuracionMin SMALLINT;

  BEGIN TRAN;
    SELECT @IdMedico = ID_Medico, @Estado = Estado, @DuracionMin = DuracionMin
    FROM dbo.Turnos WITH (UPDLOCK)
    WHERE ID_Turno = @IdTurno;

    IF @IdMedico IS NULL
      THROW 50004, N'El turno no existe.', 1;

    IF @Estado <> 'PENDIENTE'
      THROW 50003, N'Solo se pueden reprogramar turnos PENDIENTES.', 1;

    DECLARE @Fin DATETIME2(0) = DATEADD(MINUTE, @DuracionMin, @FechaHora);

    IF EXISTS (
      SELECT 1
      FROM dbo.Turnos WITH (UPDLOCK, HOLDLOCK)
      WHERE ID_Medico = @IdMedico
        AND ID_Turno <> @IdTurno
        AND Estado IN ('PENDIENTE', 'CONFIRMADO')
        AND FechaHora < @Fin
        AND DATEADD(MINUTE, DuracionMin, FechaHora) > @FechaHora
    )
      THROW 50001, N'El médico ya tiene un turno en ese horario.', 1;

    UPDATE dbo.Turnos
    SET FechaHora = @FechaHora, FechaModificacion = SYSUTCDATETIME()
    WHERE ID_Turno = @IdTurno;
  COMMIT;

  SELECT ID_Turno AS id, ID_Paciente AS pacienteId, ID_Medico AS medicoId, FechaHora AS fechaHora,
         DuracionMin AS duracionMin, Estado AS estado, Motivo AS motivo
  FROM dbo.Turnos
  WHERE ID_Turno = @IdTurno;
END
GO
