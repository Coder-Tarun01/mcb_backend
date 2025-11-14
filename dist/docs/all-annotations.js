"use strict";
/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *           nullable: true
 *         role:
 *           type: string
 *           enum: [employee, employer]
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *         resumeUrl:
 *           type: string
 *           nullable: true
 *         avatarUrl:
 *           type: string
 *           nullable: true
 *     Job:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         company:
 *           type: string
 *         companyId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         location:
 *           type: string
 *           nullable: true
 *         type:
 *           type: string
 *           nullable: true
 *         category:
 *           type: string
 *           nullable: true
 *         isRemote:
 *           type: boolean
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *     Application:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         jobId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, reviewed, accepted, rejected]
 *         coverLetter:
 *           type: string
 *           nullable: true
 *         resumeUrl:
 *           type: string
 *           nullable: true
 *         appliedAt:
 *           type: string
 *           format: date-time
 *     SavedJob:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         jobId:
 *           type: string
 *         savedAt:
 *           type: string
 *           format: date-time
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         type:
 *           type: string
 *           enum: [application, job, system, message]
 *         isRead:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Company:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         website:
 *           type: string
 *           nullable: true
 *         logo:
 *           type: string
 *           nullable: true
 *         industry:
 *           type: string
 *           nullable: true
 *         size:
 *           type: string
 *           nullable: true
 *         location:
 *           type: string
 *           nullable: true
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *         password:
 *           type: string
 *     RegisterRequest:
 *       type: object
 *       required: [email, password, name]
 *       properties:
 *         email:
 *           type: string
 *         password:
 *           type: string
 *         name:
 *           type: string
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *           enum: [employee, employer]
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=all-annotations.js.map