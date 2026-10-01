import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { isDbConnected } from '../config/db';
import type { AuthenticatedRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'actify_super_secret_jwt_key_2025';

// Pre-seeded Demo credentials requested by user
export const DEMO_USER = {
  id: 'demo_john_123456',
  name: 'John Doe',
  email: 'john@gmail.com',
  password: '123456',
  // bcrypt hash for "123456" with salt rounds 10
  passwordHash: '$2a$10$7v2tT3o3zS2oT7oW3vF6hOaU7XzIe6YyW0g6C1sN5K0n5d5p1n2eS',
};

// In-memory user store
const inMemoryUsers: Map<string, { id: string; name: string; email: string; passwordHash: string }> = new Map();

// Initialize in-memory demo user
(async () => {
  const hash = await bcrypt.hash(DEMO_USER.password, 10);
  inMemoryUsers.set(DEMO_USER.email, {
    id: DEMO_USER.id,
    name: DEMO_USER.name,
    email: DEMO_USER.email,
    passwordHash: hash,
  });
})();

// Function to ensure demo user exists in MongoDB
export async function seedDemoUserInMongo() {
  if (!isDbConnected()) return;
  try {
    const existing = await User.findOne({ email: DEMO_USER.email });
    if (!existing) {
      const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
      await User.create({
        name: DEMO_USER.name,
        email: DEMO_USER.email,
        passwordHash,
      });
      console.log('✅ Demo user john@gmail.com seeded in MongoDB');
    }
  } catch (err: any) {
    console.warn('Demo seed notice:', err.message);
  }
}

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function createToken(userId: string, email: string): string {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '14d' });
}

export async function register(req: Request, res: Response) {
  try {
    const parseResult = RegisterSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Validation error' });
    }

    const { name, email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    if (isDbConnected()) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email: normalizedEmail,
        passwordHash,
      });

      const token = createToken(user._id.toString(), user.email);
      return res.status(201).json({
        user: { id: user._id.toString(), name: user.name, email: user.email },
        token,
        source: 'mongodb',
      });
    } else {
      // In-memory fallback
      if (inMemoryUsers.has(normalizedEmail)) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const id = 'mem_' + Date.now();
      const userObj = { id, name, email: normalizedEmail, passwordHash };
      inMemoryUsers.set(normalizedEmail, userObj);

      const token = createToken(id, normalizedEmail);
      return res.status(201).json({
        user: { id, name, email: normalizedEmail },
        token,
        source: 'memory_fallback',
      });
    }
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0]?.message || 'Validation error' });
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Special instant handler for john@gmail.com demo login
    if (normalizedEmail === DEMO_USER.email && password === DEMO_USER.password) {
      if (isDbConnected()) {
        let user = await User.findOne({ email: DEMO_USER.email });
        if (!user) {
          const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
          user = await User.create({
            name: DEMO_USER.name,
            email: DEMO_USER.email,
            passwordHash,
          });
        }
        const token = createToken(user._id.toString(), user.email);
        return res.json({
          user: { id: user._id.toString(), name: user.name, email: user.email },
          token,
          source: 'mongodb',
        });
      } else {
        const token = createToken(DEMO_USER.id, DEMO_USER.email);
        return res.json({
          user: { id: DEMO_USER.id, name: DEMO_USER.name, email: DEMO_USER.email },
          token,
          source: 'demo_fallback',
        });
      }
    }

    if (isDbConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = createToken(user._id.toString(), user.email);
      return res.json({
        user: { id: user._id.toString(), name: user.name, email: user.email },
        token,
        source: 'mongodb',
      });
    } else {
      // In-memory fallback
      const user = inMemoryUsers.get(normalizedEmail);
      if (!user) {
        // Auto-register demo test accounts
        const passwordHash = await bcrypt.hash(password, 10);
        const id = 'mem_' + Date.now();
        const demoUser = { id, name: normalizedEmail.split('@')[0], email: normalizedEmail, passwordHash };
        inMemoryUsers.set(normalizedEmail, demoUser);
        const token = createToken(id, normalizedEmail);
        return res.json({
          user: { id, name: demoUser.name, email: demoUser.email },
          token,
          source: 'memory_fallback',
        });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = createToken(user.id, user.email);
      return res.json({
        user: { id: user.id, name: user.name, email: user.email },
        token,
        source: 'memory_fallback',
      });
    }
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isDbConnected()) {
      const user = await User.findById(req.user.id).select('-passwordHash');
      if (user) {
        return res.json({
          user: { id: user._id.toString(), name: user.name, email: user.email },
        });
      }
    }

    return res.json({
      user: { id: req.user.id, name: req.user.email.split('@')[0], email: req.user.email },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}
