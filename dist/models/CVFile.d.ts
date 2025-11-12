import { Model, Optional } from 'sequelize';
export interface CVFileAttributes {
    id: string;
    userId: string;
    name: string;
    originalName: string;
    type: 'resume' | 'cover-letter' | 'portfolio' | 'certificate';
    size: number;
    mimeType: string;
    filePath: string;
    uploadDate: Date;
    isPrimary: boolean;
    isPublic: boolean;
    downloadCount: number;
    lastViewed: Date | null;
    status: 'active' | 'archived' | 'draft';
    description?: string | null;
    tags?: string[] | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export type CVFileCreation = Optional<CVFileAttributes, 'id' | 'downloadCount' | 'lastViewed' | 'createdAt' | 'updatedAt'>;
export declare class CVFile extends Model<CVFileAttributes, CVFileCreation> implements CVFileAttributes {
    id: string;
    userId: string;
    name: string;
    originalName: string;
    type: 'resume' | 'cover-letter' | 'portfolio' | 'certificate';
    size: number;
    mimeType: string;
    filePath: string;
    uploadDate: Date;
    isPrimary: boolean;
    isPublic: boolean;
    downloadCount: number;
    lastViewed: Date | null;
    status: 'active' | 'archived' | 'draft';
    description: string | null;
    tags: string[] | null;
    createdAt: Date;
    updatedAt: Date;
}
export default CVFile;
//# sourceMappingURL=CVFile.d.ts.map