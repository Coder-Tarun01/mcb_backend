import { Request, Response, NextFunction } from 'express';
import { performance } from 'node:perf_hooks';
import { Op } from 'sequelize';
import Fuse from 'fuse.js';
import { Job, Company, User, AccountsJobData } from '../models';
import { AuthRequest } from '../middleware/auth';

type SuggestionCategory = 'jobs' | 'companies' | 'skills' | 'locations';

export interface SuggestionResponse {
  jobs: string[];
  companies: string[];
  skills: string[];
  locations: string[];
  meta?: {
    cached: boolean;
    tookMs: number;
    trending?: Partial<Record<SuggestionCategory, string[]>>;
  };
}

interface CacheEntry {
  expiresAt: number;
  data: SuggestionResponse;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RESULTS_PER_CATEGORY = 8;
const cache = new Map<string, CacheEntry>();

const fuseStringOptions: Fuse.IFuseOptions<{ value: string; weight?: number; extra?: string }> = {
  includeScore: true,
  shouldSort: true,
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: [
    { name: 'value', weight: 0.7 },
    { name: 'extra', weight: 0.3 },
  ],
};

function sanitizeString(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function dedupe(values: (string | null | undefined)[], limit = MAX_RESULTS_PER_CATEGORY): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    if (!raw) continue;
    const normalized = raw.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function scoreByFrequency(values: string[]): string[] {
  const map = new Map<string, { value: string; count: number }>();
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    const entry = map.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      map.set(key, { value, count: 1 });
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .map((entry) => entry.value);
}

function applyPersonalization(
  base: SuggestionResponse,
  userData?: { city?: string | null; country?: string | null; skills?: string[] | null }
): SuggestionResponse {
  if (!userData) return base;
  const clone: SuggestionResponse = {
    ...base,
    jobs: [...base.jobs],
    companies: [...base.companies],
    skills: [...base.skills],
    locations: [...base.locations],
    meta: base.meta ? { ...base.meta } : undefined,
  };

  if (userData.skills?.length) {
    const skillPriority = new Set(userData.skills.map((s) => s.toLowerCase()));
    clone.skills.sort((a, b) => {
      const aPriority = skillPriority.has(a.toLowerCase()) ? 1 : 0;
      const bPriority = skillPriority.has(b.toLowerCase()) ? 1 : 0;
      return bPriority - aPriority;
    });
  }

  const preferredLocations = [userData.city, userData.country].filter(Boolean).map((item) => (item as string).toLowerCase());
  if (preferredLocations.length) {
    clone.locations.sort((a, b) => {
      const aPriority = preferredLocations.some((loc) => a.toLowerCase().includes(loc)) ? 1 : 0;
      const bPriority = preferredLocations.some((loc) => b.toLowerCase().includes(loc)) ? 1 : 0;
      return bPriority - aPriority;
    });
  }

  return clone;
}

function parseSkills(rawSkills?: string | string[] | null): string[] {
  if (!rawSkills) return [];
  if (Array.isArray(rawSkills)) {
    return rawSkills
      .map((skill) => sanitizeString(typeof skill === 'string' ? skill : String(skill)))
      .filter((skill): skill is string => Boolean(skill));
  }

  const trimmed = rawSkills.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((skill) => sanitizeString(typeof skill === 'string' ? skill : String(skill)))
        .filter((skill): skill is string => Boolean(skill));
    }
  } catch {
    // Not JSON, fall back to delimiter split
  }

  return trimmed
    .split(/[,|;/]/)
    .map((skill) => sanitizeString(skill))
    .filter((skill): skill is string => Boolean(skill));
}

async function loadUserContext(req: Request): Promise<{ city?: string | null; country?: string | null; skills?: string[] | null } | undefined> {
  const authReq = req as AuthRequest;
  if (!authReq.user?.id) return undefined;
  try {
    const user = await User.findByPk(authReq.user.id, {
      attributes: ['city', 'country', 'skills'],
    });
    if (!user) return undefined;
    return {
      city: user.city,
      country: user.country,
      skills: user.skills,
    };
  } catch (error) {
    console.warn('Unable to personalize suggestions for user', error);
    return undefined;
  }
}

