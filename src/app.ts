import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import { sequelize } from './models';

const app = express();

// Configure CORS to allow all origins
app.use(cors({
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

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resources
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files from uploads directory (project root /uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/openapi.json', (_req, res) => res.json(swaggerSpec));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

// Dynamic sitemap.xml at root (uses slugs)
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const baseUrl = process.env.SITE_BASE_URL || 'https://mycareerbuild.com';
    const { Job, Company } = await import('./models');
    const jobs = await Job.findAll({ attributes: ['slug', 'id', 'updatedAt'] });
    const companies = await Company.findAll({ attributes: ['slug', 'id', 'updatedAt'] });
    const urls: string[] = [];

    // Static core pages
    const staticPages = [
      '',
      'jobs',
      'about',
      'contact',
    ];
    staticPages.forEach(p => urls.push(`${baseUrl}/${p}`.replace(/\/$\//, '/')));

    // Job detail pages using slug or fallback to id
    for (const job of jobs as any[]) {
      const slug = job.slug || job.id;
      urls.push(`${baseUrl}/jobs/${slug}`);
    }

    // Company pages using slug or fallback to id
    for (const company of companies as any[]) {
      const cslug = company.slug || company.id;
      urls.push(`${baseUrl}/companies/${cslug}`);
    }

    const now = new Date().toISOString().split('T')[0];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map(u => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${u.includes('/jobs/') ? '0.8' : '0.9'}</priority>\n  </url>`).join('\n') +
      `\n</urlset>`;

    res.header('Content-Type', 'application/xml').send(xml);
  } catch (e) {
    res.status(500).send('');
  }
});

app.use(errorHandler);

export default app;
