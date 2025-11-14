import { Model, Optional } from 'sequelize';
export interface SavedCandidateAttributes {
    id: string;
    userId: string;
    candidateId: number;
    savedAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
export type SavedCandidateCreation = Optional<SavedCandidateAttributes, 'id' | 'savedAt' | 'createdAt' | 'updatedAt'>;
export declare class SavedCandidate extends Model<SavedCandidateAttributes, SavedCandidateCreation> implements SavedCandidateAttributes {
    id: string;
    userId: string;
    candidateId: number;
    savedAt: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
//# sourceMappingURL=SavedCandidate.d.ts.map