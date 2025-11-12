import { Model, Optional } from 'sequelize';
export interface UserAttributes {
    id: string;
    email: string;
    name: string;
    password: string;
    phone?: string | null;
    role: 'employee' | 'employer';
    companyName?: string | null;
    skills?: string[] | null;
    resumeUrl?: string | null;
    avatarUrl?: string | null;
    companyLogo?: string | null;
    professionalTitle?: string | null;
    languages?: string | null;
    age?: string | null;
    currentSalary?: string | null;
    expectedSalary?: string | null;
    description?: string | null;
    country?: string | null;
    postcode?: string | null;
    city?: string | null;
    fullAddress?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export type UserCreation = Optional<UserAttributes, 'id' | 'phone' | 'createdAt' | 'updatedAt'>;
export declare class User extends Model<UserAttributes, UserCreation> implements UserAttributes {
    id: string;
    email: string;
    name: string;
    password: string;
    phone: string | null;
    role: 'employee' | 'employer';
    companyName: string | null;
    skills: string[] | null;
    resumeUrl: string | null;
    avatarUrl: string | null;
    companyLogo: string | null;
    professionalTitle: string | null;
    languages: string | null;
    age: string | null;
    currentSalary: string | null;
    expectedSalary: string | null;
    description: string | null;
    country: string | null;
    postcode: string | null;
    city: string | null;
    fullAddress: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
//# sourceMappingURL=User.d.ts.map