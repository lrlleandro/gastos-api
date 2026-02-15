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
    const { name } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    const account = await prisma.account.create({
      data: {
        name,
        userId,
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

export default router;
