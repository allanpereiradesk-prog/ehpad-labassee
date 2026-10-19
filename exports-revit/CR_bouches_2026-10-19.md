# Compte rendu — bouches de ventilation conformes au DCE (19/10/2026)

*Rédigé par Allan (Claude « Revit »). À publier sur le site par le Claude « site ».*

## Ce que j'ai fait

J'ai comparé chaque bouche de la maquette Revit au dossier DCE :
- le **CCTP lot 12** (§ 4.10 chambres, § 4.11 locaux communs, § 4.12 VMC sanitaires) ;
- le fichier **« Débits par local »** (débits du dossier pour les 244 locaux ventilés).

Résultat : **les 244 locaux ventilés du dossier ont leurs bouches, au bon débit.** Le contrôle local par local est dans l'onglet « Contrôle DCE » de `EHPAD_Bouches_Ventilation.xlsx`.

## Ce qui manquait et que j'ai ajouté

- **46 bouches d'extraction VMC** des sanitaires, offices, ménage, déchets, linge sale (CCTP § 4.12) : 3 090 m³/h. WC 30 m³/h, douches et vestiaires 45 m³/h, locaux pollués 30 m³/h, offices et tisanerie 450 m³/h (3 bouches chacun).
- **6 bouches CTA 5** qui n'étaient pas posées : reprise de la coiffure, reprise de la salle à manger de l'étage (2), soufflage et reprise de la détente, 2e bouche de soufflage du salon de l'étage.
- Une bouche était dans le mauvais salon : je l'ai déplacée.

## Modèles des bouches (comme le CCTP)

| Où | Bouche | Modèle CCTP |
|---|---|---|
| Chambres (81) | Grille murale de soufflage 90 m³/h | VIM GADD F (§ 4.10.6) |
| Salles de bains (81) | Bouche d'extraction autoréglable 90 m³/h | VIM ALYZE S (§ 4.10.6) |
| Locaux communs, soufflage (31) | Diffuseur plafond tourbillonnaire | VIM DCFD-F (§ 4.11.7) |
| Locaux communs, reprise (31) | Grille plafond à quadrillage | VIM DATP (§ 4.11.8) |
| Sanitaires, offices… (46) | Bouche d'extraction VMC autoréglable | VIM ALYZE S (§ 4.12.5) |

Le fabricant, le modèle et la référence CCTP sont renseignés dans les types Revit.

## Chiffres

- **270 bouches** dans la maquette, **193 raccordées** au réseau.
- CTA 1 à 4 : la somme des bouches tombe juste sur le débit de chaque CTA.
- CTA 5 : 6 027 m³/h au soufflage (le CCTP dit 8 800 m³/h, écart déjà connu).

## Écarts avec le CCTP (assumés)

1. **Flexibles** : le CCTP raccorde les bouches par 50 cm de flexible phonique. Dans la maquette, je raccorde en **gaine rigide** jusqu'à la bouche (choix de l'équipe).
2. **Régulateurs de débit constant** à chaque bouche de soufflage : pas modélisés.
3. **Bouches des salles de bains** : le CCTP les met au lot cabine préfabriquée. Je les ai quand même modélisées pour le calcul.
4. **Débit CTA 5** (8 800 m³/h au CCTP, 6 027 m³/h chez nous) et **CTA 2** (2 330 au CCTP, 2 430 chez nous) : à trancher avec le prof.
5. **Petits stocks** (< 25 m³/h) : pas de bouche, transfert d'air par la porte.

## Ce qui reste à faire

- **Réseau VMC sanitaires** : les 46 bouches sont posées, mais il manque les caissons d'extraction en toiture et les gaines.
- **Compensation** des offices et de la tisanerie (450 m³/h) : bouches de transfert à prévoir (CCTP § 4.12.6).
- **29 bouches CTA à raccorder** : surtout la salle à manger du RDC, où il n'y a pas la place de passer entre les deux gaines, et les salons de l'étage.

## Fichiers (dossier `exports-revit/`)

- `bouches.json` : 270 bouches. Champs : `id`, `cta`, `fonction`, `lv`, `num`, `local`, `q`, `pose`, `col`, `modele`, `produit`, `ref_cctp`, `x`, `y`, `z`, `raccordee`, `remarque`, `cle` (local).
- `controle_dce.json` : 244 locaux, avec débit du dossier et débit de la maquette (`dos_s`, `dos_e`, `rv_s`, `rv_r`, `rv_e`, `ok`, `rem`, `bouches`).
- `EHPAD_Bouches_Ventilation.xlsx` : onglets Synthèse, Bouches, Contrôle DCE, Écarts au CCTP, Hypothèses.
- `plan_bouches.png` : plan RDC + étage.
