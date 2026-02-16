import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { uploadReceipt, deleteReceipt, downloadReceipt } from '../services/storage';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

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
 *                 enum: [INCOME, EXPENSE]
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

    // Calculate balance update
    const updateAmount = (type === 'INCOME') ? amount : -amount;

    // Use transaction to ensure atomicity
    const [expense] = await prisma.$transaction([
      prisma.expense.create({
        data: {
          description,
          amount,
          type: (type || 'EXPENSE').toUpperCase(),
          transactionDate: new Date(date),
          userId,
          categoryId,
          accountId,
        },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: {
          currentBalance: {
            increment: updateAmount,
          },
        },
      }),
    ]);

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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-01-01"
 *         required: true
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-01-30"
 *         required: true
 *         description: Data final (YYYY-MM-DD)
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *           example: "c4a3c440-829d-4db9-afae-6891ef8fbd08"
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
 *       400:
 *         description: Parâmetros de data obrigatórios
 *       500:
 *         description: Erro no servidor
 */
router.get('/', async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const { accountId, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Data inicial e final são obrigatórias' });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Datas inválidas' });
    }

    if (start > end) {
      return res.status(400).json({ error: 'Data inicial não pode ser maior que a final' });
    }

    // Adjust end date to cover the entire day
    end.setHours(23, 59, 59, 999);

    const whereClause: any = {
      userId,
      transactionDate: {
        gte: start,
        lte: end,
      },
    };

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
      orderBy: {
        transactionDate: 'desc',
      },
    });
    res.json(expenses);
  } catch (error) {
    console.error(error);
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
    const { description, amount, date, categoryId, accountId } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    const oldExpense = await prisma.expense.findUnique({ where: { id } });
    if (!oldExpense) return res.status(404).json({ error: 'Despesa não encontrada' });
    if (oldExpense.userId !== userId) return res.status(403).json({ error: 'Acesso negado' });

    const newAmount = amount !== undefined ? Number(amount) : oldExpense.amount;
    const newAccountId = accountId || oldExpense.accountId;
    const newDate = date ? new Date(date) : oldExpense.transactionDate;
    const newCategoryId = categoryId || oldExpense.categoryId;
    const newDescription = description !== undefined ? description : oldExpense.description;

    // Verify ownership if account or category changed
    if (accountId && accountId !== oldExpense.accountId) {
      const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
      if (!account) return res.status(400).json({ error: 'Conta inválida ou sem permissão' });
    }

    if (categoryId && categoryId !== oldExpense.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
      if (!category) return res.status(400).json({ error: 'Categoria inválida ou sem permissão' });
    }

    const operations = [];

    // Calculate balance adjustments
    // Revert impact of old expense
    // If it was EXPENSE, we subtracted it, so add it back (increment positive)
    // If it was INCOME, we added it, so subtract it (increment negative)
    const revertVal = (oldExpense.type === 'EXPENSE' ? oldExpense.amount : -oldExpense.amount);

    // Apply impact of new expense (Type cannot be changed in this endpoint)
    // If it is EXPENSE, subtract new amount (increment negative)
    // If it is INCOME, add new amount (increment positive)
    const newVal = (oldExpense.type === 'INCOME' ? newAmount : -newAmount);

    if (oldExpense.accountId === newAccountId) {
      // Same account: apply net change
      const netChange = revertVal + newVal;
      if (netChange !== 0) {
        operations.push(prisma.account.update({
          where: { id: newAccountId },
          data: { currentBalance: { increment: netChange } }
        }));
      }
    } else {
      // Different accounts: revert old, apply new
      operations.push(prisma.account.update({
        where: { id: oldExpense.accountId },
        data: { currentBalance: { increment: revertVal } }
      }));
      operations.push(prisma.account.update({
        where: { id: newAccountId },
        data: { currentBalance: { increment: newVal } }
      }));
    }

    // Update the expense record
    operations.push(prisma.expense.update({
      where: { id },
      data: {
        description: newDescription,
        amount: newAmount,
        transactionDate: newDate,
        categoryId: newCategoryId,
        accountId: newAccountId,
      },
    }));

    // Execute transaction
    const results = await prisma.$transaction(operations);
    
    // The expense update is the last operation
    res.json(results[results.length - 1]);
  } catch (error) {
    console.error(error);
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
    // @ts-ignore
    const userId = req.user.id;
    
    // Check if expense exists and belongs to user
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    if (expense.userId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Attempt to delete receipt from storage
    await deleteReceipt(userId, id);

    // Calculate balance reversion
    // If EXPENSE, add back amount (increment positive)
    // If INCOME, subtract amount (increment negative)
    const revertVal = (expense.type === 'EXPENSE' ? expense.amount : -expense.amount);

    await prisma.$transaction([
      prisma.account.update({
        where: { id: expense.accountId },
        data: { currentBalance: { increment: revertVal } },
      }),
      prisma.expense.delete({
        where: { id },
      }),
    ]);
    
    res.json({ message: 'Despesa deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao deletar despesa' });
  }
});

/**
 * @swagger
 * /expenses/{id}/receipt:
 *   post:
 *     summary: Associa um comprovante a uma despesa existente
 *     description: Envia um arquivo para ser salvo como comprovante. Se já existir, substitui o anterior. O arquivo é salvo em `/{userId}/{expenseId}`.
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               receipt:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo do comprovante
 *     responses:
 *       200:
 *         description: Comprovante associado com sucesso
 *       400:
 *         description: Arquivo não fornecido ou erro na requisição
 *       404:
 *         description: Despesa não encontrada
 *       500:
 *         description: Erro no servidor
 */
router.post('/:id/receipt', upload.single('receipt'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    // @ts-ignore
    const userId = req.user.id;

    if (!file) {
      return res.status(400).json({ error: 'Arquivo não fornecido' });
    }

    const expense = await prisma.expense.findUnique({
      where: { id: String(id) },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    if (expense.userId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    try {
      await uploadReceipt(file, userId, String(id));
    } catch {
      return res.status(500).json({ error: 'Falha ao fazer upload do arquivo' });
    }

    res.json({ message: 'Comprovante associado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao associar comprovante' });
  }
});

/**
 * @swagger
 * /expenses/{id}/receipt:
 *   delete:
 *     summary: Desassocia/Remove o comprovante de uma despesa
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
 *         description: Comprovante removido com sucesso
 *       404:
 *         description: Despesa não encontrada
 *       500:
 *         description: Erro no servidor
 */
router.delete('/:id/receipt', async (req, res) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    if (expense.userId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await deleteReceipt(userId, id);

    res.json({ message: 'Comprovante removido com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao remover comprovante' });
  }
});

/**
 * @swagger
 * /expenses/{id}/receipt:
 *   get:
 *     summary: Baixa o comprovante da despesa
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
 *         description: Arquivo do comprovante
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Comprovante ou despesa não encontrada
 *       500:
 *         description: Erro no servidor
 */
router.get('/:id/receipt', async (req, res) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id: String(id) },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    if (expense.userId !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { stream, contentType } = await downloadReceipt(userId, String(id));

    res.setHeader('Content-Type', contentType);
    // Optional: Set Content-Disposition to attachment if you want to force download
    // res.setHeader('Content-Disposition', `attachment; filename="receipt-${id}"`);
    
    stream.pipe(res);
  } catch (error: any) {
    console.error(error);
    if (error.name === 'NoSuchKey' || error.message?.includes('File not found')) {
      return res.status(404).json({ error: 'Comprovante não encontrado' });
    }
    res.status(500).json({ error: 'Falha ao baixar comprovante' });
  }
});

export default router;
