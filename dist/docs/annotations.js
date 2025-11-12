"use strict";
/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
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
 *     Job:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         company:
 *           type: string
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
 *     Candidate:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         jobTitle:
 *           type: string
 *           nullable: true
 *         location:
 *           type: string
 *           nullable: true
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=annotations.js.map