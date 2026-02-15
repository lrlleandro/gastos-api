import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * tags:
 *   name: Expenses
 *   description: API para gerenciamento de despesas
 */

/**
 * @swagger
 * /expenses:
 *   post:
 *     summary: Cria uma nova despesa/receita
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *               - amount
 *               - categoryId
 *               - accountId
 *               - date
 *             properties:
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT]
 *                 default: EXPENSE
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: Data da transação (ISO 8601)
 *               categoryId:
 *                 type: string
 *               accountId:
 *                 type: string
 *     responses:
 *       200:
 *         description: A despesa criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       500:
 *         description: Erro no servidor
 */
router.post('/', async (req, res) => {
  try {
    const { description, amount, type, date, categoryId, accountId } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    // Verify ownership of account and category
    const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!account) return res.status(400).json({ error: 'Conta inválida' });

    const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) return res.status(400).json({ error: 'Categoria inválida' });

    const expense = await prisma.expense.create({
      data: {
        description,
        amount,
        type: (type || 'EXPENSE').toUpperCase(),
        transactionDate: new Date(date),
        userId,
        categoryId,
        accountId,
      },
    });
    res.json(expense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao criar despesa' });
  }
});

/**
 * @swagger
 * /expenses:
 *   get:
 *     summary: Retorna a lista de todas as despesas do usuário
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         required: false
 *         description: ID da conta para filtrar despesas
 *     responses:
 *       200:
 *         description: A lista de despesas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Expense'
 *       500:
 *         description: Erro no servidor
 */
router.get('/', async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const { accountId } = req.query;

    const whereClause: any = { userId };
    if (accountId) {
      whereClause.accountId = String(accountId);
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        user: true,
        category: true,
        account: true,
      },
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar despesas' });
  }
});

/**
 * @swagger
 * /expenses/{id}:
 *   put:
 *     summary: Atualiza uma despesa existente
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da despesa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date-time
 *               userId:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               accountId:
 *                 type: string
 *     responses:
 *       200:
 *         description: A despesa atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       500:
 *         description: Erro no servidor
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, date, userId, categoryId, accountId } = req.body;
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        description,
        amount,
        transactionDate: date ? new Date(date) : undefined,
        userId,
        categoryId,
        accountId,
      },
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao atualizar despesa' });
  }
});

/**
 * @swagger
 * /expenses/{id}:
 *   delete:
 *     summary: Deleta uma despesa
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da despesa
 *     responses:
 *       200:
 *         description: Despesa deletada com sucesso
 *       500:
 *         description: Erro no servidor
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({
      where: { id },
    });
    res.json({ message: 'Despesa deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao deletar despesa' });
  }
});

export default router;