async function buildSuggestionPayload(query: string): Promise<SuggestionResponse> {
  const normalizedQuery = query.trim();
  const likePattern = `%${normalizedQuery}%`;
  const limit = normalizedQuery ? 200 : 120;

  const [jobRecords, companyRecords, externalJobRecords] = await Promise.all([
    Job.findAll({
      where: normalizedQuery
        ? {
            [Op.or]: [
              { title: { [Op.iLike]: likePattern } },
              { company: { [Op.iLike]: likePattern } },
              { description: { [Op.iLike]: likePattern } },
              { category: { [Op.iLike]: likePattern } },
              { location: { [Op.iLike]: likePattern } },
              { city: { [Op.iLike]: likePattern } },
              { state: { [Op.iLike]: likePattern } },
              { country: { [Op.iLike]: likePattern } },
            ],
          }
        : undefined,
      attributes: [
        'title',
        'company',
        'category',
        'location',
        'city',
        'state',
        'country',
        'skillsRequired',
        'experienceLevel',
        'createdAt',
      ],
      order: [['createdAt', 'DESC']],
      limit,
    }),
    Company.findAll({
      where: normalizedQuery ? { name: { [Op.iLike]: likePattern } } : undefined,
      attributes: ['name', 'industry', 'location'],
      limit: 120,
      order: [['updatedAt', 'DESC']],
    }),
    AccountsJobData.findAll({
      where: normalizedQuery
        ? {
            [Op.or]: [
              { title: { [Op.iLike]: likePattern } },
              { company: { [Op.iLike]: likePattern } },
              { description: { [Op.iLike]: likePattern } },
              { skills: { [Op.iLike]: likePattern } },
              { job_type: { [Op.iLike]: likePattern } },
              { location: { [Op.iLike]: likePattern } },
            ],
          }
        : undefined,
      attributes: ['title', 'company', 'location', 'skills', 'experience', 'posted_date', 'job_type'],
      order: [['posted_date', 'DESC']],
      limit,
    }),
  ]);

  const jobItems = [
    ...jobRecords
    .map((job) => ({
      value: job.title,
      extra: [job.company, job.category, job.experienceLevel].filter(Boolean).join(' • '),
      weight: job.createdAt ? new Date(job.createdAt).getTime() : 0,
    }))
      .filter((item) => sanitizeString(item.value)),
    ...externalJobRecords
      .map((job) => {
        const jobData = job.toJSON() as {
          title?: string | null;
          company?: string | null;
          job_type?: string | null;
          experience?: string | null;
          posted_date?: Date | string | null;
        };
        return {
          value: jobData.title ?? '',
          extra: [jobData.company, jobData.job_type, jobData.experience].filter(Boolean).join(' • '),
          weight: jobData.posted_date ? new Date(jobData.posted_date).getTime() : 0,
        };
      })
      .filter((item) => sanitizeString(item.value)),
  ];

  const companyItems = [
    ...companyRecords.map((company) => ({
      value: company.name,
      extra: [company.industry, company.location].filter(Boolean).join(' • '),
    })),
    ...jobRecords
      .map((job) => ({
        value: job.company,
        extra: job.category ?? undefined,
      }))
      .filter((item) => sanitizeString(item.value)),
    ...aiJobRecords
      .map((job) => {
        const jobData = job.toJSON() as { company?: string | null; job_type?: string | null };
        return {
          value: jobData.company ?? '',
          extra: jobData.job_type ?? undefined,
        };
      })
      .filter((item) => sanitizeString(item.value)),
  ];

  const skillCandidates: string[] = [
    ...jobRecords.flatMap((job) => {
      if (!Array.isArray(job.skillsRequired)) return [];
      return job.skillsRequired
        .map((skill) => sanitizeString(typeof skill === 'string' ? skill : String(skill)))
        .filter((skill): skill is string => Boolean(skill));
    }),
    ...aiJobRecords.flatMap((job) => {
      const jobData = job.toJSON() as { skills?: string | string[] | null };
      return parseSkills(jobData.skills);
    }),
  ];

  const locationCandidates = [
    ...jobRecords
      .flatMap((job) => [job.location, job.city, job.state, job.country])
      .map((value) => sanitizeString(value))
      .filter((value): value is string => Boolean(value)),
    ...aiJobRecords
      .map((job) => {
        const jobData = job.toJSON() as { location?: string | null };
        return sanitizeString(jobData.location);
      })
      .filter((value): value is string => Boolean(value)),
  ];

  const jobSuggestions = normalizedQuery
    ? new Fuse(jobItems, fuseStringOptions)
        .search(normalizedQuery)
        .slice(0, MAX_RESULTS_PER_CATEGORY)
        .map((result) => result.item.value)
    : dedupe(jobItems.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).map((item) => item.value));

  const companySuggestions = normalizedQuery
    ? new Fuse(companyItems, fuseStringOptions)
        .search(normalizedQuery)
        .slice(0, MAX_RESULTS_PER_CATEGORY)
        .map((result) => result.item.value)
    : dedupe(scoreByFrequency(companyItems.map((item) => item.value)));

  const skillSuggestions = normalizedQuery
    ? new Fuse(
        skillCandidates.map((skill) => ({ value: skill })),
        fuseStringOptions
      )
        .search(normalizedQuery)
        .slice(0, MAX_RESULTS_PER_CATEGORY)
        .map((result) => result.item.value)
    : dedupe(scoreByFrequency(skillCandidates));

  const locationSuggestions = normalizedQuery
    ? new Fuse(
        locationCandidates.map((location) => ({ value: location })),
        fuseStringOptions
      )
        .search(normalizedQuery)
        .slice(0, MAX_RESULTS_PER_CATEGORY)
        .map((result) => result.item.value)
    : dedupe(scoreByFrequency(locationCandidates));

  const trending: Partial<Record<SuggestionCategory, string[]>> = {
    jobs: dedupe(scoreByFrequency(jobItems.map((item) => item.value)), MAX_RESULTS_PER_CATEGORY),
    companies: dedupe(scoreByFrequency(companyItems.map((item) => item.value)), MAX_RESULTS_PER_CATEGORY),
    skills: dedupe(scoreByFrequency(skillCandidates), MAX_RESULTS_PER_CATEGORY),
    locations: dedupe(scoreByFrequency(locationCandidates), MAX_RESULTS_PER_CATEGORY),
  };

  return {
    jobs: jobSuggestions,
    companies: companySuggestions,
    skills: skillSuggestions,
    locations: locationSuggestions,
    meta: {
      cached: false,
      tookMs: 0,
      trending,
    },
  };
}

export async function getSuggestions(req: Request, res: Response, next: NextFunction) {
  const started = performance.now();
  try {
    const query = typeof req.query.query === 'string' ? req.query.query : '';
    const cacheKey = query.toLowerCase();
    const now = Date.now();

    let baseResponse: SuggestionResponse | undefined;
    const cachedEntry = cache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > now) {
      baseResponse = {
        ...cachedEntry.data,
        meta: {
          ...(cachedEntry.data.meta ?? {}),
          cached: true,
          tookMs: Number((performance.now() - started).toFixed(2)),
        },
      };
    } else {
      baseResponse = await buildSuggestionPayload(query);
      baseResponse.meta = {
        ...(baseResponse.meta ?? {}),
        cached: false,
        tookMs: Number((performance.now() - started).toFixed(2)),
      };
      cache.set(cacheKey, {
        data: baseResponse,
        expiresAt: now + CACHE_TTL_MS,
      });
    }

    const userContext = await loadUserContext(req);
    const personalizedResponse = applyPersonalization(baseResponse, userContext);
    if (personalizedResponse.meta) {
      personalizedResponse.meta.tookMs = Number((performance.now() - started).toFixed(2));
    }

    res.json(personalizedResponse);
  } catch (error) {
    next(error);
  }
}

