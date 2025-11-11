import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'mycareerbuild REST API',
      version: '1.0.0',
      description: 'Complete Job Portal API with Authentication, Applications, Saved Jobs, Notifications, Profile Management, Search, Companies, and Analytics',
    },
    servers: [
      { url: 'http://localhost:4000' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  // Parse JSDoc in route files for endpoint schemas
  apis: ['src/routes/*.ts', 'src/docs/**/*.ts'],
});
