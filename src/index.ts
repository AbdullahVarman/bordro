import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { SignJWT, jwtVerify } from 'jose';

type Bindings = {
    DB: D1Database;
    JWT_SECRET?: string;
};

type Variables = {
    user: {
        id: number;
        username: string;
        fullName: string;
        role: string;
        employeeNumber: string | null;
    } | null;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// JWT Secret
const getJwtSecret = (env: Bindings) => {
    const secret = env.JWT_SECRET || 'personelpro-secret-key-2024-cloudflare';
    return new TextEncoder().encode(secret);
};

// Simple password hashing (for Workers compatibility)
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'personelpro-salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const newHash = await hashPassword(password);
    return newHash === hash;
}

// CORS middleware
app.use('*', cors({
    origin: (origin) => origin || '*',
    credentials: true,
}));

// Auth middleware
app.use('/api/*', async (c, next) => {
    const token = getCookie(c, 'auth_token');

    if (token) {
        try {
            const { payload } = await jwtVerify(token, getJwtSecret(c.env));
            c.set('user', payload.user as Variables['user']);
        } catch {
            c.set('user', null);
        }
    } else {
        c.set('user', null);
    }

    await next();
});

// Helper: require auth
function requireAuth(c: any) {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Oturum açmanız gerekiyor' }, 401);
    }
    return null;
}

// Helper: require admin
function requireAdmin(c: any) {
    const user = c.get('user');
    if (!user || user.role !== 'admin') {
        return c.json({ error: 'Bu işlem için yetkiniz yok' }, 403);
    }
    return null;
}

// ===== AUTH ROUTES =====

app.post('/api/login', async (c) => {
    const { username, password } = await c.req.json();

    const user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE username = ?'
    ).bind(username).first();

    if (!user) {
        return c.json({ error: 'Kullanıcı adı veya şifre hatalı' }, 401);
    }

    const isValid = await verifyPassword(password, user.password as string);
    if (!isValid) {
        return c.json({ error: 'Kullanıcı adı veya şifre hatalı' }, 401);
    }

    // Update last login
    await c.env.DB.prepare(
        'UPDATE users SET lastLogin = ? WHERE id = ?'
    ).bind(new Date().toISOString(), user.id).run();

    const userData = {
        id: user.id as number,
        username: user.username as string,
        fullName: user.fullName as string,
        role: user.role as string,
        employeeNumber: user.employeeNumber as string | null,
    };

    // Create JWT token
    const token = await new SignJWT({ user: userData })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('24h')
        .sign(getJwtSecret(c.env));

    setCookie(c, 'auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
    });

    return c.json({ user: userData });
});

app.post('/api/logout', async (c) => {
    deleteCookie(c, 'auth_token', { path: '/' });
    return c.json({ success: true });
});

app.get('/api/me', async (c) => {
    const user = c.get('user');
    return c.json({ user: user || null });
});

// ===== EMPLOYEES ROUTES =====

app.get('/api/employees', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const result = await c.env.DB.prepare('SELECT * FROM employees').all();
    return c.json(result.results);
});

app.post('/api/employees', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const data = await c.req.json();
    const result = await c.env.DB.prepare(
        'INSERT INTO employees (firstName, lastName, employeeNumber, tcNo, phone, email, address, departmentId, startDate, monthlySalary, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
        data.firstName, data.lastName, data.employeeNumber, data.tcNo,
        data.phone, data.email, data.address, data.departmentId,
        data.startDate, data.monthlySalary, data.status || 'active'
    ).run();

    return c.json({ id: result.meta.last_row_id, ...data });
});

app.put('/api/employees/:id', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const id = c.req.param('id');
    const data = await c.req.json();

    await c.env.DB.prepare(
        'UPDATE employees SET firstName=?, lastName=?, employeeNumber=?, tcNo=?, phone=?, email=?, address=?, departmentId=?, startDate=?, monthlySalary=?, status=? WHERE id=?'
    ).bind(
        data.firstName, data.lastName, data.employeeNumber, data.tcNo,
        data.phone, data.email, data.address, data.departmentId,
        data.startDate, data.monthlySalary, data.status, id
    ).run();

    return c.json({ id: parseInt(id), ...data });
});

