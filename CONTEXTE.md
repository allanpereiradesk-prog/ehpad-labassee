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

VMC simple flux (20/10) : **6 caissons C4** (VMC 1 nord 1 785 m³/h, VMC 2 ouest 315, VMC 3 centre ouest 255, VMC 4 centre est 630, VMC 5 sud 60 sur terrasse basse, VMC 6 aile est 45 dans les combles), montées, collecteurs et antennes rigides. Les **46 bouches VMC sont raccordées**. Rejets à plus de 8 m des prises d'air neuf des CTA. Les collecteurs VMC du R+1 passent au-dessus des antennes CTA (axe 6,22 m ; 6,15 m pour VMC 4, sous une poutre 20x50). 18 bouches VMC ont été décalées dans leur local. Reste : grilles de transfert des offices et de la tisanerie, piquage du caisson VMC 1 (Ø315 trop petit pour 1 785 m³/h). Compte rendu : `exports-revit/CR_vmc_2026-10-20.md`. Scripts Revit : `_script/vmc_v4.py` (caisson + gaines), `vmcant_v1.py` (antennes vers les bouches déjà posées).

Bouches (19/10) : **270 bouches**, les 244 locaux ventilés du dossier sont conformes en débit (contrôle `exports-revit/controle_dce.json`). Ajout de 46 bouches VMC sanitaires (CCTP § 4.12) et 6 bouches CTA 5. Modèles du CCTP dans les types Revit (GADD F, ALYZE S, DCFD-F, DATP). Reste : réseau VMC (caissons + gaines), 31 bouches CTA à raccorder. Compte rendu : `exports-revit/CR_bouches_2026-10-19.md`.

Bouches (18/10, nuit) : **218 bouches posées** avec leur débit (81 grilles murales de chambre 90 m³/h, 81 extractions de salle de bains 90 m³/h, 56 bouches plafond CTA 5), **190 raccordées** en gaine rigide (coudes « Angle carré rectangulaire - Joint coulissant » chargés par Allan). Liste : `exports-revit/bouches.json` et `EHPAD_Bouches_Ventilation.xlsx`. Réseau principal modifié : CTA 3/4 écartées, reprise CTA 5 RDC au-dessus des bureaux côté sud.

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
  - **Court métrage de l'accueil** (bloc `.film`, au-dessus de `#home`, script « Court métrage » en fin de fichier) : 9 scènes, environ 55 s, images de `files/`. Les textes et chiffres sont dans le tableau `SCENES`, à mettre à jour si le réseau change (chiffres du réseau v13 : 766 gaines, 774 raccords, 218 bouches, 86 réservations). Il ne démarre qu'au clic, se met en pause quand on quitte l'accueil, et reste fixe si l'ordinateur demande moins d'animations.
