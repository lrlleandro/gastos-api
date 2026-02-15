import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use o serviço de e-mail que preferir (ex: Gmail, Outlook, etc)
  auth: {
    user: process.env.EMAIL_USER, // Seu e-mail
    pass: process.env.EMAIL_PASS, // Sua senha de aplicativo
  },
});

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Autenticação de usuários
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registra um novo usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuário registrado. Verifique seu e-mail para confirmar.
 *       400:
 *         description: Email já existe
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isVerified: false, // Usuário começa não verificado
        accounts: {
          create: {
            name: 'Carteira',
          },
        },
        categories: {
          create: [
            { name: 'Alimentação' },
            { name: 'Transporte' },
            { name: 'Moradia' },
            { name: 'Lazer' },
            { name: 'Saúde' },
            { name: 'Educação' },
            { name: 'Salário' },
            { name: 'Outros' },
          ],
        },
      },
    });

    // Gerar token de verificação
    const verificationToken = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '1d' });

    // Link de confirmação
    // Nota: Em produção, mude para a URL do seu frontend ou endpoint da API
    const confirmationLink = `https://gastos-api-production-986e.up.railway.app/auth/verify?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Confirmação de E-mail - Gastos API',
      html: `
        <h1>Olá, ${name}!</h1>
        <p>Obrigado por se registrar. Por favor, clique no link abaixo para confirmar seu e-mail:</p>
        <a href="${confirmationLink}">Confirmar E-mail</a>
        <p>Este link expira em 24 horas.</p>
      `,
    };

    // Enviar e-mail (assíncrono para não travar a resposta)
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Erro ao enviar e-mail:', error);
      } else {
        console.log('E-mail enviado:', info.response);
      }
    });

    res.json({ message: 'User registered. Please check your email to verify your account.' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register user', details: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     summary: Confirma o e-mail do usuário
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Token de verificação enviado por e-mail
 *     responses:
 *       200:
 *         description: E-mail verificado com sucesso
 *       400:
 *         description: Token inválido ou expirado
 */
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    const user = await prisma.user.findUnique({ where: { email: decoded.email } });

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.json({ message: 'Email already verified' });
    }

    await prisma.user.update({
      where: { email: decoded.email },
      data: { isVerified: true },
    });

    res.send('<h1>E-mail verificado com sucesso! Agora você pode fazer login.</h1>');
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login de usuário
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 name:
 *                   type: string
 *       400:
 *         description: Credenciais inválidas ou e-mail não verificado
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Email not verified. Please check your email inbox.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({ token, name: user.name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;
