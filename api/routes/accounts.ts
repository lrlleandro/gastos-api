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
 * /accounts/transfer:
 *   post:
 *     summary: Realiza transferência entre contas
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
 *               - sourceAccountId
 *               - destinationAccountId
 *               - amount
 *               - date
 *             properties:
 *               sourceAccountId:
 *                 type: string
 *                 description: ID da conta de origem
 *               destinationAccountId:
 *                 type: string
 *                 description: ID da conta de destino
 *               amount:
 *                 type: number
 *                 description: Valor da transferência
 *               date:
 *                 type: string
 *                 format: date-time
 *                 description: Data da transferência
 *               description:
 *                 type: string
 *                 description: Descrição opcional (padrão: "Transferência")
 *     responses:
 *       200:
 *         description: Transferência realizada com sucesso
 *       400:
 *         description: Erro na requisição (contas inválidas, saldo insuficiente, etc)
 *       500:
 *         description: Erro no servidor
 */
router.post('/transfer', async (req, res) => {
  try {
    const { sourceAccountId, destinationAccountId, amount, date, description } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    if (sourceAccountId === destinationAccountId) {
      return res.status(400).json({ error: 'Conta de origem e destino devem ser diferentes' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    // Verificar se as contas pertencem ao usuário
    const sourceAccount = await prisma.account.findFirst({
      where: { id: sourceAccountId, userId },
    });

    const destinationAccount = await prisma.account.findFirst({
      where: { id: destinationAccountId, userId },
    });

    if (!sourceAccount || !destinationAccount) {
      return res.status(400).json({ error: 'Conta de origem ou destino inválida' });
    }

    // Encontrar ou criar categoria de Transferência
    let transferCategory = await prisma.category.findFirst({
      where: { name: 'Transferência', userId },
    });

    if (!transferCategory) {
      transferCategory = await prisma.category.create({
        data: { name: 'Transferência', userId },
      });
    }

    // Realizar a transação atômica (criar despesa na origem e receita no destino)
    await prisma.$transaction([
      // Saída da conta de origem
      prisma.expense.create({
        data: {
          description: description || `Transferência para ${destinationAccount.name}`,
          amount: amount,
          type: 'TRANSFER_OUT',
          transactionDate: new Date(date),
          userId,
          categoryId: transferCategory.id,
          accountId: sourceAccountId,
        },
      }),
      // Atualizar saldo da conta de origem (subtrair)
      prisma.account.update({
        where: { id: sourceAccountId },
        data: {
          currentBalance: {
            decrement: amount,
          },
        },
      }),
      // Entrada na conta de destino
      prisma.expense.create({
        data: {
          description: description || `Transferência de ${sourceAccount.name}`,
          amount: amount,
          type: 'TRANSFER_IN',
          transactionDate: new Date(date),
          userId,
          categoryId: transferCategory.id,
          accountId: destinationAccountId,
        },
      }),
      // Atualizar saldo da conta de destino (somar)
      prisma.account.update({
        where: { id: destinationAccountId },
        data: {
          currentBalance: {
            increment: amount,
          },
        },
      }),
    ]);

    res.json({ message: 'Transferência realizada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao realizar transferência' });
  }
});

/**
 * @swagger
 * /accounts/balance:
 *   get:
 *     summary: Retorna o saldo de todas as contas
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saldo das contas
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
 *                   balance:
 *                     type: number
 *       500:
 *         description: Erro no servidor
 */
router.get('/balance', async (req, res) => {
  try {
    // @ts-ignore
    const userId = req.user.id;

    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        expenses: true,
      },
    });

    const balances = accounts.map((account) => {
      const balance = account.expenses.reduce((acc, expense) => {
        if (expense.type === 'INCOME' || expense.type === 'TRANSFER_IN') {
          return acc + expense.amount;
        } else {
          return acc - expense.amount;
        }
      }, 0);

      return {
        accountId: account.id,
        accountName: account.name,
        balance,
      };
    });

    res.json(balances);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar saldo das contas' });
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
