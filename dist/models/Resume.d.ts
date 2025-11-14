import { Model, Optional } from 'sequelize';
export interface ResumeAttributes {
    id: string;
    userId: string;
    title: string;
    isPrimary: boolean;
    isPublic: boolean;
    status: 'draft' | 'published' | 'archived';
    personalInfo: {
        fullName: string;
        email: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        linkedin: string;
        website: string;
        summary: string;
        headline: string;
    };
    workExperience: Array<{
        id: string;
        company: string;
        position: string;
        location: string;
        startDate: string;
        endDate: string;
        isCurrent: boolean;
        description: string;
        achievements: string[];
    }>;
    education: Array<{
        id: string;
        institution: string;
        degree: string;
        field: string;
        location: string;
        startDate: string;
        endDate: string;
        gpa: string;
        description: string;
    }>;
    skills: Array<{
        id: string;
        name: string;
        level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
        category: string;
    }>;
    projects: Array<{
        id: string;
        name: string;
        description: string;
        technologies: string[];
        startDate: string;
        endDate: string;
        url: string;
        github: string;
    }>;
    certifications: Array<{
        id: string;
        name: string;
        issuer: string;
        date: string;
        expiryDate: string;
        credentialId: string;
        url: string;
    }>;
    languages: Array<{
        id: string;
        language: string;
        proficiency: 'basic' | 'conversational' | 'professional' | 'native';
    }>;
    references: Array<{
        id: string;
        name: string;
        position: string;
        company: string;
        email: string;
        phone: string;
        relationship: string;
    }>;
    additionalInfo: {
        interests: string[];
        volunteerWork: Array<{
            id: string;
            organization: string;
            position: string;
            startDate: string;
            endDate: string;
            description: string;
        }>;
        publications: Array<{
            id: string;
            title: string;
            publisher: string;
            date: string;
            url: string;
        }>;
        awards: Array<{
            id: string;
            title: string;
            issuer: string;
            date: string;
            description: string;
        }>;
        careerProfile?: string;
    };
    settings: {
        template: string;
        colorScheme: string;
        fontFamily: string;
        fontSize: number;
        margins: {
            top: number;
            bottom: number;
            left: number;
            right: number;
        };
        sections: {
            personalInfo: boolean;
            summary: boolean;
            workExperience: boolean;
            education: boolean;
            skills: boolean;
            projects: boolean;
            certifications: boolean;
            languages: boolean;
            references: boolean;
            additionalInfo: boolean;
        };
        sectionOrder: string[];
    };
    createdAt: Date;
    updatedAt: Date;
}
export type ResumeCreationAttributes = Optional<ResumeAttributes, 'id' | 'createdAt' | 'updatedAt'>;
export declare class Resume extends Model<ResumeAttributes, ResumeCreationAttributes> implements ResumeAttributes {
    id: string;
    userId: string;
    title: string;
    isPrimary: boolean;
    isPublic: boolean;
    status: 'draft' | 'published' | 'archived';
    personalInfo: any;
    workExperience: any;
    education: any;
    skills: any;
    projects: any;
    certifications: any;
    languages: any;
    references: any;
    additionalInfo: any;
    settings: any;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Resume.d.ts.map