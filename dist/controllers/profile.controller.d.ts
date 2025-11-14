import type { NextFunction, Request, RequestHandler, Response } from 'express';
export declare const uploadResume: RequestHandler;
export declare const uploadAvatar: RequestHandler;
export declare const getProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const uploadResumeHandler: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const uploadAvatarHandler: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getSkills: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateSkills: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=profile.controller.d.ts.map