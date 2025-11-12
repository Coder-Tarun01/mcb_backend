"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSlugSegment = toSlugSegment;
exports.buildJobSlug = buildJobSlug;
exports.extractIdFromSlug = extractIdFromSlug;
exports.ensureJobSlug = ensureJobSlug;
exports.buildCompanySlug = buildCompanySlug;
exports.ensureCompanySlug = ensureCompanySlug;
// Normalize string: lowercase, remove accents, strip punctuation, spaces->hyphens, collapse hyphens
function toSlugSegment(input) {
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
function buildJobSlug(params) {
    const titlePart = toSlugSegment(params.title);
    const companyPart = toSlugSegment(params.company);
    const locationRaw = params.location?.toString().trim();
    const locationPart = locationRaw ? toSlugSegment(locationRaw.split(',')[0] || '') : '';
    const parts = [titlePart];
    if (locationPart)
        parts.push(locationPart);
    parts.push('at', companyPart, params.id.toLowerCase());
    return parts.filter(Boolean).join('-');
}
// Extract id from slug by taking the last hyphen-separated token
function extractIdFromSlug(slugOrId) {
    if (!slugOrId)
        return '';
    // If the string contains a UUID, return the UUID (handles ids with hyphens)
    const uuidMatch = slugOrId.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    if (uuidMatch)
        return uuidMatch[0];
    // Fallback: take the last hyphen-separated token
    const token = slugOrId.split('-').pop();
    return token || slugOrId;
}
// Ensure job has slug stored; compute from fields and id, but do not overwrite existing
async function ensureJobSlug(job) {
    if (job.slug)
        return job.slug;
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
function buildCompanySlug(params) {
    const namePart = toSlugSegment(params.name);
    const idPart = String(params.id || '').toLowerCase();
    return [namePart, idPart].filter(Boolean).join('-');
}
async function ensureCompanySlug(company) {
    if (company.slug)
        return company.slug;
    let built = buildCompanySlug({ name: company.name || '', id: company.id || '' });
    if (!built || built.trim() === '') {
        built = String(company.id || '').toLowerCase();
    }
    // As a final guard, if still empty, do not update to avoid unique ''
    if (!built)
        return company.slug || '';
    await company.update({ slug: built });
    return built;
}
//# sourceMappingURL=slug.js.map