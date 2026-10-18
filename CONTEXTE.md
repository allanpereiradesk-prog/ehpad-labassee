# CONTEXTE — EHPAD La Bassée (projet tutoré N°3, Licence BIM-CVC)

À lire en premier par tout Claude qui travaille sur ce dépôt.
Dernière mise à jour : 18/10/2026.

## 1. Le projet

- Lot CVC + plomberie d'un EHPAD à La Bassée (Hauts-de-France). Maquette sous **Revit 2026 uniquement**.
- Équipe : **Allan** (propriétaire du dépôt), Mouhamed, Yann, Noah.
- Profs : M. Duport, Samy El Hendi, Gilles Cambillau. Ils ont un accès en lecture au site, plus le chat et le forum pour leurs remarques.
- Maquette de travail : `EXE_RSP_CVC_MNT_v3.rvt` (fichier partagé, workshared). Elle lie l'ARC (`DCE_ARC_MNT`) et la STR corrigée (`DCE_STR_MNT_corrige`) sur le site **PARTAGEES**.
- L'électricité est hors périmètre.

## 2. Qui fait quoi (deux Claude, un seul utilisateur)

Allan utilise deux comptes Claude, et les deux, c'est lui.

| Claude | Rôle | Ne touche pas à |
|---|---|---|
| Claude « Revit » | Maquette Revit (via le connecteur Revit MCP sur le PC d'Allan), calculs, Excel, CR. Dépose ses exports dans `exports-revit/`. | `index.html`, la mise en page du site |
| Claude « site » | `index.html`, `seed.json`, `migrations.json`, `firestore.rules`, intégration des exports sur le site | La maquette Revit |

Pour échanger, on passe par ce dépôt. Le Claude Revit dépose ses fichiers dans `exports-revit/` avec un `README.md` qui dit quoi en faire. Le Claude site les intègre.

## 3. Règles à respecter

- **Langue** : français, phrases simples et courtes.
- **Textes du site** : à la première personne, au nom d'Allan (« j'ai placé », « mon compte »). Jamais « Allan a fait ».
- **Firestore** : Allan colle lui-même les règles dans la console Firebase. On met à jour `firestore.rules` et on lui dit de les coller.
- **Identifiants** : Claude ne saisit jamais de mot de passe ni d'identifiant.
- **ACC de M. Duport** : demander à Allan avant toute action.
- **Revit** :
  - uniquement par le connecteur MCP ;
  - jamais de prise de contrôle de l'écran ;
  - ne jamais lancer ni relancer Revit, c'est Allan qui le fait ;
  - rappeler à Allan de faire Ctrl+S puis « Synchroniser avec le fichier central ».
- **Gaines** :
  - **gaines rigides uniquement, jamais de flexibles** ;
  - angles droits ;
  - rien au-dessus des panneaux photovoltaïques ni hors du bâtiment ;
  - passage par les gaines techniques et les circulations.

## 4. Structure du dépôt

- `index.html` : tout le site (onglets tâches, heures, problèmes, documents, Revit, Tuto Revit, Captures, Implantation, Forum, 3D).
- `seed.json` : données initiales. `migrations.json` : mises à jour Firestore appliquées au chargement (`doc`, `data` / `union`).
- `firestore.rules` : règles Firebase. Connexion Google : écriture pour l'équipe, lecture pour les profs.
- `docs/*.b64.txt` : Word, Excel et PDF encodés en base64.
- `files/` :
  - `b3d/` : 3D du site — `building.*` (bâtiment), `equip.json` (équipements cliquables), `gaines.json` (gaines cliquables) ;
  - `familles/` : familles .rfa CVC + `geo.json` ;
  - `gaines/` : Excel dimensionnement, nomenclature/conflits, CR du 17/10, `reseaux.png` ;
  - `implantation/`, `syn/` (synoptiques PDF/DXF), `dce/`, `captures/` (captures du Tuto Revit).
- `maquettes/` : fichiers Revit à télécharger.

## 5. État de la ventilation (18/10)

5 CTA double flux en toiture-terrasse (niveau 7,02 m) :

| CTA | Modèle | Implantation (repère projet) | Descente |
|---|---|---|---|
| CTA 1 | VIM CAD HR OPTIMAL C4 | x -38,55 / y 62,7 | gaine technique du local ménage |
| CTA 2 | VIM CAD HR OPTIMAL C4 | x -30,6 / y 62,7 | bureau |
| CTA 3 | VIM CAD HR OPTIMAL C4 | x -41,95 / y 39,8 (au centre, hors structure et tuiles) | descente directe dans la circulation |
| CTA 4 | VIM CAD HR OPTIMAL C4 | x -30,8 / y 40,3 | descente directe |
| CTA 5 | VIM CAD O-INTEGRAL | x -68,9 / y 39,2 (terrasse libre, décalée le 18/10 pour dégager la porte de la terrasse) | réseau toiture à 90°, puis le RDC ; l'étage est alimenté depuis le RDC par le local linge sale |

Réseau **v12** dans Revit (18/10, maquette enregistrée) :
- 124 gaines et 132 raccords, tous les raccords sont faits ;
- les CTA, les socles et les gaines en toiture sont dégagés des tuiles, des PV, des édicules et des acrotères ;
- CTA 5 : axe des gaines remonté à 2,765 m (RDC) et 6,09 m (étage), tronc RDC en 350 mm de haut → plus aucun contact avec le faux plafond ;
- reprise CTA 1 décalée de 5 cm (x -39,35), elle ne touche plus la cloison du local ménage ;
- CTA 5 décalée de 1,7 m vers le sud : elle était devant la porte de la terrasse. Passage libre d'environ 1,6 m devant la porte. Descentes CTA 5 déplacées à y 38,0 (toujours dans le local ménage du RDC).

