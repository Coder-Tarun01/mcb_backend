import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Candidate, Job, User, Notification, SavedJob, Application } from '../models';

function readJson<T>(relativePath: string): T {
  const full = path.resolve(process.cwd(), relativePath);
  const raw = fs.readFileSync(full, 'utf-8');
  return JSON.parse(raw) as T;
}

export async function runSeed() {
  try {
    const base = process.env.SEED_DIR || 'seed';
    const users = readJson<any[]>(`${base}/users.json`);
    const jobs = readJson<any[]>(`${base}/jobs.json`);
    const candidates = readJson<any[]>(`${base}/candidates.json`);
    const notifications = readJson<any[]>(`${base}/notifications.json`);
    const savedJobs = readJson<any[]>(`${base}/savedJobs.json`);
    const applications = readJson<any[]>(`${base}/applications.json`);

    const defaultPassword = await bcrypt.hash('password123', 10);

    await Promise.all([
      ...users.map(u => User.upsert({ 
        id: String(u.id), 
        email: u.email, 
        name: u.name, 
        password: defaultPassword,
        phone: u.phone ?? null, 
        role: (u.role === 'employer' ? 'employer' : 'employee') as 'employee' | 'employer',
        skills: u.skills || null,
        companyName: u.companyName || null
      })),
      ...jobs.map(j => Job.upsert({ id: String(j.id), title: j.title, company: j.company, location: j.location ?? null, type: j.type ?? null, category: j.category ?? null, isRemote: Boolean(j.isRemote), description: j.description ?? null })),
      ...candidates.map(c => Candidate.upsert({ id: Number(c.id), name: c.name, jobTitle: c.jobTitle ?? null, location: c.location ?? null })),
      ...notifications.map(n => Notification.upsert({ 
        id: String(n.id), 
        userId: String(n.userId), 
        title: n.title, 
        message: n.message, 
        type: n.type as 'application' | 'job' | 'system' | 'message',
        isRead: Boolean(n.isRead)
      })),
      ...savedJobs.map(s => SavedJob.upsert({
        id: String(s.id),
        userId: String(s.userId),
        jobId: String(s.jobId),
        savedAt: new Date(s.savedAt)
      })),
      ...applications.map(a => Application.upsert({
        id: String(a.id),
        userId: String(a.userId),
        jobId: String(a.jobId),
        status: a.status as 'pending' | 'reviewed' | 'accepted' | 'rejected',
        coverLetter: a.coverLetter || null,
        resumeUrl: a.resumeUrl || null,
        appliedAt: new Date(a.appliedAt)
      })),
    ]);

    console.log('Seed data loaded (default password: password123)');
  } catch (e) {
    console.warn('Seed failed (this is non-fatal):', e);
  }
}
