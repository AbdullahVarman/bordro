-- PersonelPro D1 Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    employeeNumber TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    lastLogin TEXT
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    employeeNumber TEXT UNIQUE,
    tcNo TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    departmentId INTEGER,
    startDate TEXT,
    monthlySalary REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Timesheets table
CREATE TABLE IF NOT EXISTS timesheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    days TEXT DEFAULT '{}',
    UNIQUE(employeeId, year, month)
);

-- Payrolls table
CREATE TABLE IF NOT EXISTS payrolls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    workedDays INTEGER DEFAULT 0,
    overtimeDays INTEGER DEFAULT 0,
    daysInMonth INTEGER DEFAULT 30,
    dailySalary REAL DEFAULT 0,
    grossSalary REAL DEFAULT 0,
    sgkEmployee REAL DEFAULT 0,
    unemployment REAL DEFAULT 0,
    incomeTax REAL DEFAULT 0,
    stampTax REAL DEFAULT 0,
    totalDeductions REAL DEFAULT 0,
    netSalary REAL DEFAULT 0,
    approved INTEGER DEFAULT 0,
    approvedAt TEXT,
    approvedBy INTEGER,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employeeId, year, month)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    sgkRate REAL DEFAULT 0.14,
    unemploymentRate REAL DEFAULT 0.01,
    incomeTaxRate REAL DEFAULT 0.15,
    stampTaxRate REAL DEFAULT 0.00759,
    minimumWage REAL DEFAULT 20002.50
);

-- Insert default settings
INSERT OR IGNORE INTO settings (id) VALUES (1);

-- Insert default admin user (password: admin123 - bcrypt hash)
INSERT OR IGNORE INTO users (username, password, fullName, role) 
VALUES ('admin', '$2a$10$rQnM1TGN1Z5MzVpZqt5YmeTJhWp6xjqQkqC1qJ8v5P1iN.m9TPK7e', 'Sistem Admin', 'admin');
