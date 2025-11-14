import { Request, Response, NextFunction } from 'express';
export declare function getCompanies(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function getCompany(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getCompanyJobs(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=companies.controller.d.ts.map