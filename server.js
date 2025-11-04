import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { swaggerServe, swaggerSetup } from './src/docs/swagger.js';
import catalog from './src/routes/catalog.js';
import playlists from './src/routes/playlists.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/catalog', catalog);
app.use('/playlists', playlists);

const PORT = process.env.API_PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API up on http://localhost:${PORT}`);
});

app.use('/api-docs', swaggerServe, swaggerSetup);