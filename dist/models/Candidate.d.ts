import { Model, Optional } from 'sequelize';
export interface CandidateAttributes {
    id: number;
    name: string;
    jobTitle?: string | null;
    company?: string | null;
    location?: string | null;
    salary?: string | null;
    skills?: string[] | null;
    experience?: string | null;
    education?: string | null;
    resumeUrl?: string | null;
    profileImage?: string | null;
    rating?: number | null;
    hourlyRate?: string | null;
    lastActive?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export type CandidateCreation = Optional<CandidateAttributes, 'id' | 'createdAt' | 'updatedAt'>;
export declare class Candidate extends Model<CandidateAttributes, CandidateCreation> implements CandidateAttributes {
    id: number;
    name: string;
    jobTitle: string | null;
    company: string | null;
    location: string | null;
    salary: string | null;
    skills: string[] | null;
    experience: string | null;
    education: string | null;
    resumeUrl: string | null;
    profileImage: string | null;
    rating: number | null;
    hourlyRate: string | null;
    lastActive: Date | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
//# sourceMappingURL=Candidate.d.ts.map