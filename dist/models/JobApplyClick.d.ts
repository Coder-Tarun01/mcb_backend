import { Model, Optional } from 'sequelize';
export interface JobApplyClickAttributes {
    id: string;
    jobId: string;
    userId: string;
    createdAt?: Date;
}
export type JobApplyClickCreation = Optional<JobApplyClickAttributes, 'id' | 'createdAt'>;
export declare class JobApplyClick extends Model<JobApplyClickAttributes, JobApplyClickCreation> implements JobApplyClickAttributes {
    id: string;
    jobId: string;
    userId: string;
    readonly createdAt: Date;
}
//# sourceMappingURL=JobApplyClick.d.ts.map