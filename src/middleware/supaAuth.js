// src/middleware/supaAuth.js
import { supa } from '../lib/supa.js';

export default async function supaAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing Bearer token' });

    const { data: { user }, error } = await supa.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

    req.user = user; // { id, email, ... }
    next();
  } catch (e) {
    next(e);
  }
}
