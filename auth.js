import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const JWT_SECRET = 'your-super-secret-key-change-this-in-production';

// 1. User Database (Replace with DB query like SQLite/PostgreSQL in production)
export const USERS = [
  {
    id: '1',
    username: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10), // Password: admin123
    role: 'admin',
  },
  {
    id: '2',
    username: 'viewer',
    passwordHash: bcrypt.hashSync('user123', 10),  // Password: user123
    role: 'user',
  },  
  {
    id: '3',
    username: 'developer',
    passwordHash: bcrypt.hashSync('dev123', 10),  // Password: dev123
    role: 'developer',
  },
];

// 2. Middleware to authenticate requests using JWT
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user; // Attaches { id, username, role } to the request
    next();
  });
}

// 3. Login Route Handler
export function handleLogin(req, res) {
  const { username, password } = req.body;
  const user = USERS.find((u) => u.username === username);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, role: user.role, username: user.username });
}