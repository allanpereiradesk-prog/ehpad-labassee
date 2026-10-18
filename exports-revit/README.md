# exports-revit — dépôt du Claude « Revit »

Le Claude « Revit » dépose ici ses exports. Le Claude « site » les intègre au site.
Lis d'abord `CONTEXTE.md` à la racine.

## Fichiers attendus

| Fichier | Contenu | Où le site le lit |
|---|---|---|
| `gaines.json` | Gaines et raccords du réseau v10 (nouveau tracé) | recopié dans `files/b3d/gaines.json` |
| `equip.json` | Équipements cliquables (CTA à leur nouvelle place, socles…) | recopié dans `files/b3d/equip.json` |
| `reseaux.png` | Plan des réseaux de soufflage | recopié dans `files/gaines/reseaux.png` |
| `reservations.json` | Liste des réservations | lu **directement ici** tant que `files/reservations/reservations.json` n'existe pas |

## gaines.json

Liste d'objets, un par gaine ou raccord :

```json
{"id":"1040089","k":"gaine","sys":"Soufflage","net":"CTA 1","W":450,"H":300,"L":0.69,
 "lv":"NT1","q":2520,"vit":5.19,"tr":[],"part":"sortie CTA",
 "v":[x,y,z, x,y,z, ...], "t":[0,1,2, 2,3,0, ...]}
```

- `k` : `"gaine"` ou `"raccord"`.
- `sys` : `"Soufflage"` ou `"Reprise"` (exactement ces mots, le filtre de la 3D s'en sert).
- `net` : `"CTA 1"` à `"CTA 5"`. Il sert à la couleur par CTA. **Mets-le aussi sur les raccords si tu peux.** Sinon le site prend la CTA de la gaine la plus proche.
- `v` : sommets en mètres, repère partagé. `t` : indices des triangles. Si `t` manque, `v` est lu comme une suite de triangles.

## reservations.json

```json
{
  "maj": "2026-10-18",
  "items": [
    {"id":"R-001","type":"Traversée de mur","lv":"N00","elem":"Mur béton 20 cm","local":"Local ménage",
     "W":500,"H":350,"cta":"CTA 1","sys":"Soufflage","statut":"à faire","rid":"1040111","com":""},
    {"id":"R-052","type":"Trémie","lv":"N01","elem":"Dalle béton 23 cm","W":1100,"H":600,
     "cta":"CTA 3","sys":"Reprise","statut":"à faire"},
    {"id":"R-072","type":"Poutre","lv":"N00","elem":"Poutre BA 30×60","D":250,
     "cta":"CTA 5","sys":"Soufflage","statut":"à valider","com":"À faire valider par le BE structure"}
  ]
}
```

- `type` : `"Traversée de mur"`, `"Trémie"` ou `"Poutre"`.
- `lv` : `"N00"` (RDC), `"N01"` (étage), `"NT1"` (toiture).
- Dimensions en mm : `W` × `H` pour un trou rectangulaire, `D` pour un trou rond. Mets la taille **du trou** (gaine + jeu), pas celle de la gaine.
- `statut` : `"à faire"`, `"à valider"`, `"validée"` ou `"refusée"`.
- `rid` : ID Revit de l'élément traversé ou de la gaine (facultatif).

Après un dépôt, dis à Allan de prévenir le Claude « site ».

## Dépôt du 18/10 (Claude « Revit »)

Maquette `EXE_RSP_CVC_MNT_v3.rvt`, réseau v11, enregistrée.

| Fichier | Contenu |
|---|---|
| `gaines.json` | 256 objets (124 gaines + 132 raccords). `net` est renseigné partout, raccords compris. `sys` vaut `Soufflage` ou `Reprise`. |
| `equip.json` | 30 équipements, CTA à leur nouvelle place (même format que `files/b3d/equip.json`). |
| `reseaux.png` | Plan des réseaux (étage + toiture, RDC). |
| `reservations.json` | 78 réservations au format ci-dessus. En plus : `x, y, z` (m, repère partagé), `gaine` (taille de la gaine), `maquette` (lien ARC ou STR). Trou = gaine + 100 mm. |
| `EHPAD_Dimensionnement_Gaines.xlsx` | Excel de dimensionnement à jour (à mettre aussi dans `files/gaines/` et `docs/` en `.b64.txt`). |

Changements par rapport au tracé v10 :
- CTA 5 : gaines remontées au-dessus du faux plafond (axe 2,765 m au RDC, 6,09 m à l'étage), tronc RDC en 350 mm de haut, départ 850 × 350.
- Reprise CTA 1 décalée de 5 cm.
- Pertes de charge inchangées à 1 Pa près (CTA 5 : 71 Pa). Le bloc du SYN-03 B reste juste, sauf la section de départ CTA 5 (850 × 350).

## Mise à jour du 18/10 (soir) — CTA 5 décalée

La CTA 5 était devant la porte de la terrasse. Je l'ai décalée de 1,7 m vers le sud (origine x -68,93 / y 39,20). Le passage devant la porte fait maintenant environ 1,6 m.

- Tous les fichiers de ce dossier sont à jour (réseau v12) : `gaines.json`, `equip.json`, `reseaux.png`, `reservations.json` (**83** réservations : 55 murs, 14 trémies, 14 poutres), Excel.
- Nouvelle image `cta5_porte_terrasse.png` : avant / après autour de la porte. Elle peut aller dans l'onglet Implantation, à la fiche de la CTA 5.
- Pertes de charge CTA 5 : 69 Pa (au lieu de 71). Section de départ inchangée : 850 × 350.
