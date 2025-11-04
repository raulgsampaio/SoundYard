// public/js/playlists.js
import { supa, ensureAuthOrRedirect, getAccessToken } from './supabaseClient.js';

const $ = (sel) => document.querySelector(sel);

const playlistsDiv = $('#playlists');
const createForm   = $('#createForm');
const nameInput    = $('#playlistName');
const btnLogout    = $('#btnLogout');

let token = null;

function setLoading(el, loading) {
  if (!el) return;
  el.disabled = !!loading;
  el.textContent = loading ? 'Aguarde...' : el.getAttribute('data-label') || el.textContent;
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  const maybeJson = (() => { try { return JSON.parse(text); } catch { return text; } })();

  if (!res.ok) {
    console.error('API error', res.status, maybeJson);
    throw new Error(typeof maybeJson === 'string' ? maybeJson : (maybeJson?.error || 'Erro na API'));
  }
  return text ? (typeof maybeJson === 'string' ? maybeJson : maybeJson) : null;
}

function render(playlists) {
  playlistsDiv.innerHTML = '';
  if (!playlists?.length) {
    playlistsDiv.innerHTML = '<p>Nenhuma playlist criada ainda.</p>';
    return;
  }
  for (const p of playlists) {
    const el = document.createElement('div');
    el.className = 'playlist';
    el.innerHTML = `
      <h3>${p.name}</h3>
      <p><small>${p.is_public ? '🌍 Pública' : '🔒 Privada'} — ${new Date(p.updated_at).toLocaleString()}</small></p>
      <div>
        <button class="export"  data-id="${p.id}" data-label="Exportar JSON">Exportar JSON</button>
        <button class="primary publish" data-id="${p.id}" data-pub="${p.is_public ? 0 : 1}" data-label="${p.is_public ? 'Tornar Privada' : 'Publicar'}">
          ${p.is_public ? 'Tornar Privada' : 'Publicar'}
        </button>
        <button class="danger delete" data-id="${p.id}" data-label="Excluir">Excluir</button>
      </div>
    `;
    playlistsDiv.appendChild(el);
  }
}

async function loadPlaylists() {
  try {
    const data = await api('/playlists/me/playlists');
    render(data);
  } catch (e) {
    console.error('Falha ao carregar playlists:', e);
    alert('Falha ao carregar playlists: ' + e.message);
  }
}

function bindEvents() {
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const btn = createForm.querySelector('button[type="submit"]');
        setLoading(btn, true);
        const name = nameInput.value.trim();
        if (!name) return alert('Digite um nome');
        await api('/playlists/me/playlists', {
          method: 'POST',
          body: JSON.stringify({ name })
        });
        nameInput.value = '';
        await loadPlaylists();
      } catch (err) {
        console.error('Erro ao criar playlist:', err);
        alert('Erro ao criar playlist: ' + err.message);
      } finally {
        const btn = createForm.querySelector('button[type="submit"]');
        setLoading(btn, false);
      }
    });
  }

  if (playlistsDiv) {
    playlistsDiv.addEventListener('click', async (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const id = t.dataset.id;
      if (!id) return;

      if (t.classList.contains('delete')) {
        if (!confirm('Excluir esta playlist?')) return;
        try {
          setLoading(t, true);
          await api(`/playlists/me/playlists/${id}`, { method: 'DELETE' });
          await loadPlaylists();
        } catch (err) {
          console.error('Erro ao excluir:', err);
          alert('Erro ao excluir: ' + err.message);
        } finally {
          setLoading(t, false);
        }
      }

      if (t.classList.contains('publish')) {
        try {
          setLoading(t, true);
          const isPublic = t.dataset.pub === '1';
          await api(`/playlists/me/playlists/${id}/publish`, {
            method: 'POST',
            body: JSON.stringify({ is_public: isPublic })
          });
          await loadPlaylists();
        } catch (err) {
          console.error('Erro ao publicar/privatizar:', err);
          alert('Erro ao publicar/privatizar: ' + err.message);
        } finally {
          setLoading(t, false);
        }
      }

      if (t.classList.contains('export')) {
        try {
          setLoading(t, true);
          const res = await fetch(`/playlists/${id}/export`);
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || 'Falha ao exportar playlist');
          }
          const blob = await res.blob();
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `playlist-${id}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
        } catch (err) {
          console.error('Erro ao exportar:', err);
          alert('Erro ao exportar: ' + err.message);
        } finally {
          setLoading(t, false);
        }
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        setLoading(btnLogout, true);
        await supa.auth.signOut();
        window.location.href = '/';
      } catch (err) {
        console.error('Erro ao sair:', err);
        alert('Erro ao sair: ' + err.message);
      } finally {
        setLoading(btnLogout, false);
      }
    });
  }
}

async function init() {
  try {
    const session = await ensureAuthOrRedirect(); // redireciona se não logado
    if (!session) return;

    token = await getAccessToken();
    if (!token) {
      console.warn('Sem token de acesso — tentando renovar sessão');
      const { data: { session: sess2 } } = await supa.auth.getSession();
      token = sess2?.access_token || null;
    }

    bindEvents();
    await loadPlaylists();
  } catch (e) {
    console.error('Falha na inicialização da tela:', e);
    alert('Falha ao inicializar: ' + e.message);
  }
}

// Garante que o DOM está pronto antes de tudo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
