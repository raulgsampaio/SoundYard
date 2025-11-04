// src/routes/playlists.js
import { Router } from 'express';
import { supa } from '../lib/supa.js';
import supaAuth from '../middleware/supaAuth.js';

const r = Router();

/**
 * @openapi
 * tags:
 *   - name: Playlists
 *     description: Gerenciamento e descoberta de playlists
 */

/**
 * @openapi
 * /playlists/public:
 *   get:
 *     tags: [Playlists]
 *     summary: Lista playlists públicas
 *     description: Retorna as playlists publicadas por qualquer usuário (não requer login).
 *     responses:
 *       200:
 *         description: Lista de playlists públicas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Playlist'
 *       500:
 *         description: Erro inesperado
 */
r.get('/public', async (_req, res, next) => {
  try {
    const { data, error } = await supa
      .from('playlists')
      .select('id, name, is_public, created_at, updated_at')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /playlists/{id}/export:
 *   get:
 *     tags: [Playlists]
 *     summary: Exporta uma playlist pública como JSON (download)
 *     description: Exporta o conteúdo de uma playlist pública como JSON. Não requer login.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: JSON exportado da playlist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 name: { type: string }
 *                 is_public: { type: boolean }
 *                 tracks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       title: { type: string }
 *                       duration_seconds: { type: integer }
 *       403:
 *         description: Playlist não é pública
 *       404:
 *         description: Playlist não encontrada
 *       500:
 *         description: Erro inesperado
 */
r.get('/:id/export', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: pl, error: e1 } = await supa
      .from('playlists')
      .select('id, name, is_public')
      .eq('id', id)
      .single();

    if (e1) {
      if (e1.code === 'PGRST116') return res.status(404).json({ error: 'Playlist não encontrada' });
      throw e1;
    }
    if (!pl.is_public) return res.status(403).json({ error: 'Playlist não é pública' });

    const { data: rows, error: e2 } = await supa
      .from('playlist_tracks')
      .select('track_id, position, tracks:tracks!inner(id, title, duration_seconds, album_id)')
      .eq('playlist_id', id)
      .order('position', { ascending: true });

    if (e2) throw e2;

    const payload = {
      id: pl.id,
      name: pl.name,
      is_public: true,
      tracks: (rows || []).map(t => ({
        id: t.tracks.id,
        title: t.tracks.title,
        duration_seconds: t.tracks.duration_seconds
      }))
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="playlist-${pl.id}.json"`);
    res.status(200).json(payload);
  } catch (e) {
    next(e);
  }
});

/** ------- Rotas autenticadas (dono) ------- */
r.use('/me', supaAuth);

/**
 * @openapi
 * /playlists/me/playlists:
 *   get:
 *     tags: [Playlists]
 *     summary: Lista playlists do usuário autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Minhas playlists
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Playlist' }
 *       401:
 *         description: Token ausente/expirado
 *       500:
 *         description: Erro inesperado
 */
r.get('/me/playlists', async (req, res, next) => {
  try {
    const { data, error } = await supa
      .from('playlists')
      .select('*')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;

    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /playlists/me/playlists:
 *   post:
 *     tags: [Playlists]
 *     summary: Cria uma playlist
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PlaylistCreate' }
 *     responses:
 *       201:
 *         description: Playlist criada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Playlist' }
 *       401:
 *         description: Token ausente/expirado
 *       422:
 *         description: Dados inválidos
 *       500:
 *         description: Erro inesperado
 */
r.post('/me/playlists', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(422).json({ error: 'Campo "name" é obrigatório' });
    }

    const { data, error } = await supa
      .from('playlists')
      .insert({ name, user_id: req.user.id })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /playlists/me/playlists/{id}:
 *   patch:
 *     tags: [Playlists]
 *     summary: Atualiza uma playlist (nome e/ou is_public)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PlaylistPatch' }
 *     responses:
 *       200:
 *         description: Playlist atualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Playlist' }
 *       401:
 *         description: Token ausente/expirado
 *       404:
 *         description: Playlist não encontrada
 *       500:
 *         description: Erro inesperado
 */
r.patch('/me/playlists/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const patch = {};
    if (typeof req.body.name === 'string') patch.name = req.body.name;
    if (typeof req.body.is_public === 'boolean') patch.is_public = req.body.is_public;
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supa
      .from('playlists')
      .update(patch)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Playlist não encontrada' });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /playlists/me/playlists/{id}:
 *   delete:
 *     tags: [Playlists]
 *     summary: Remove uma playlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deletada
 *       401:
 *         description: Token ausente/expirado
 *       404:
 *         description: Playlist não encontrada
 *       500:
 *         description: Erro inesperado
 */
r.delete('/me/playlists/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supa
      .from('playlists')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Playlist não encontrada' });

    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /playlists/me/playlists/{id}/tracks:
 *   post:
 *     tags: [Playlists]
 *     summary: Adiciona faixa à playlist do usuário
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PlaylistTrackCreate' }
 *     responses:
 *       201:
 *         description: Faixa adicionada
 *       401:
 *         description: Token ausente/expirado
 *       409:
 *         description: Faixa já presente na playlist
 *       500:
 *         description: Erro inesperado
 */
r.post('/me/playlists/:id/tracks', async (req, res, next) => {
  try {
    const { id } = req.params; // playlist_id
    const { track_id, position } = req.body;

    if (!track_id) return res.status(422).json({ error: 'track_id é obrigatório' });

    const ins = { playlist_id: id, track_id };
    if (Number.isInteger(position)) ins.position = position;

    const { data, error } = await supa
      .from('playlist_tracks')
      .insert(ins)
      .select()
      .single();

    if (error) {
      // conflito de PK (já existe)
      if (error.code === '23505') return res.status(409).json({ error: 'Faixa já adicionada' });
      throw error;
    }

    res.status(201).json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /playlists/me/playlists/{id}/tracks/{track_id}:
 *   delete:
 *     tags: [Playlists]
 *     summary: Remove faixa da playlist do usuário
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: track_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Removida
 *       401:
 *         description: Token ausente/expirado
 *       404:
 *         description: Não encontrada
 *       500:
 *         description: Erro inesperado
 */
r.delete('/me/playlists/:id/tracks/:track_id', async (req, res, next) => {
  try {
    const { id, track_id } = req.params;

    const { data, error } = await supa
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', id)
      .eq('track_id', track_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Registro não encontrado' });

    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /playlists/me/playlists/{id}/publish:
 *   post:
 *     tags: [Playlists]
 *     summary: Publica/privatiza uma playlist do usuário
 *     description: Define `is_public` para `true` (publica) ou `false` (privatiza).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_public: { type: boolean, default: true }
 *     responses:
 *       200:
 *         description: Playlist atualizada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Playlist' }
 *       401:
 *         description: Token ausente/expirado
 *       404:
 *         description: Playlist não encontrada
 *       500:
 *         description: Erro inesperado
 */
r.post('/me/playlists/:id/publish', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_public = true } = req.body || {};

    const { data, error } = await supa
      .from('playlists')
      .update({ is_public, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Playlist não encontrada' });

    res.json(data);
  } catch (e) {
    next(e);
  }
});

export default r;
