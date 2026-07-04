import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../services/db';
import { z } from 'zod';

const letterSchema = z.object({
  jurisdiction: z.enum(['GDPR', 'CCPA', 'DPDP']),
  userName: z.string().min(1),
  userEmail: z.string().email(),
  userPhone: z.string().optional(),
  targetCompany: z.string().min(1)
});

const taskSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  details: z.string().optional(),
  optOutUrl: z.string().optional()
});

const updateTaskSchema = z.object({
  isCompleted: z.boolean().optional(),
  sentDate: z.string().optional() // ISO string or null
});

// A curated list of data brokers for opt-outs
const DATA_BROKERS = [
  { name: 'Truecaller', jurisdiction: 'India', optOutUrl: 'https://truecaller.com/unlisting', category: 'Caller Registry' },
  { name: 'Spokeo', jurisdiction: 'Global', optOutUrl: 'https://spokeo.com/optout', category: 'People Search' },
  { name: 'Whitepages', jurisdiction: 'Global', optOutUrl: 'https://whitepages.com/suppression-requests', category: 'People Search' },
  { name: 'Radaris', jurisdiction: 'Global', optOutUrl: 'https://radaris.com/control/privacy', category: 'People Search' },
  { name: 'BeenVerified', jurisdiction: 'Global', optOutUrl: 'https://beenverified.com/optout', category: 'People Search' },
  { name: 'Justdial', jurisdiction: 'India', optOutUrl: 'https://justdial.com/support/contactus', category: 'Local Directory' }
];

export async function getDataBrokersList(req: AuthRequest, res: Response) {
  try {
    return res.status(200).json({ success: true, brokers: DATA_BROKERS });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function generateOptOutLetter(req: AuthRequest, res: Response) {
  try {
    const { jurisdiction, userName, userEmail, userPhone, targetCompany } = letterSchema.parse(req.body);

    let letter = '';
    const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

    if (jurisdiction === 'GDPR') {
      letter = `Subject: Right to Erasure Request (GDPR Article 17) - Request for Deletion of Personal Data

Date: ${dateStr}

To: Privacy Officer / Data Protection Officer
Company Name: ${targetCompany}

To Whom It May Concern,

I am writing to submit a formal request for the erasure of my personal data under Article 17 of the General Data Protection Regulation (GDPR). 

Please immediately and permanently delete all personal data you process and store associated with my identity, specifically:
- Full Name: ${userName}
- Email Address: ${userEmail}
${userPhone ? `- Phone Number: ${userPhone}` : ''}

Under GDPR Article 17, you are obligated to comply with this deletion request without undue delay and at the latest within one calendar month of receipt. 

Please send me written confirmation once the erasure has been completed.

Sincerely,
${userName}
(${userEmail})`;
    } else if (jurisdiction === 'CCPA') {
      letter = `Subject: CCPA Right to Delete Request - Request for Deletion of Personal Information

Date: ${dateStr}

To: Privacy / Compliance Department
Company Name: ${targetCompany}

To Whom It May Concern,

I am writing to submit a request to delete my personal information under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA).

Please delete all personal information that you maintain about me, specifically associated with:
- Full Name: ${userName}
- Email Address: ${userEmail}
${userPhone ? `- Phone Number: ${userPhone}` : ''}

Please note that under the CCPA, you must confirm receipt of this request within 10 business days and fully respond/comply within 45 days.

Kindly send me written confirmation once the deletion is complete.

Sincerely,
${userName}
(${userEmail})`;
    } else if (jurisdiction === 'DPDP') {
      letter = `Subject: Request for Erasure of Personal Data under Section 12 of DPDP Act, 2023

Date: ${dateStr}

To: Designated Grievance Officer / Data Protection Team
Company Name: ${targetCompany}

Dear Sir/Madam,

I am writing to submit a formal request for the correction and erasure of my personal data under Section 12 of the Digital Personal Data Protection (DPDP) Act, 2023.

I hereby request you to delete all personal data associated with my identity from your active systems, archives, and backup databases, specifically:
- Full Name: ${userName}
- Email Address: ${userEmail}
${userPhone ? `- Phone Number: ${userPhone}` : ''}

In accordance with Section 12 of the DPDP Act, as a Data Fiduciary, you are obligated to erase personal data upon receiving my request, unless retention is legally required. Further, in accordance with Section 6(4) of the Act, I hereby withdraw any consent previously granted to your organization to process my personal data.

Please confirm receipt of this request and provide a written confirmation once my personal data is permanently erased.

Thank you.

Sincerely,
${userName}
(${userEmail})`;
    }

    return res.status(200).json({ success: true, letter });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getCleaningTasks(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const tasks = await prisma.cleaningTask.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ success: true, tasks });
  } catch (error) {
    console.error('Fetch cleaning tasks error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function createCleaningTask(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const body = taskSchema.parse(req.body);

    const task = await prisma.cleaningTask.create({
      data: {
        userId: req.user.id,
        title: body.title,
        category: body.category,
        details: body.details || null,
        optOutUrl: body.optOutUrl || null
      }
    });

    return res.status(201).json({ success: true, task });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function updateCleaningTask(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;
    const body = updateTaskSchema.parse(req.body);

    const updateData: any = {};
    if (body.isCompleted !== undefined) updateData.isCompleted = body.isCompleted;
    if (body.sentDate !== undefined) {
      updateData.sentDate = body.sentDate ? new Date(body.sentDate) : null;
    }

    const task = await prisma.cleaningTask.update({
      where: { id, userId: req.user.id },
      data: updateData
    });

    return res.status(200).json({ success: true, task });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: error.errors });
    }
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function deleteCleaningTask(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { id } = req.params;

    await prisma.cleaningTask.delete({
      where: { id, userId: req.user.id }
    });

    return res.status(200).json({ success: true, message: 'Cleaning task deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