Dimensionnement :
- vitesses selon le tableau du CCTP §2.2.5, plafonnées à 6 m/s pour la CTA 5 (sinon la gaine serait plus étroite en amont qu'en aval) ;
- hauteur des gaines : 250 mm jusqu'à 2 000 m³/h, 300 mm au-delà, 350 mm au-delà de 4 000 m³/h (CTA 5) ;
- gaine au départ CTA 5 : 850 × 350 (au lieu de 700 × 400) ;
- pertes de charge réseau principal : CTA1 36 Pa, CTA2 37 Pa, CTA3 30 Pa, CTA4 25 Pa, CTA5 69 Pa.

Réservations (détection du 18/10, `exports-revit/reservations.json`) : 83 au total.
- 55 traversées de murs (15 dans des murs béton, à valider) ;
- 14 trémies dans les dalles (descentes verticales) ;
- 14 passages dans des poutres (tous sur la CTA 5, hall / salle à manger), à faire valider par le BE structure.

Les exports du 18/10 sont dans `exports-revit/` (voir son README, partie « Dépôt du 18/10 »).

## 6. Format des exports Revit → site

- `gaines.json` : liste d'objets `{id, k:"gaine"|"raccord", sys:"Soufflage"|"Reprise"|..., net:"CTA n", W, H, L, lv, q, vit, tr, part, v:[x,y,z,...]}`. `v` contient les sommets des triangles, en mètres, repère partagé.
- `equip.json` : liste d'objets `{id, type, mark, fab, fam, mod, cctp, verif, com, src, space, desc, off, ...}`.
- Les fichiers Excel et Word vont aussi dans `docs/` en version `.b64.txt` si le site les sert depuis là.
- `reservations.json` : format détaillé dans `exports-revit/README.md`. Le site le lit directement dans `exports-revit/`.
- Pour la couleur par CTA dans la 3D, mettre `net` (`"CTA 1"`…) **aussi sur les raccords**.

## 7. Journal du Claude « site »

- **18/10** :
  - Synoptique **SYN-03 indice B**, publié par `migrations.json` (fichiers `files/syn/*_B.*`). Ajout du bloc « 3 · Implantation et réseaux » : position des CTA, descentes, pertes de charge.
  - Nouvel onglet **Réservations** (`#reservations`) : tableau, filtres et export CSV. Il attend `exports-revit/reservations.json`.
  - Dans la **3D**, les gaines sont colorées par CTA, avec un filtre Tout / Soufflage / Reprise et une case par CTA.
  - Nouvel onglet **Devis** (`#devis`, tâches i07/i10). Le brouillon est partagé dans Firestore (`devis/brouillon`) : réglages, lignes par chapitre du CCTP, déboursé sec × K, totaux, contrôle, CSV et aperçu à imprimer. Le bouton « Mettre à jour les quantités » reprend `equip.json` et `gaines.json` sans toucher aux prix. Aucun prix n'est inventé : les prix restent vides tant qu'on ne les a pas trouvés.
  - Règle : à chaque nouveau `gaines.json` ou `equip.json`, **changer `GAI_V` et `EQ_V`** dans `index.html`, sinon le navigateur garde l'ancienne version en cache.
  - **Intégration des exports Revit du 18/10 (réseau v11)** :
    - `gaines.json` et `equip.json` recopiés dans `files/b3d/` (`GAI_V` = 2, `EQ_V` = 7) ;
    - `reseaux.png` et l'Excel de dimensionnement recopiés dans `files/gaines/` (plus `docs/*.b64.txt` à jour) ;
    - l'onglet Réservations lit les 78 réservations dans `exports-revit/` ;
    - SYN-03 B mis à jour : réseau v11, départ CTA 5 en 850 × 350, hauteur 350 mm au-delà de 4 000 m³/h, nouveaux points ouverts.
    - Dans le Devis, cliquer sur « Mettre à jour les quantités » pour reprendre les longueurs v11.
  - **Intégration du 18/10 (soir), réseau v12, CTA 5 décalée de 1,7 m vers le sud** :
    - `gaines.json` et `equip.json` recopiés (`GAI_V` = 3, `EQ_V` = 8), ainsi que `reseaux.png` et l'Excel (avec `docs/*.b64.txt`) ;
    - Réservations : 83 (55 murs, 14 trémies, 14 poutres) ;
    - Implantation : fiche CTA 5 avec la phrase sur le décalage et l'image `files/implantation/cta5_porte_terrasse.png` (champs `note`, `img` dans `IMPL_ITEMS`) ;
    - SYN-03 B : CTA 5 en x -68,93 / y 39,2, perte de charge 69 Pa, réseau v12, 15 traversées de murs béton à faire valider.
  - **Design et accessibilité (bloc « Design v4 » en fin de CSS + dernier `<script>`)** :
    - couleurs assombries pour un contraste suffisant (accent `#0670a3`, « en cours » `#8a560a`) : l'audit axe-core passe de 600+ erreurs à 0, en clair et en sombre ;
    - mode sombre réparé (la palette claire v3 l'écrasait) + bouton « Affichage » Auto / Clair / Sombre dans l'en-tête (`localStorage` `ehpad-theme`) ;
    - un seul `<main id="contenu">`, les vues sont des `<section role="tabpanel">`, la barre d'onglets est un `<nav>`, lien « Aller au contenu » ;
    - onglets : `aria-controls`, flèches gauche/droite, Début, Fin ; l'onglet ouvert reste visible sur téléphone ;
    - fenêtres (tâche, aperçu) : le focus entre dedans, y reste avec Tab, et revient au bouton à la fermeture ;
    - **règle** : garder ces contrastes. Ne pas remettre `#0696d7` en couleur de texte ou de bouton (il sert seulement pour les décors, via `--supply`).
