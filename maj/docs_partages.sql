-- Allan BIM 3.9.34 : documents partagés avec un groupe (outil Documents, version classique seulement).
-- Une ligne par fichier : l'auteur l'envoie dans le stockage « documents » (dossier = son uid) et dit à quel groupe il le montre.
-- Seuls les membres du groupe (et l'auteur, et l'admin) lisent la ligne et le fichier. Demande groupes.sql (mes_groupes, admin_du_groupe, est_admin).
create table if not exists public.docs_partages (
  id uuid primary key default gen_random_uuid(),
  groupe uuid not null references public.groupes(id) on delete cascade,
  auteur uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nom_auteur text,
  dossier text not null check (char_length(dossier) between 1 and 60),
  chemin text not null check (char_length(chemin) between 1 and 600),
  fichier text not null unique,
  taille bigint not null default 0 check (taille >= 0 and taille <= 52428800),
  cree timestamptz not null default now()
);
create index if not exists docs_partages_groupe on public.docs_partages (groupe, dossier);
alter table public.docs_partages enable row level security;
drop policy if exists "docs_lecture" on public.docs_partages;
drop policy if exists "docs_ajout" on public.docs_partages;
drop policy if exists "docs_retrait" on public.docs_partages;
create policy "docs_lecture" on public.docs_partages for select to authenticated using (auteur = auth.uid() or groupe in (select mes_groupes()) or est_admin());
create policy "docs_ajout" on public.docs_partages for insert to authenticated with check (auteur = auth.uid() and groupe in (select mes_groupes()) and (storage.foldername(fichier))[1] = auth.uid()::text);
create policy "docs_retrait" on public.docs_partages for delete to authenticated using (auteur = auth.uid() or admin_du_groupe(groupe) or est_admin());
grant select, insert, delete on public.docs_partages to authenticated;
grant all on public.docs_partages to service_role;

-- le fichier : lisible par son auteur, par les membres du groupe de sa fiche, par l'admin
create or replace function public.peut_lire_document(p_nom text) returns boolean language sql stable security definer set search_path = public as $$
  select (storage.foldername(p_nom))[1] = auth.uid()::text or est_admin()
    or exists (select 1 from docs_partages d where d.fichier = p_nom and d.groupe in (select mes_groupes()))
$$;
grant execute on function public.peut_lire_document(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit) values ('documents', 'documents', false, 52428800) on conflict (id) do nothing;
drop policy if exists "documents_fichiers_lecture" on storage.objects;
drop policy if exists "documents_fichiers_depot" on storage.objects;
drop policy if exists "documents_fichiers_maj" on storage.objects;
drop policy if exists "documents_fichiers_retrait" on storage.objects;
create policy "documents_fichiers_lecture" on storage.objects for select to authenticated using (bucket_id = 'documents' and peut_lire_document(name));
create policy "documents_fichiers_depot" on storage.objects for insert to authenticated with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents_fichiers_maj" on storage.objects for update to authenticated using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents_fichiers_retrait" on storage.objects for delete to authenticated using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
