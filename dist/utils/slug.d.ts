import { Job, Company } from '../models';
export declare function toSlugSegment(input: string): string;
export declare function buildJobSlug(params: {
    title: string;
    company: string;
    location?: string | null;
    id: string;
}): string;
export declare function extractIdFromSlug(slugOrId: string): string;
export declare function ensureJobSlug(job: Job): Promise<string>;
export declare function buildCompanySlug(params: {
    name: string;
    id: string;
}): string;
export declare function ensureCompanySlug(company: Company): Promise<string>;
//# sourceMappingURL=slug.d.ts.map