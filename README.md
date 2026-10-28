# Gazette du Manoir : Édition du 31 octobre (Grand-Guignol des développeurs)

> 💀 **Lire la Gazette en ligne** : [https://mazounirayan.github.io/gazette-du-manoir/](https://mazounirayan.github.io/gazette-du-manoir/)

Feuilleton web interactif, zéro dépendance et zéro étape de compilation, inspiré des affiches du **Théâtre du Grand-Guignol** (fin XIXe siècle) et des cauchemars de mise en production.

## Ouvrir l’édition

Double-clic direct sur `index.html` (fonctionne nativement en `file://`), ou via un serveur statique local :

```bash
python -m http.server 8090
```

Puis ouvrir `http://localhost:8090`.

## Direction artistique et mécanique

- **Esthétique d’imprimerie Grand-Guignol** : typographie Didone monumentale (`Bodoni Moda`), papier vergé lithographique grainé (`#EFE9DC`), encre de suie (`#171412`), vermillon d’affiche (`#B82518`), filets doubles, ombres franches au plomb et gravures vectorielles (zéro dégradé néon, zéro glassmorphism, zéro icône emoji).
- **Grille architecturale en fer forgé** : piques fleurdelisées, volutes gothiques et heurtoir crâne aux yeux suiveurs offrant deux modes d’entrée (avec orgue de théâtre et bruitages `Web Audio API`, ou en silence pour l’open-space).
- **Souris Hantée (Main d’écorché Posada à 60 FPS)** : véritable main osseuse sectionnée articulée qui suit le pointeur par ressort physique, pointe son index sur les boutons, claque des phalanges au clic, et tambourine d’impatience ses cinq doigts sur le papier après trois secondes d’inactivité (façon *La Chose* de la Famille Addams). Débrayable via le bouton HUD ou la touche `M`.
- **Mode Veillée à la Chandelle (touche `C`)** : nappe d’obscurité de suie percée par un halo de suif vacillant porté par la main osseuse dans un bougeoir en laiton. Rétrécit sous le courant d’air lors des accélérations, révèle les annotations à l’encre invisible et fait luire les prunelles rouges dans l’ombre.
- **Physique 2D Posada et Désarticulation Cinétique (`physics-skeletons.js`)** : squelettes articulés avec membres qui plient à l’impact. Catapultés violemment contre un mur ou le sol (> 940 px/s), ils se brisent en crâne, cage thoracique et fémurs bondissants au son d’un xylophone d’os. Cliquer sur un os au sol le fait sautiller en lançant une repartie de développeur.
- **Secret du Bal des Squelettes 1897 (touche `H` ou code Konami `↑ ↑ ↓ ↓ ← → ← → B A`)** : fanfare funèbre et averse de squelettes mélomanes coiffés de hauts-de-forme victoriens jouant de la trompette en cuivre (*DOOT!*), débloquant la mention spéciale *Maître du Bal des Squelettes* sur l’attestation notariée.
- **Quatre actes et frayeurs graduées** :
  1. **Acte I (Le Grand Vestibule)** : lustre aux ossements à secouer, coup de tonnerre avec flash à rayons X révélant le crâne du Comte Legacy et chauves-souris.
  2. **Acte II (L’Apothicairerie des mises en prod)** : registre numéroté de cinq ingrédients (`Bave de crapaud`, `Araignée des combles`, `git push --force`, `Recruteur Java`, `Poudre d’os`) déclenchant quatre planches gravées (*Monsieur Calcium*, *Le Spectre des 47 conflits Git*, *Le Comte Recrutor*, *L’Araignée du code sans tests*).
  3. **Acte III (Le Cimetière des projets abandonnés)** : quatre stèles de pierre avec mains osseuses sortant de terre.
  4. **Acte IV (La Cave scellée et l’Attestation)** : le **Cercueil Vermillon à trois chaînes** renfermant l’unique sursaut plein écran du site (suivi 1,25 s plus tard d’une chute humoristique sur une réunion Teams du vendredi 17 h 58), accompagné d’un générateur d’**Attestation notariée PNG (`1200×630`)** personnalisable pour LinkedIn.

## Déploiement

Le dossier `manoir-halloween/` étant 100 % statique (`index.html`, `styles.css`, `audio-synth.js`, `physics-skeletons.js`, `mansion-gags.js`), il se déploie tel quel sur **Netlify Drop**, **Vercel**, **Cloudflare Pages** ou **GitHub Pages**.
