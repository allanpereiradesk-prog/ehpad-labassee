// Espace admin Allan BIM : codes d'accès, utilisateurs, mises à jour, prérequis (Supabase).
(() => {
  const URL_PROJET = 'https://nhlczhigzzbjgvyjrlks.supabase.co';
  const CLE_PUBLIQUE = 'sb_publishable_rYhaG5Cs1GOosks1NqRYqQ_2WX-1UjC';
  const sb = window.supabase.createClient(URL_PROJET, CLE_PUBLIQUE);
  const $ = (id) => document.getElementById(id);

  const MESSAGES = {
    interdit: 'Action réservée à l\'administrateur.',
    pas_ton_propre_acces: 'Tu ne peux pas bloquer ton propre accès.',
  };
  const texteErreur = (e) => MESSAGES[(e && e.message) || ''] || (e && e.message) || 'Erreur inconnue.';
  const fmt = (s) => s ? new Date(s).toLocaleDateString('fr-FR') : '';
  const label = { libre: 'Libre', utilise: 'Utilisé', revoque: 'Révoqué', expire: 'Expiré' };

  function cell(tr, text, cls) {
    const td = document.createElement('td');
    if (cls) td.className = cls;
    td.textContent = text == null ? '' : text;
    tr.appendChild(td);
    return td;
  }
  function pill(td, text, cls) {
    const s = document.createElement('span');
    s.className = 'pill ' + cls;
    s.textContent = text;
    td.textContent = '';
    td.appendChild(s);
  }
  function btn(td, text, fn) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.textContent = text;
    b.addEventListener('click', fn);
    td.appendChild(b);
  }
  function vide(tbody, cols, text) {
    const tr = document.createElement('tr');
    const td = cell(tr, text, 'empty');
    td.colSpan = cols;
    tbody.appendChild(tr);
  }
  function msg(id, text, type) { $(id).className = 'msg' + (type ? ' ' + type : ''); $(id).textContent = text || ''; }

  // ---------------------------------------------------------------- session
  async function afficher() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { $('v-login').hidden = false; $('v-admin').hidden = true; return; }
    const { data: admin, error } = await sb.rpc('est_admin');
    if (error || !admin) {
      await sb.auth.signOut();
      $('v-login').hidden = false; $('v-admin').hidden = true;
      msg('l-msg', 'Ce compte n\'est pas administrateur.', 'err');
      return;
    }
    $('qui').textContent = session.user.email;
    $('v-login').hidden = true; $('v-admin').hidden = false;
    chargerTout();
  }

  $('f-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    msg('l-msg', '');
    const { error } = await sb.auth.signInWithPassword({ email: $('l-email').value.trim(), password: $('l-pw').value });
    if (error) { msg('l-msg', error.status === 429 ? 'Trop de tentatives, réessaie plus tard.' : 'Mail ou mot de passe incorrect.', 'err'); return; }
    $('l-pw').value = '';
    afficher();
  });
  $('b-logout').addEventListener('click', async () => { await sb.auth.signOut(); afficher(); });

  // ---------------------------------------------------------------- codes
  let profils = {};
  async function chargerProfils() {
    const { data } = await sb.from('profiles').select('id,prenom,nom,email,role,active,disabled,created_at').order('created_at', { ascending: false });
    profils = {};
    (data || []).forEach((p) => { profils[p.id] = p; });
    return data || [];
  }

  async function chargerCodes() {
    const { data, error } = await sb.from('codes').select('*').order('id', { ascending: false });
    const tb = $('t-codes');
    tb.textContent = '';
    if (error) { vide(tb, 7, texteErreur(error)); return; }
    if (!data.length) vide(tb, 7, 'Aucun code pour l\'instant. Clique sur Générer.');
    const now = new Date();
    for (const c of data) {
      const st = c.status === 'libre' && c.expires_at && new Date(c.expires_at) < now ? 'expire' : c.status;
      const tr = document.createElement('tr');
      cell(tr, c.code, 'code');
      cell(tr, c.pour || '—');
      cell(tr, c.role === 'admin' ? 'Admin' : 'Utilisateur');
      cell(tr, fmt(c.created_at), 'date');
      pill(cell(tr, ''), label[st] || st, st);
      const p = c.used_by && profils[c.used_by];
      cell(tr, p ? ((p.prenom + ' ' + p.nom).trim() || p.email) : '—');
      const act = cell(tr, '', 'act');
      if (st === 'libre' || st === 'utilise') {
        btn(act, 'RÉVOQUER', async () => {
          const plus = st === 'utilise' ? ' La personne qui l\'a utilisé perdra aussi son accès.' : '';
          if (!confirm('Révoquer ' + c.code + ' ?' + plus)) return;
          const { error: e } = await sb.rpc('revoquer_code', { p_id: c.id });
          if (e) alert(texteErreur(e));
          chargerTout();
        });
      }
      tb.appendChild(tr);
    }
    $('c-free').textContent = data.filter((c) => c.status === 'libre').length + ' libres';
    $('c-used').textContent = data.filter((c) => c.status === 'utilise').length + ' utilisés';
  }

  $('f-gen').addEventListener('submit', async (e) => {
    e.preventDefault();
    msg('g-msg', '');
    const { data, error } = await sb.rpc('generer_code', {
      p_pour: $('g-pour').value.trim(), p_role: $('g-role').value, p_jours: Number($('g-jours').value),
    });
    if (error) { msg('g-msg', texteErreur(error), 'err'); return; }
    $('newcode-v').textContent = data;
    $('newcode').hidden = false;
    $('g-pour').value = '';
    chargerCodes();
  });

  $('b-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('newcode-v').textContent); $('b-copy').textContent = 'COPIÉ'; }
    catch { $('b-copy').textContent = 'SÉLECTIONNE'; }
    setTimeout(() => { $('b-copy').textContent = 'COPIER'; }, 1500);
  });

  // ---------------------------------------------------------------- utilisateurs
  async function chargerUtilisateurs(liste) {
    const { data: { user } } = await sb.auth.getUser();
    const tb = $('t-users');
    tb.textContent = '';
    if (!liste.length) vide(tb, 6, 'Aucun utilisateur.');
    for (const u of liste) {
      const tr = document.createElement('tr');
      cell(tr, (u.prenom + ' ' + u.nom).trim() || '—');
      cell(tr, u.email);
      cell(tr, u.role === 'admin' ? 'Admin' : 'Utilisateur');
      cell(tr, fmt(u.created_at), 'date');
      const st = u.disabled ? ['Bloqué', 'bloque'] : u.active ? ['Actif', 'utilise'] : ['En attente de code', 'libre'];
      pill(cell(tr, ''), st[0], st[1]);
      const act = cell(tr, '', 'act');
      if (!user || u.id !== user.id) {
        btn(act, u.disabled ? 'DÉBLOQUER' : 'BLOQUER', async () => {
          const { error } = await sb.rpc('basculer_utilisateur', { p_id: u.id });
          if (error) alert(texteErreur(error));
          chargerTout();
        });
      }
      tb.appendChild(tr);
    }
  }

  // ---------------------------------------------------------------- mises à jour
  async function chargerReleases() {
    const { data } = await sb.from('releases').select('version,notes,taille,created_at,obligatoire').order('created_at', { ascending: false });
    const tb = $('t-rel');
    tb.textContent = '';
    if (!data || !data.length) vide(tb, 5, 'Aucune version publiée.');
    for (const r of data || []) {
      const tr = document.createElement('tr');
      cell(tr, r.version, 'code');
      cell(tr, r.notes || '—');
      cell(tr, (r.taille / 1048576).toFixed(1) + ' Mo', 'date');
      cell(tr, fmt(r.created_at), 'date');
      cell(tr, r.obligatoire ? 'OUI' : '—');
      tb.appendChild(tr);
    }
  }

  async function sha256(file) {
    const h = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  $('f-rel').addEventListener('submit', async (e) => {
    e.preventDefault();
    const version = $('r-version').value.trim();
    const f = $('r-fichier').files[0];
    if (!/^\d+\.\d+\.\d+$/.test(version)) { msg('r-msg', 'Version au format 1.2.3.', 'err'); return; }
    if (!f || !/\.zip$/i.test(f.name)) { msg('r-msg', 'Choisis le fichier .zip.', 'err'); return; }
    msg('r-msg', 'Envoi…');
    const chemin = version + '/AllanBIM.zip';
    const empreinte = await sha256(f);
    const up = await sb.storage.from('releases').upload(chemin, f, { contentType: 'application/zip', upsert: false });
    if (up.error) { msg('r-msg', 'Envoi impossible : ' + up.error.message, 'err'); return; }
    const { error } = await sb.from('releases').insert({ version, notes: $('r-notes').value, chemin, sha256: empreinte, taille: f.size, obligatoire: $('r-oblig').checked });
    if (error) { msg('r-msg', error.code === '23505' ? 'Cette version existe déjà.' : texteErreur(error), 'err'); return; }
    msg('r-msg', 'Version ' + version + ' publiée. Les utilisateurs la verront avec le bouton Mise à jour.', 'ok');
    $('f-rel').reset();
    chargerReleases();
  });

  // ---------------------------------------------------------------- prérequis
  async function chargerPrereqs() {
    const { data } = await sb.from('prereqs').select('*').order('ordre');
    const tb = $('t-pre');
    tb.textContent = '';
    if (!data || !data.length) vide(tb, 4, 'Aucun prérequis : le bouton installe seulement le module Revit.');
    for (const p of data || []) {
      const tr = document.createElement('tr');
      cell(tr, p.nom);
      cell(tr, p.url, 'date');
      cell(tr, p.arguments || '—');
      btn(cell(tr, '', 'act'), 'SUPPRIMER', async () => {
        if (!confirm('Supprimer « ' + p.nom + ' » des prérequis ?')) return;
        const { error } = await sb.from('prereqs').delete().eq('id', p.id);
        if (error) alert(texteErreur(error));
        chargerPrereqs();
      });
      tb.appendChild(tr);
    }
  }

  $('f-pre').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = $('p-url').value.trim();
    if (!$('p-nom').value.trim() || !/^https:\/\//i.test(url)) { msg('p-msg', 'Nom et lien https obligatoires.', 'err'); return; }
    const { error } = await sb.from('prereqs').insert({
      nom: $('p-nom').value.trim(), url, sha256: $('p-sha').value.trim().toLowerCase() || null, arguments: $('p-args').value.trim(),
    });
    if (error) { msg('p-msg', texteErreur(error), 'err'); return; }
    msg('p-msg', 'Ajouté.', 'ok');
    $('f-pre').reset();
    chargerPrereqs();
  });

  // ---------------------------------------------------------------- onglets
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => {
      x.setAttribute('aria-selected', String(x === t));
      $(x.dataset.panel).hidden = x !== t;
    });
  }));

  async function chargerTout() {
    const liste = await chargerProfils();
    chargerCodes();
    chargerUtilisateurs(liste);
    chargerReleases();
    chargerPrereqs();
  }

  afficher();
})();