app.delete('/api/employees/:id', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM employees WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// ===== DEPARTMENTS ROUTES =====

app.get('/api/departments', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const result = await c.env.DB.prepare('SELECT * FROM departments').all();
    return c.json(result.results);
});

app.post('/api/departments', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const { name, description } = await c.req.json();
    const result = await c.env.DB.prepare(
        'INSERT INTO departments (name, description) VALUES (?, ?)'
    ).bind(name, description).run();

    return c.json({ id: result.meta.last_row_id, name, description });
});

app.put('/api/departments/:id', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const id = c.req.param('id');
    const { name, description } = await c.req.json();

    await c.env.DB.prepare(
        'UPDATE departments SET name=?, description=? WHERE id=?'
    ).bind(name, description, id).run();

    return c.json({ id: parseInt(id), name, description });
});

app.delete('/api/departments/:id', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM departments WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// ===== TIMESHEETS ROUTES =====

app.get('/api/timesheets', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const result = await c.env.DB.prepare('SELECT * FROM timesheets').all();
    const timesheets = result.results.map((t: any) => ({
        ...t,
        days: JSON.parse(t.days || '{}')
    }));
    return c.json(timesheets);
});

app.post('/api/timesheets', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const { employeeId, year, month, days } = await c.req.json();

    const existing = await c.env.DB.prepare(
        'SELECT * FROM timesheets WHERE employeeId=? AND year=? AND month=?'
    ).bind(employeeId, year, month).first();

    if (existing) {
        await c.env.DB.prepare(
            'UPDATE timesheets SET days=? WHERE id=?'
        ).bind(JSON.stringify(days), existing.id).run();
        return c.json({ id: existing.id, employeeId, year, month, days });
    } else {
        const result = await c.env.DB.prepare(
            'INSERT INTO timesheets (employeeId, year, month, days) VALUES (?, ?, ?, ?)'
        ).bind(employeeId, year, month, JSON.stringify(days)).run();
        return c.json({ id: result.meta.last_row_id, employeeId, year, month, days });
    }
});

// ===== PAYROLLS ROUTES =====

app.get('/api/payrolls', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const result = await c.env.DB.prepare('SELECT * FROM payrolls').all();
    const payrolls = result.results.map((p: any) => ({
        ...p,
        approved: !!p.approved
    }));
    return c.json(payrolls);
});

app.post('/api/payrolls', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const p = await c.req.json();

    const existing = await c.env.DB.prepare(
        'SELECT * FROM payrolls WHERE employeeId=? AND year=? AND month=?'
    ).bind(p.employeeId, p.year, p.month).first();

    if (existing) {
        await c.env.DB.prepare(
            'UPDATE payrolls SET workedDays=?, overtimeDays=?, daysInMonth=?, dailySalary=?, grossSalary=?, sgkEmployee=?, unemployment=?, incomeTax=?, stampTax=?, totalDeductions=?, netSalary=?, approved=?, approvedAt=?, approvedBy=? WHERE id=?'
        ).bind(
            p.workedDays, p.overtimeDays, p.daysInMonth, p.dailySalary, p.grossSalary,
            p.sgkEmployee, p.unemployment, p.incomeTax, p.stampTax, p.totalDeductions,
            p.netSalary, p.approved ? 1 : 0, p.approvedAt, p.approvedBy, existing.id
        ).run();
        return c.json({ id: existing.id, ...p });
    } else {
        const result = await c.env.DB.prepare(
            'INSERT INTO payrolls (employeeId, year, month, workedDays, overtimeDays, daysInMonth, dailySalary, grossSalary, sgkEmployee, unemployment, incomeTax, stampTax, totalDeductions, netSalary, approved, approvedAt, approvedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(
            p.employeeId, p.year, p.month, p.workedDays, p.overtimeDays, p.daysInMonth,
            p.dailySalary, p.grossSalary, p.sgkEmployee, p.unemployment, p.incomeTax,
            p.stampTax, p.totalDeductions, p.netSalary, p.approved ? 1 : 0,
            p.approvedAt, p.approvedBy
        ).run();
        return c.json({ id: result.meta.last_row_id, ...p });
    }
});

