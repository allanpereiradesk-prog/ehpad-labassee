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
