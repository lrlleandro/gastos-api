import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: API para gerenciamento de contas
 */

/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Cria uma nova conta
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               initialBalance:
 *                 type: number
 *                 description: Saldo inicial da conta
 *     responses:
 *       200:
 *         description: A conta criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       500:
 *         description: Erro no servidor
 */
router.post('/', async (req, res) => {
  try {
    const { name, initialBalance } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    const account = await prisma.account.create({
      data: {
        name,
        userId,
        initialBalance: initialBalance || 0,
        currentBalance: initialBalance || 0,
      },
    });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao criar conta' });
  }
});

/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Retorna a lista de todas as contas do usuário
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A lista de contas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 *       500:
 *         description: Erro no servidor
 */
router.get('/', async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user.id;
    const accounts = await prisma.account.findMany({
      where: { userId },
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar contas' });
  }
});

/**
 * @swagger
 * /accounts/{id}:
 *   put:
 *     summary: Atualiza uma conta existente
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da conta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: A conta atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       500:
 *         description: Erro no servidor
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    // Verify ownership
    const existingAccount = await prisma.account.findFirst({
      where: { id, userId },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const account = await prisma.account.update({
      where: { id },
      data: { name },
    });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao atualizar conta' });
  }
});

/**
 * @swagger
 * /accounts/{id}:
 *   delete:
 *     summary: Deleta uma conta
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da conta
 *     responses:
 *       200:
 *         description: Conta deletada com sucesso
 *       500:
 *         description: Erro no servidor
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const userId = req.user.id;

    // Verify ownership
    const existingAccount = await prisma.account.findFirst({
      where: { id, userId },
    });

    if (!existingAccount) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    await prisma.account.delete({
      where: { id },
    });
    res.json({ message: 'Conta deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao deletar conta' });
  }
});

/**
 * @swagger
 * /accounts/balances:
 *   post:
 *     summary: Calcula o saldo de múltiplas contas em um período
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountIds
 *               - startDate
 *               - endDate
 *             properties:
 *               accountIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: A lista de contas com saldos calculados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   accountId:
 *                     type: string
 *                   accountName:
 *                     type: string
 *                   openingBalance:
 *                     type: number
 *                     description: Saldo no início da data inicial
 *                   closingBalance:
 *                     type: number
 *                     description: Saldo no final da data final
 *                   periodNet:
 *                     type: number
 *                     description: Variação no período
 *       500:
 *         description: Erro no servidor
 */
router.post('/balances', async (req, res) => {
  try {
    const { accountIds, startDate, endDate } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Data inicial e final são obrigatórias' });
    }

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({ error: 'Lista de contas inválida' });
    }

    // 1. Fetch current balances
    const accounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
        userId,
      },
      select: {
        id: true,
        name: true,
        currentBalance: true,
      },
    });

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 2. Aggregate future transactions (after endDate)
    const futureTransactions = await prisma.expense.groupBy({
      by: ['accountId', 'type'],
      where: {
        accountId: { in: accountIds },
        userId,
        transactionDate: { gt: end },
      },
      _sum: {
        amount: true,
      },
    });

    // 3. Aggregate period transactions (startDate to endDate)
    const periodTransactions = await prisma.expense.groupBy({
      by: ['accountId', 'type'],
      where: {
        accountId: { in: accountIds },
        userId,
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Helper to get net amount from aggregation
    const getNetChange = (aggs: any[], accId: string) => {
      let net = 0;
      const accountAggs = aggs.filter((a) => a.accountId === accId);
      for (const agg of accountAggs) {
        const amount = agg._sum.amount || 0;
        if (agg.type === 'INCOME' || agg.type === 'TRANSFER_IN') {
          net += amount;
        } else {
          net -= amount;
        }
      }
      return net;
    };

    const results = accounts.map((account) => {
      const futureNet = getNetChange(futureTransactions, account.id);
      const periodNet = getNetChange(periodTransactions, account.id);

      // closingBalance = currentBalance - futureNet
      const closingBalance = account.currentBalance - futureNet;

      // openingBalance = closingBalance - periodNet
      const openingBalance = closingBalance - periodNet;

      return {
        accountId: account.id,
        accountName: account.name,
        openingBalance,
        closingBalance,
        periodNet,
      };
    });

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao calcular saldos' });
  }
});

/**
 * @swagger
 * /accounts/balance/{id}:
 *   get:
 *     summary: Retorna o saldo de uma conta em um determinado período
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da conta
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Data inicial (AAAA-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Data final (AAAA-MM-DD)
 *     responses:
 *       200:
 *         description: Saldo da conta no período
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accountId:
 *                   type: string
 *                 accountName:
 *                   type: string
 *                 balance:
 *                   type: number
 *                 period:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                     end:
 *                       type: string
 *       404:
 *         description: Conta não encontrada
 *       500:
 *         description: Erro no servidor
 */
router.get('/balance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    // @ts-ignore
    const userId = req.user.id;

    const account = await prisma.account.findFirst({
      where: { id, userId },
      include: {
        expenses: {
          where: {
            transactionDate: {
              gte: startDate ? new Date(String(startDate)) : undefined,
              lte: endDate ? new Date(String(endDate)) : undefined,
            },
          },
        },
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const balance = account.expenses.reduce((acc, expense) => {
      if (expense.type === 'INCOME' || expense.type === 'TRANSFER_IN') {
        return acc + expense.amount;
      } else {
        return acc - expense.amount;
      }
    }, 0);

    res.json({
      accountId: account.id,
      accountName: account.name,
      balance,
      period: {
        start: startDate || 'Início',
        end: endDate || 'Hoje',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar saldo da conta' });
  }
});

export default router;
