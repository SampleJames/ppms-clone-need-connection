-- Run this once in SSMS (or sqlcmd) against your target database.
-- It creates the CostPro database (if missing) and the tables the API uses.

IF DB_ID('CostPro') IS NULL
BEGIN
    CREATE DATABASE CostPro;
END
GO

USE CostPro;
GO

IF OBJECT_ID('dbo.Projects', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Projects (
        Id          UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Name        NVARCHAR(255)    NOT NULL,
        Description NVARCHAR(1000)   NULL,
        Data        NVARCHAR(MAX)    NOT NULL,  -- full project JSON document
        CreatedAt   DATETIME2        NOT NULL CONSTRAINT DF_Projects_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt   DATETIME2        NOT NULL CONSTRAINT DF_Projects_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('dbo.AppSettings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AppSettings (
        Id          INT              NOT NULL PRIMARY KEY,  -- always 1
        Data        NVARCHAR(MAX)    NOT NULL,
        UpdatedAt   DATETIME2        NOT NULL CONSTRAINT DF_AppSettings_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END
GO
