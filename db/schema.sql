-- My Desk Booker — Azure SQL schema
-- Run this once against your Azure SQL database before deploying the API.

CREATE TABLE bookings (
  id            UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
  user_id       NVARCHAR(50)      NOT NULL,   -- Entra ID object ID (oid claim)
  desk_id       NVARCHAR(10)      NOT NULL,   -- e.g. 'G-W1'
  date          DATE              NOT NULL,
  slot          NVARCHAR(10)      NOT NULL,   -- 'full' | 'am' | 'pm'
  checked_in    BIT               NOT NULL DEFAULT 0,
  checked_in_at DATETIME          NULL,
  created_at    DATETIME          NOT NULL DEFAULT GETDATE(),

  CONSTRAINT PK_bookings PRIMARY KEY (id),

  -- Prevents two bookings for the same desk/slot/date at the database level.
  -- The API also checks this, but the constraint is the real safety net.
  CONSTRAINT UQ_bookings_desk_date_slot UNIQUE (desk_id, date, slot)
);

CREATE INDEX IX_bookings_user_id  ON bookings (user_id);
CREATE INDEX IX_bookings_date     ON bookings (date);

-- ---------------------------------------------------------------------------

CREATE TABLE soft_holds (
  id           UNIQUEIDENTIFIER  NOT NULL DEFAULT NEWID(),
  user_id      NVARCHAR(50)      NOT NULL,
  desk_id      NVARCHAR(10)      NOT NULL,
  date         DATE              NOT NULL,
  expiry_time  NVARCHAR(5)       NOT NULL,   -- 'HH:MM' — hold expires if not converted to a real booking
  created_at   DATETIME          NOT NULL DEFAULT GETDATE(),

  CONSTRAINT PK_soft_holds PRIMARY KEY (id)
);

CREATE INDEX IX_soft_holds_date ON soft_holds (date);

-- ---------------------------------------------------------------------------

CREATE TABLE historic_patterns (
  user_id      NVARCHAR(50)  NOT NULL,
  day          NVARCHAR(10)  NOT NULL,   -- 'monday' … 'friday'
  arrival_time NVARCHAR(5)   NOT NULL,   -- 'HH:MM'
  desk_id      NVARCHAR(10)  NOT NULL,
  consistency  FLOAT         NOT NULL,   -- 0.0 – 1.0

  CONSTRAINT PK_historic_patterns PRIMARY KEY (user_id, day)
);
