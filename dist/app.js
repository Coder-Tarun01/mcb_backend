"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./docs/swagger");
const app = (0, express_1.default)();
// Configure CORS to allow all origins
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins
    credentials: true, // Allow credentials (cookies, authorization headers)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Allow all common HTTP methods
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'X-Admin-Key',
        'X-Marketing-Token',
        'X-Marketing-Health-Token'
    ], // Allow common headers plus custom admin/marketing tokens
    exposedHeaders: ['Content-Range', 'X-Content-Range'], // Expose additional headers if needed
    maxAge: 86400 // Cache preflight requests for 24 hours
}));
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resources
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('dev'));
// Serve static files from uploads directory (project root /uploads)
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
app.get('/openapi.json', (_req, res) => res.json(swagger_1.swaggerSpec));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.use('/api', routes_1.default);
// Dynamic sitemap.xml at root (uses slugs)
app.get('/sitemap.xml', async (_req, res) => {
    try {
        const baseUrl = process.env.SITE_BASE_URL || 'https://mycareerbuild.com';
        const { Job, Company } = await Promise.resolve().then(() => __importStar(require('./models')));
        const jobs = await Job.findAll({ attributes: ['slug', 'id', 'updatedAt'] });
        const companies = await Company.findAll({ attributes: ['slug', 'id', 'updatedAt'] });
        const urls = [];
        // Static core pages
        const staticPages = [
            '',
            'jobs',
            'about',
            'contact',
        ];
        staticPages.forEach(p => urls.push(`${baseUrl}/${p}`.replace(/\/$\//, '/')));
        // Job detail pages using slug or fallback to id
        for (const job of jobs) {
            const slug = job.slug || job.id;
            urls.push(`${baseUrl}/jobs/${slug}`);
        }
        // Company pages using slug or fallback to id
        for (const company of companies) {
            const cslug = company.slug || company.id;
            urls.push(`${baseUrl}/companies/${cslug}`);
        }
        const now = new Date().toISOString().split('T')[0];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
            urls.map(u => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${u.includes('/jobs/') ? '0.8' : '0.9'}</priority>\n  </url>`).join('\n') +
            `\n</urlset>`;
        res.header('Content-Type', 'application/xml').send(xml);
    }
    catch (e) {
        res.status(500).send('');
    }
});
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map