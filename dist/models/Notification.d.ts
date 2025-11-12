import { Model, Optional } from 'sequelize';
export interface NotificationAttributes {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'application' | 'job' | 'system' | 'message';
    isRead: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
export type NotificationCreation = Optional<NotificationAttributes, 'id' | 'isRead' | 'createdAt' | 'updatedAt'>;
export declare class Notification extends Model<NotificationAttributes, NotificationCreation> implements NotificationAttributes {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'application' | 'job' | 'system' | 'message';
    isRead: boolean;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
//# sourceMappingURL=Notification.d.ts.map