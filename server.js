import express from 'express';
import cors from 'cors';
import produtosRouter from './routes/produtos.js';
import auth from './middleware/auth.js';
import logger from './middleware/logger.js';
import { PORT } from './config.js';
import swaggerDocs from "./swagger.js";

const app = express();


app.use(cors());

app.use(express.json()); 
app.use(logger);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/produtos', auth, produtosRouter);
app.use('/', express.static('public'));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erro interno' });
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
  swaggerDocs(app); 
  console.log(`Swagger docs em http://localhost:${PORT}/api-docs`);
});
