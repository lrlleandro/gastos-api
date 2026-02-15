import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gastos API',
      version: '1.0.0',
      description: 'API para gerenciamento de usuários, categorias e despesas',
    },
    servers: [
      {
        url: 'https://gastos-api-production-986e.up.railway.app',
        description: 'Servidor de Produção',
      },
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        Expense: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            description: { type: 'string' },
            amount: { type: 'number' },
            date: { type: 'string', format: 'date-time' },
            userId: { type: 'string' },
            categoryId: { type: 'string' },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  apis: ['./api/routes/*.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export default specs;
