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

-- =====================================================================
-- Users table — populated automatically on Microsoft sign-in.
-- Role is used for admin privileges. The seed admin below grants
-- mjfernandez@tsu.edu.ph admin rights on first run.
-- =====================================================================
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id         UNIQUEIDENTIFIER NOT NULL PRIMARY KEY CONSTRAINT DF_Users_Id DEFAULT NEWID(),
        Email      NVARCHAR(320)    NOT NULL,
        Name       NVARCHAR(255)    NOT NULL,
        Role       NVARCHAR(20)     NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'user',
        AzureOid   NVARCHAR(128)    NULL,                 -- Microsoft object id (oid claim)
        IsActive   BIT              NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
        CreatedAt  DATETIME2        NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt  DATETIME2        NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_Users_Role CHECK (Role IN ('admin', 'user'))
    );

    CREATE UNIQUE INDEX UX_Users_Email ON dbo.Users(Email);
END
GO

-- Seed the default admin so the very first sign-in for this email
-- lands with admin rights even if no one created the row beforehand.
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE LOWER(Email) = 'mjfernandez@tsu.edu.ph')
BEGIN
    INSERT INTO dbo.Users (Email, Name, Role)
    VALUES ('mjfernandez@tsu.edu.ph', 'MJ Fernandez', 'admin');
END
ELSE
BEGIN
    -- Make sure the seed admin is always an admin even if previously demoted.
    UPDATE dbo.Users
       SET Role = 'admin', UpdatedAt = SYSUTCDATETIME()
     WHERE LOWER(Email) = 'mjfernandez@tsu.edu.ph';
END
GO
