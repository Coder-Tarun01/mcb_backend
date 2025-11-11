import { Job, Company } from '../models';

// Normalize string: lowercase, remove accents, strip punctuation, spaces->hyphens, collapse hyphens
export function toSlugSegment(input: string): string {
  const normalized = (input || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove punctuation
    .trim()
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/-+/g, '-'); // collapse hyphens
  return normalized;
}

// Build job slug: /jobs/<title>-<optional-location>-at-<company>-<id>
export function buildJobSlug(params: {
  title: string;
  company: string;
  location?: string | null;
  id: string;
}): string {
  const titlePart = toSlugSegment(params.title);
  const companyPart = toSlugSegment(params.company);
  const locationRaw = params.location?.toString().trim();
  const locationPart = locationRaw ? toSlugSegment(locationRaw.split(',')[0] || '') : '';

  const parts = [titlePart];
  if (locationPart) parts.push(locationPart);
  parts.push('at', companyPart, params.id.toLowerCase());

  return parts.filter(Boolean).join('-');
}

// Extract id from slug by taking the last hyphen-separated token
export function extractIdFromSlug(slugOrId: string): string {
  if (!slugOrId) return '';
  // If the string contains a UUID, return the UUID (handles ids with hyphens)
  const uuidMatch = slugOrId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (uuidMatch) return uuidMatch[0];
  // Fallback: take the last hyphen-separated token
  const token = slugOrId.split('-').pop() as string;
  return token || slugOrId;
}

// Ensure job has slug stored; compute from fields and id, but do not overwrite existing
export async function ensureJobSlug(job: Job): Promise<string> {
  if (job.slug) return job.slug;
  const built = buildJobSlug({
    title: job.title,
    company: job.company,
    location: job.location || job.city || undefined,
    id: job.id,
  });
  await job.update({ slug: built });
  return built;
}

// Build company slug: /companies/<company-name>-<id>
export function buildCompanySlug(params: { name: string; id: string }): string {
  const namePart = toSlugSegment(params.name);
  const idPart = String(params.id || '').toLowerCase();
  return [namePart, idPart].filter(Boolean).join('-');
}

export async function ensureCompanySlug(company: Company): Promise<string> {
  if (company.slug) return company.slug;
  let built = buildCompanySlug({ name: (company as any).name || '', id: (company as any).id || '' });
  if (!built || built.trim() === '') {
    built = String((company as any).id || '').toLowerCase();
  }
  // As a final guard, if still empty, do not update to avoid unique ''
  if (!built) return company.slug || '';
  await company.update({ slug: built });
  return built;
}


