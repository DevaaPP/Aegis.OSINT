import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../services/db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { CONFIG } from '../config';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const updateProfileSchema = z.object({
  name: z.string().optional(),
  password: z.string().min(8).optional()
});

export async function register(req: AuthRequest, res: Response) {
  try {
    const body = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name || null
      }
    });

    // Create default cleaning tasks for the user so they have a starting checklist
    const defaultTasks = [
      { title: 'Unlist phone number from Truecaller registry', category: 'Data Broker', optOutUrl: 'https://truecaller.com/unlisting' },
      { title: 'Check Google Calendar visibility permissions', category: 'Account Deletion' },
      { title: 'Strip GPS locations from social media profile pictures', category: 'Password Reset' },
      { title: 'Submit Right to Erasure request to Spokeo directory', category: 'Data Broker', optOutUrl: 'https://spokeo.com/optout' }
    ];

    await prisma.cleaningTask.createMany({
      data: defaultTasks.map(t => ({ ...t, userId: user.id }))
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTER',
        details: `Registered account: ${user.email}`
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, CONFIG.JWT_SECRET, {
      expiresIn: CONFIG.JWT_EXPIRES_IN
    });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function login(req: AuthRequest, res: Response) {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: `Logged in successfully: ${user.email}`
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, CONFIG.JWT_SECRET, {
      expiresIn: CONFIG.JWT_EXPIRES_IN
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const body = updateProfileSchema.parse(req.body);

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_PROFILE',
        details: 'Updated profile attributes'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    console.error('Profile update error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteAccount(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userId = req.user.id;

    // Delete audit log first or set null, since cascade deletes scans/tasks
    await prisma.auditLog.create({
      data: {
        userId: null,
        action: 'ACCOUNT_DELETION',
        details: `Deleted account associated with ID: ${userId}`
      }
    });

    // Delete user (cascade will delete scans, findings, and tasks)
    await prisma.user.delete({ where: { id: userId } });

    return res.status(200).json({
      success: true,
      message: 'Account and associated data deleted completely from databases.'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function exportData(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        scans: {
          include: { findings: true }
        },
        cleaningTasks: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const exportPayload = {
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      },
      scans: user.scans.map(s => ({
        id: s.id,
        target: s.target,
        type: s.type,
        riskScore: s.riskScore,
        createdAt: s.createdAt,
        findings: s.findings.map(f => ({
          category: f.category,
          severity: f.severity,
          title: f.title,
          description: f.description,
          remediation: f.remediation
        }))
      })),
      cleaningTasks: user.cleaningTasks.map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        details: t.details,
        optOutUrl: t.optOutUrl,
        isCompleted: t.isCompleted,
        sentDate: t.sentDate
      }))
    };

    res.setHeader('Content-disposition', `attachment; filename=privacy_dump_${user.id}.json`);
    res.setHeader('Content-type', 'application/json');
    return res.send(JSON.stringify(exportPayload, null, 2));
  } catch (error) {
    console.error('Export data error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Password Reset Simulation endpoints (mocking token issuance and verify)
export async function requestPasswordReset(req: AuthRequest, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return 200 to prevent user enumeration attacks
    return res.status(200).json({ success: true, message: 'If email exists, reset token logged.' });
  }

  const resetToken = crypto.randomBytes(20).toString('hex');
  console.log(`[SIMULATION] Password Reset Token for ${email}: ${resetToken}`);

  return res.status(200).json({
    success: true,
    message: 'If email exists, a password reset link has been logged.',
    // Sending it in response for the sandbox convenience, in prod it goes only to email logs!
    debugToken: resetToken
  });
}
