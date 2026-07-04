import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../services/db';
import * as os from 'os';

export async function getSystemStats(req: AuthRequest, res: Response) {
  try {
    // DB Queries
    const userCount = await prisma.user.count();
    const scanCount = await prisma.scan.count();
    const logCount = await prisma.auditLog.count();
    const feedbackCount = await prisma.feedback.count();

    // OS Stats
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = parseFloat(((usedMemory / totalMemory) * 100).toFixed(1));

    const cpuLoad = os.loadavg();
    const cpuCount = os.cpus().length;

    const systemInfo = {
      cpuCount,
      cpuLoad5Min: cpuLoad[1] ? parseFloat(cpuLoad[1].toFixed(2)) : 0,
      memoryTotalGB: parseFloat((totalMemory / 1024 / 1024 / 1024).toFixed(2)),
      memoryUsedGB: parseFloat((usedMemory / 1024 / 1024 / 1024).toFixed(2)),
      memoryUsagePercent,
      platform: os.platform(),
      uptimeHours: parseFloat((os.uptime() / 3600).toFixed(1))
    };

    return res.status(200).json({
      success: true,
      stats: {
        userCount,
        scanCount,
        logCount,
        feedbackCount
      },
      systemInfo
    });
  } catch (error) {
    console.error('Fetch system stats error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getUsers(req: AuthRequest, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: { scans: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getAuditLogs(req: AuthRequest, res: Response) {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200 // Limit to latest 200 logs
    });

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (id === req.user?.id) {
      return res.status(400).json({ success: false, message: 'Admin cannot delete their own account from this console.' });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        action: 'ADMIN_DELETE_USER',
        details: `Admin deleted user account associated with ID: ${id}`
      }
    });

    return res.status(200).json({ success: true, message: 'User account deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function submitFeedback(req: Request | any, res: Response) {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'All feedback fields are required' });
    }

    const feedback = await prisma.feedback.create({
      data: { name, email, message }
    });

    return res.status(201).json({ success: true, message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getFeedback(req: AuthRequest, res: Response) {
  try {
    const feedbackList = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, feedback: feedbackList });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteFeedback(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    await prisma.feedback.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Feedback cleared' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
