import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import catalog from './src/route/catalog.js'; // << use o catálogo

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

// registre o catálogo
app.use('/catalog', catalog);

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API up on http://localhost:${PORT}`);
});
