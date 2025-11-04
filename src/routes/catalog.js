// src/routes/catalog.js
import { Router } from 'express';
import { supa } from '../lib/supa.js';

const r = Router();

/**
 * @openapi
 * tags:
 *   - name: Catalog
 *     description: Consulta de artistas, álbuns e faixas (público)
 */

/**
 * @openapi
 * /catalog/artists:
 *   get:
 *     tags: [Catalog]
 *     summary: Lista artistas
 *     description: Retorna todos os artistas disponíveis no catálogo (público).
 *     responses:
 *       200:
 *         description: Lista de artistas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Artist'
 *       500:
 *         description: Erro inesperado
 */
r.get('/artists', async (_req, res, next) => {
  try {
    const { data, error } = await supa
      .from('artists')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /catalog/albums:
 *   get:
 *     tags: [Catalog]
 *     summary: Lista álbuns
 *     description: Retorna álbuns do catálogo. Opcionalmente filtre por `artist_id`.
 *     parameters:
 *       - in: query
 *         name: artist_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtra os álbuns por ID do artista
 *     responses:
 *       200:
 *         description: Lista de álbuns
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Album'
 *       500:
 *         description: Erro inesperado
 */
r.get('/albums', async (req, res, next) => {
  try {
    const { artist_id } = req.query;

    let q = supa
      .from('albums')
      .select('*')
      .order('title', { ascending: true });

    if (artist_id) q = q.eq('artist_id', artist_id);

    const { data, error } = await q;
    if (error) throw error;

    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /catalog/tracks:
 *   get:
 *     tags: [Catalog]
 *     summary: Lista faixas
 *     description: Retorna faixas do catálogo. Opcionalmente filtre por `album_id`.
 *     parameters:
 *       - in: query
 *         name: album_id
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtra as faixas por ID do álbum
 *     responses:
 *       200:
 *         description: Lista de faixas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Track'
 *       500:
 *         description: Erro inesperado
 */
r.get('/tracks', async (req, res, next) => {
  try {
    const { album_id } = req.query;

    let q = supa
      .from('tracks')
      .select('*')
      .order('title', { ascending: true });

    if (album_id) q = q.eq('album_id', album_id);

    const { data, error } = await q;
    if (error) throw error;

    res.json(data);
  } catch (e) {
    next(e);
  }
});

export default r;