- **19/10** :
  - **Intégration du dépôt du 18/10 (nuit), réseau v13, bouches de ventilation** :
    - `gaines.json` (1 540 objets, antennes comprises) et `equip.json` recopiés dans `files/b3d/` (`GAI_V` = 4, `EQ_V` = 9) ; `reseaux.png` et l'Excel de dimensionnement recopiés dans `files/gaines/` (+ `docs/*.b64.txt`) ;
    - `bouches.json`, `EHPAD_Bouches_Ventilation.xlsx` et `plan_bouches.png` copiés dans `files/bouches/` ; Excel + plan ajoutés aux documents des tâches i05 et i02 (`migrations.json`) ;
    - nouvel onglet **Bouches** (`#bouches`) : chiffres clés, débits par CTA, plan, tableau filtrable (CTA, niveau, fonction, antenne faite / à faire), vitesse au col calculée, export CSV ;
    - **3D** : antennes en teinte plus claire, case « Antennes vers les bouches » ; la fiche d'une antenne affiche sa bouche (local, débit, col) ;
    - **Devis** : « Mettre à jour les quantités » ajoute une ligne par type de bouche (fonction, pose, col) ;
    - Réservations : l'onglet lit les **86** réservations dans `exports-revit/` (antennes pas encore comptées) ;
    - court métrage : chiffres v13 (766 gaines, 774 raccords, 218 bouches, 86 réservations).
  - **Point ouvert** : le SYN-03 B indique 69 Pa pour la CTA 5, la v13 donne **71 Pa** → à corriger dans un indice C.
  - **Film de présentation** dans la vue 3D (Revit › Bâtiment 3D) : boutons « ▶ Film de présentation » et « Enregistrer le film en vidéo » (MP4 si le navigateur le permet, sinon WebM, en 1920 × 1080). Environ 85 s : vue d'ensemble, structure, les 5 CTA une par une, réseaux qui partent de chaque CTA, plénums, chaufferie, générique. Les scènes sont dans `filmSetup()` (`index.html`) ; `window.filmOffline` sert à rendre le film image par image.
  - **Accueil** : à la demande d'Allan, le diaporama « court métrage » est remplacé par la **vidéo du film 3D** (`files/film/EHPAD_La_Bassee_film_CVC.mp4`, 1920 × 1080, rendue image par image avec `window.filmOffline` + ffmpeg ; affiche `files/film/affiche.jpg`). Bouton « Voir le film en 3D interactive » qui lance le film dans la vue 3D. Si le réseau change, il faut **refaire la vidéo** (ou l'enregistrer avec le bouton de la vue 3D) et la remplacer.
  - **Vidéo de présentation motion design** (soutenance) : `files/film/EHPAD_La_Bassee_Lot12_presentation.mp4` — 2 min 13 s, 1920 × 1080, muette. Partie 1 : la vraie maquette (building.bin, equip.json, gaines.json v13, bouches.json) en 3D isométrique, implantations et raisons ; partie 2 : le site d'équipe. Faite avec HyperFrames ; projet source hors dépôt. Distincte du film de 85 s de l'Accueil (`EHPAD_La_Bassee_film_CVC.mp4`), qui n'a pas été modifié.
  - L'Accueil lit maintenant cette vidéo de présentation (affiche `files/film/affiche_presentation.jpg`). L'ancien film de 85 s reste dans `files/film/` mais n'est plus affiché.
  - Version **commentée** de la vidéo (même fichier, 2 min 29 s) : voix off française générée avec FLORA (Gemini TTS, voix « Charon »), 69 bruitages calés sur les animations (bibliothèque HyperFrames + 4 sons FLORA / ElevenLabs). La vidéo a été recalée sur la voix (table de temps dans le projet source).
  - **Ouverture du site** : on arrive toujours sur l'Accueil (le dernier onglet n'est plus rouvert, et les profs ne sont plus envoyés sur Échanges). Même avec une adresse en #synoptiques, #bouches…, une ouverture ou une actualisation ramène à l'Accueil (le # est retiré de l'adresse).
