import { Model, Optional } from 'sequelize';
export interface SavedJobAttributes {
    id: string;
    userId: string;
    jobId: string;
    savedAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
export type SavedJobCreation = Optional<SavedJobAttributes, 'id' | 'savedAt' | 'createdAt' | 'updatedAt'>;
export declare class SavedJob extends Model<SavedJobAttributes, SavedJobCreation> implements SavedJobAttributes {
    id: string;
    userId: string;
    jobId: string;
    savedAt: Date;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
//# sourceMappingURL=SavedJob.d.ts.map