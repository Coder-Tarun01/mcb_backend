import { Model, Optional } from 'sequelize';
export interface CompanyAttributes {
    id: string;
    name: string;
    slug?: string | null;
    previousSlugs?: string[] | null;
    description?: string | null;
    website?: string | null;
    logo?: string | null;
    industry?: string | null;
    size?: string | null;
    location?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export type CompanyCreation = Optional<CompanyAttributes, 'id' | 'createdAt' | 'updatedAt'>;
export declare class Company extends Model<CompanyAttributes, CompanyCreation> implements CompanyAttributes {
    id: string;
    name: string;
    slug: string | null;
    previousSlugs: string[] | null;
    description: string | null;
    website: string | null;
    logo: string | null;
    industry: string | null;
    size: string | null;
    location: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
//# sourceMappingURL=Company.d.ts.map