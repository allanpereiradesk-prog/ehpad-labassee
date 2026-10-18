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
| CTA 5 | VIM CAD O-INTEGRAL | x -69,2 / y 40,9 (terrasse libre) | réseau toiture à 90°, puis le RDC ; l'étage est alimenté depuis le RDC par le local linge sale |

Réseau **v11** dans Revit (18/10, maquette enregistrée) :
- 124 gaines et 132 raccords, tous les raccords sont faits ;
- les CTA, les socles et les gaines en toiture sont dégagés des tuiles, des PV, des édicules et des acrotères ;
- CTA 5 : axe des gaines remonté à 2,765 m (RDC) et 6,09 m (étage), tronc RDC en 350 mm de haut → plus aucun contact avec le faux plafond ;
- reprise CTA 1 décalée de 5 cm (x -39,35), elle ne touche plus la cloison du local ménage.

Dimensionnement :
- vitesses selon le tableau du CCTP §2.2.5, plafonnées à 6 m/s pour la CTA 5 (sinon la gaine serait plus étroite en amont qu'en aval) ;
- hauteur des gaines : 250 mm jusqu'à 2 000 m³/h, 300 mm au-delà, 350 mm au-delà de 4 000 m³/h (CTA 5) ;
- gaine au départ CTA 5 : 850 × 350 (au lieu de 700 × 400) ;
- pertes de charge réseau principal : CTA1 36 Pa, CTA2 37 Pa, CTA3 30 Pa, CTA4 25 Pa, CTA5 71 Pa.

Réservations (détection du 18/10, `exports-revit/reservations.json`) : 78 au total.
- 50 traversées de murs (13 dans des murs béton, à valider) ;
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
  - Il faudra **changer `GAI_V` et `EQ_V`** dans `index.html` quand on intégrera les nouveaux `gaines.json` et `equip.json`, sinon le navigateur garde l'ancienne version en cache.