// ===== USERS ROUTES =====

app.get('/api/users', async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) return adminError;

    const result = await c.env.DB.prepare(
        'SELECT id, username, fullName, role, employeeNumber, createdAt, lastLogin FROM users'
    ).all();
    return c.json(result.results);
});

app.post('/api/users', async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) return adminError;

    const { username, password, fullName, role, employeeNumber } = await c.req.json();
    const hashedPassword = await hashPassword(password);

    const result = await c.env.DB.prepare(
        'INSERT INTO users (username, password, fullName, role, employeeNumber) VALUES (?, ?, ?, ?, ?)'
    ).bind(username, hashedPassword, fullName, role, employeeNumber).run();

    return c.json({ id: result.meta.last_row_id, username, fullName, role, employeeNumber });
});

app.put('/api/users/:id', async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) return adminError;

    const id = c.req.param('id');
    const { username, password, fullName, role, employeeNumber } = await c.req.json();

    if (password) {
        const hashedPassword = await hashPassword(password);
        await c.env.DB.prepare(
            'UPDATE users SET username=?, password=?, fullName=?, role=?, employeeNumber=? WHERE id=?'
        ).bind(username, hashedPassword, fullName, role, employeeNumber, id).run();
    } else {
        await c.env.DB.prepare(
            'UPDATE users SET username=?, fullName=?, role=?, employeeNumber=? WHERE id=?'
        ).bind(username, fullName, role, employeeNumber, id).run();
    }

    return c.json({ id: parseInt(id), username, fullName, role, employeeNumber });
});

app.delete('/api/users/:id', async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) return adminError;

    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// ===== SETTINGS ROUTES =====

app.get('/api/settings', async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    const settings = await c.env.DB.prepare('SELECT * FROM settings WHERE id = 1').first();
    return c.json(settings);
});

app.put('/api/settings', async (c) => {
    const adminError = requireAdmin(c);
    if (adminError) return adminError;

    const { sgkRate, unemploymentRate, incomeTaxRate, stampTaxRate, minimumWage } = await c.req.json();

    await c.env.DB.prepare(
        'UPDATE settings SET sgkRate=?, unemploymentRate=?, incomeTaxRate=?, stampTaxRate=?, minimumWage=? WHERE id=1'
    ).bind(sgkRate, unemploymentRate, incomeTaxRate, stampTaxRate, minimumWage).run();

    return c.json({ sgkRate, unemploymentRate, incomeTaxRate, stampTaxRate, minimumWage });
});

// ===== INIT DEFAULT DATA =====

app.get('/api/init', async (c) => {
    // Check if admin exists
    const existingAdmin = await c.env.DB.prepare(
        'SELECT * FROM users WHERE username = ?'
    ).bind('admin').first();

    if (!existingAdmin) {
        const hashedPassword = await hashPassword('admin123');
        await c.env.DB.prepare(
            'INSERT INTO users (username, password, fullName, role) VALUES (?, ?, ?, ?)'
        ).bind('admin', hashedPassword, 'Sistem Admin', 'admin').run();
    }

    // Check if settings exist
    const existingSettings = await c.env.DB.prepare(
        'SELECT * FROM settings WHERE id = 1'
    ).first();

    if (!existingSettings) {
        await c.env.DB.prepare('INSERT INTO settings (id) VALUES (1)').run();
    }

    return c.json({ success: true, message: 'Database initialized' });
});

export default app;
