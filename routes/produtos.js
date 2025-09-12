const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../utils/db');

/**
 * @swagger
 * components:
 * schemas:
 * Produto:
 * type: object
 * required:
 * - name
 * - price
 * - stock
 * properties:
 * id:
 * type: string
 * format: uuid
 * description: O ID gerado automaticamente para o produto
 * name:
 * type: string
 * description: O nome do produto
 * price:
 * type: number
 * format: float
 * description: O preço do produto
 * stock:
 * type: integer
 * description: A quantidade em estoque do produto
 * example:
 * id: d5fE_asz
 * name: Laptop
 * price: 4500.99
 * stock: 50
 */

/**
 * @swagger
 * tags:
 * name: Produtos
 * description: API para gerenciamento de produtos
 */

// GET /produtos
/**
 * @swagger
 * /produtos:
 * get:
 * summary: Retorna a lista de todos os produtos
 * tags: [Produtos]
 * responses:
 * 200:
 * description: A lista de produtos
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * $ref: '#/components/schemas/Produto'
 * 500:
 * description: Erro no servidor
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM produtos');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /produtos/:id
/**
 * @swagger
 * /produtos/{id}:
 * get:
 * summary: Busca um produto pelo ID
 * tags: [Produtos]
 * parameters:
 * - in: path
 * name: id
 * schema:
 * type: string
 * required: true
 * description: O ID do produto
 * responses:
 * 200:
 * description: O produto encontrado
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Produto'
 * 404:
 * description: Produto não encontrado
 * 500:
 * description: Erro no servidor
 */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /produtos
/**
 * @swagger
 * /produtos:
 * post:
 * summary: Cria um novo produto
 * tags: [Produtos]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Produto'
 * example:
 * name: "Teclado Mecânico"
 * price: 350.00
 * stock: 120
 * responses:
 * 201:
 * description: Produto criado com sucesso
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Produto'
 * 400:
 * description: Dados inválidos (name, price e stock são obrigatórios)
 * 500:
 * description: Erro no servidor
 */
router.post('/', async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    if (!name || price == null || stock == null) return res.status(400).json({ error: 'name, price e stock são obrigatórios' });

    const id = uuidv4();
    await pool.query('INSERT INTO produtos (id, name, price, stock) VALUES (?, ?, ?, ?)', [id, name, price, stock]);
    res.status(201).json({ id, name, price, stock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /produtos/:id
/**
 * @swagger
 * /produtos/{id}:
 * put:
 * summary: Atualiza um produto pelo ID
 * tags: [Produtos]
 * parameters:
 * - in: path
 * name: id
 * schema:
 * type: string
 * required: true
 * description: O ID do produto
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Produto'
 * example:
 * name: "Teclado Mecânico RGB"
 * price: 399.90
 * stock: 100
 * responses:
 * 200:
 * description: Produto atualizado com sucesso
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Produto'
 * 404:
 * description: Produto não encontrado
 * 500:
 * description: Erro no servidor
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    const [result] = await pool.query('UPDATE produtos SET name = ?, price = ?, stock = ? WHERE id = ?', [name, price, stock, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json({ id: req.params.id, name, price, stock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /produtos/:id
/**
 * @swagger
 * /produtos/{id}:
 * delete:
 * summary: Remove um produto pelo ID
 * tags: [Produtos]
 * parameters:
 * - in: path
 * name: id
 * schema:
 * type: string
 * required: true
 * description: O ID do produto
 * responses:
 * 200:
 * description: Produto removido com sucesso
 * 404:
 * description: Produto não encontrado
 * 500:
 * description: Erro no servidor
 */
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM produtos WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json({ removed: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;