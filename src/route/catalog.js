// src/routes/catalog.js
import { Router } from 'express';
import { supa } from '../lib/supa.js';

const r = Router();

r.get('/artists', async (_req, res, next) => {
  try {
    const { data, error } = await supa.from('artists').select('*').order('name');
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

r.get('/albums', async (req, res, next) => {
  try {
    const { artist_id } = req.query;
    let q = supa.from('albums').select('*').order('title');
    if (artist_id) q = q.eq('artist_id', artist_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

r.get('/tracks', async (req, res, next) => {
  try {
    const { album_id } = req.query;
    let q = supa.from('tracks').select('*').order('title');
    if (album_id) q = q.eq('album_id', album_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

export default r; // << export default