- **19/10** (Claude « site ») : nouvel onglet **Stock** (`#stock`, pour le chargé d'affaires). Dépôt en 3D (zone A au sol pour le gros matériel, rayonnages pour le reste, placement automatique selon la taille), liste à droite avec +/−, ajout d'article (dimensions, rangement), fiche au clic dans la 3D (stock, besoin chantier, à commander, emplacement), suppression, journal des mouvements. Données partagées dans Firestore `stock/depot` ; stock de départ repris de `equip.json` (sans les socles) et `bouches.json`, enregistré à la première modification. Code : dernier `<script>` de `index.html`.
  - Stock : les objets ont leur **vraie forme**. Les équipements reprennent la géométrie des familles Revit (`equip.json`, champ `fam` de l'article) ; les bouches sont dessinées en grilles (cadre + lames) à partir du col (`col` de l'article). Un article ajouté à la main reste un colis (pavé).
- **20/10** (Claude « site ») : **intégration du dépôt du 19/10 (bouches conformes au DCE)**.
  - `bouches.json` (270 bouches : modèle, produit, réf. CCTP), `controle_dce.json`, `plan_bouches.png` et `EHPAD_Bouches_Ventilation.xlsx` recopiés dans `files/bouches/` (+ `docs/EHPAD_Bouches_Ventilation.xlsx.b64.txt`).
  - Onglet Bouches : compte rendu du 19/10 (repliable, version HTML `files/bouches/CR_bouches_2026-10-19.html` + PDF), colonne modèle / produit / réf. CCTP, nouveau tableau **« Contrôle DCE : débits par local »** (244 locaux, filtres, CSV).
  - Le PDF du compte rendu est ajouté aux documents des tâches i02 et i05 (`migrations.json`).
  - **Intégration du dépôt du 20/10 (réseau VMC simple flux)** : `gaines.json` et `equip.json` recopiés (`GAI_V` = 5, `EQ_V` = 10) ; Excel bouches et gaines (+ b64), `bouches.json` (champ `reseau`) et `reseau_vmc.png` dans `files/bouches/` ; compte rendu du 20/10 publié dans l'onglet Bouches (HTML + PDF, PDF et plan ajoutés aux documents de la tâche i02) ; 3D : une couleur par caisson `VMC 1`…`VMC 6` (`CTA_COL`), vert pour l'extraction en mode « Soufflage / reprise », filtre « Extraction (VMC) », groupe « Terrasse basse (R+1) » pour VMC 5 ; Réservations : 156 (119 murs, 23 trémies, 14 poutres, dont 70 VMC) ; Devis et Stock : les caissons VMC vont au chapitre VMC / catégorie ventilation.
  - **Recherche Ctrl + K** (ou « / », ou bouton « Tout chercher » dans l'en-tête) : palette qui cherche dans les onglets, actions, tâches, équipements, bouches, locaux (contrôle DCE), réservations et implantations, puis ouvre le bon onglet filtré (ou la 3D sur l'équipement). Index construit au premier appel (`cmdkIndex()`, dernier `<script>`).
  - **3D : air en mouvement** (case « Air en mouvement » : particules bleues / orange / vertes qui suivent le sens soufflage → bouches, bouches → CTA ou caisson, vitesse proportionnelle à `vit` ; les gaines deviennent translucides) et **écorché** (curseur « Écorché » + bouton « Éclater / regrouper » : RDC, étage et toiture s'écartent, via un attribut `lvl` par triangle et un `uExplode` dans le shader). Code : `batEnhance()`, appelé à la fin de `rvBatInit`. Les clics dans la 3D sont plus justes avec l'écorché à 0.
  - **Onglet « Création de famille »** (`#famgen`) : on dépose une fiche technique PDF, le site lit le texte (pdf.js) et pré-remplit fabricant, modèle, type, dimensions, débit, puissance, poids, volume et tailles de raccords (`fgAnalyze`) ; ce qui manque est signalé en rouge ; raccords types par catégorie, modifiables (type, réseau, taille, face, décalages) ; aperçu 3D ; génération d'un **script Dynamo .dyn** (un nœud Python CPython3 + un nœud « Chemin du gabarit ») qui crée la famille .rfa dans `Documents\Familles_EHPAD` (gabarit « Équipement de génie climatique métrique » trouvé automatiquement), avec volume, socle, manchettes, connecteurs gaine / tuyau et paramètres (fabricant, modèle, réf. CCTP, débit, puissance, poids, volume, à vérifier), puis la charge dans le projet. Aussi : `.py` à coller dans un nœud Python, et fiche `.json` pour le Claude « Revit ». Script testé seulement sur une maquette simulée de l'API Revit : **premier essai réel à faire dans Revit 2026**.
  - **Tuto Dynamo pas à pas** en bas de l'onglet Création de famille (`#fgTuto`) : 9 étapes à cocher (progression gardée sur l'ordinateur), dessins simplifiés avec cadres ①②③ (ruban Gérer › Dynamo, ouvrir le .dyn, Exécuter, placer via Systèmes › Équipement mécanique), erreurs fréquentes, plan B avec le .py, bouton « Imprimer le tuto ». Aussi dans Ctrl + K (« Tuto : utiliser le script Dynamo »).
  - **Onglet « Maquette 3D »** (`#maq`) : la 3D du bâtiment en plein écran. Les éléments de la vue 3D de l'onglet Revit (`#rvBatCv`, `#rvBatTools`, `#rvBatEq`, `#rvBatInfo`) sont **déplacés** dans l'écran plein (`mqEnter`) puis remis à leur place en sortant (`mqExit`) : une seule 3D, mêmes fonctions. Panneau à droite arrondi et repliable (Sélection / Affichage / Équipements, état gardé sur l'ordinateur), il s'ouvre sur « Sélection » quand on clique un élément ; barre d'outils en bas (vue d'ensemble, air, écorché, film, recherche, plein écran) ; bouton « ← Site ».
  - **Onglet « ⚔️ Combat »** (`#jeu`, réservé à l'équipe : bouton caché si `isTeam()` est faux, redirection vers l'accueil sinon — masquage côté navigateur seulement). **Combat à 4 chacun pour soi** dans toute la maquette + **entraînement solo** (drones « conflit »).
    - Réseau : pair à pair WebRTC (canaux `u` non fiable pour les positions à 20/s, `r` fiable pour tirs touchés / éliminations). Mise en relation par Firestore : `jeuSalle/{sid}` (présence, battement toutes les 7 s), `jeuSignal` (offre / réponse SDP, effacées après lecture), `jeu/match` (id, début, durée, limite). Si la liaison directe échoue en 15 s → relais par `jeuRelais/{sid}` (~4 écritures/s, plus lent). Chaque joueur décide seul de ses dégâts (celui qui tire envoie « touché », la victime annonce l'élimination).
    - Collision (`gmGrid`) : cases de 25 cm, murs en tranches de 10 cm, faces vers le haut = sols, vers le bas = dessous de dalle. **Les ouvertures de portes ne sont pas découpées dans les murs exportés** : on ouvre un passage à chaque porte (`userData.els` du maillage Portes). Zones jouables = plus grande zone d'un seul tenant par niveau (`gmArena`) ; l'escalier modélisé ne relie pas les niveaux → **ascenseurs** (disques bleus) RDC ↔ étage ↔ toiture.
    - Scores : `jeu/combat` (victoires / éliminations / morts par prénom), `jeu/scores` (records solo). Pas de nouvelle règle Firestore nécessaire (règle générale « équipe »).
  - **Onglet « Énergie »** (`#energie`, après Bouches) : tableau de bord énergie. Données dans `files/energie/energie.json` (tirées de `EHPAD_Pieces_Espaces_Zones_Thermique.xlsx` — étude RT2012 du DCE —, de `equip.json` et du CCTP) : chiffres clés (besoin à la température de base, 190 kW chaud installé, W/m², point de bivalence des PAC, H enveloppe 1 988 W/K, débits d'air, Bbio, Cep), courbe besoin / PAC / PAC + chaudières, déperditions par poste (enveloppe + air neuf), production, ventilation (débit, pertes de charge, chaleur perdue), enveloppe par élément, surfaces par zone. Hypothèses modifiables (T int 20 °C, T base -9 °C **à vérifier**, récupération CTA 75 % **à remplacer par la fiche VIM**), gardées sur l'ordinateur (`ehpad-energie`). Aussi dans Ctrl + K. Si l'étude ou le réseau change, refaire `energie.json`.
    - Corrigé le 20/10 d’après le CCTP lot 12 : T int 21 °C (§ 2.2.2), T base -9 °C confirmée (§ 2.2.1), récupération 80 % (§ 4.10.2/4.11.2), PAC 33,7 kW chaud / 40,1 kW froid (§ 4.6.2, pas 35), air VMC compensé par les CTA (§ 4.12.6 : seule la chaleur non récupérée est comptée), ECS 100 kW ajoutée au bilan de puissance, Bbio max 138,8 et Cep max 148,1 (RSET). Réglages gardés sous `ehpad-energie-v2`.

  - **Onglet « KPI »** (`#kpi`, après Le projet) : indicateurs calculés en direct (`renderKpi`) depuis tasks/hours/issues (Firebase), bouches.json, controle_dce.json, exports-revit/reservations.json, equip.json, energie.json (`enCalc`), devis/brouillon et `RSE_NORMES`. 4 groupes (pilotage, maquette, bâtiment, conformité), chaque carte = valeur + cible + couleur + calcul, clic → onglet source. Courbe heures prévues (planning de la fiche : 40 h/pers. 23/11→12/03, 100 h/pers. 30/03→28/05) vs réalisées.
  - **Onglet « RSE et normes »** (`#rse`, après Énergie) : données en dur dans le script (`RSE_NORMES`, `RSE_ENV`, `RSE_SOC`, `RSE_SEC`, `RSE_GOV`, `RSE_TODO`). 25 textes (RT2012, E+C-, NF Habitat HQE, ERP type J 4e cat., CH 43, IT 246, RSD, EN 13053, DTU, anti-brûlure/légionelle, ACS, acoustique 2003 et 2006-1099, gaz, code minier/NF X10-970, F-gas, ErP) avec ce qu'ils imposent, où on le respecte et un statut. Les textes plus récents que le DCE (BACS, décret tertiaire, F-gas 2024/573) sont marqués « Hors DCE ». Point clé : R410A des PAC (8 kg, 16,7 t éq. CO₂ chacune) problématique avec F-gas en 2027.
- **21/10** (Claude « site ») : nouvel onglet **Piège à son** (`#pas`, après Création de famille). Réglages DN / isolant / longueur / manchettes / débit, plan coté en direct (coupe + vue de bout, SVG), vitesse dans le tube si on donne un débit. Téléchargements : script AutoCAD `files/pas/PAS_circulaire.lsp` (commande `PAS`, cotes associatives, calques `PAS-*`, hachures ; les valeurs réglées deviennent les valeurs par défaut), DXF R12 et SVG générés dans le navigateur. Code : dernier `<script>` avant le dernier `<style>`. Aussi dans Ctrl + K.
