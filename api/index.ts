import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpecs from './swagger';
import authRouter from './routes/auth';
import { authenticateToken } from './middleware/auth';
import usersRouter from './routes/users';
import categoriesRouter from './routes/categories';
import expensesRouter from './routes/expenses';
import accountsRouter from './routes/accounts';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*', // Permite qualquer origem (para teste)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use('/auth', authRouter);
app.use('/users', authenticateToken, usersRouter);
app.use('/categories', authenticateToken, categoriesRouter);
app.use('/expenses', authenticateToken, expensesRouter);
app.use('/accounts', authenticateToken, accountsRouter);

app.get('/', (req, res) => {
  res.send('Gastos API is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
