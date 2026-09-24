# Validation des interactions V99

25 septembre 2026, mode jour. Référence : [Core 1.6.4871](../research/interaction-reference-v99.md). [Contrat et limites](../development/interaction-feedback.md). Schéma 91, scénario, catalogue et règles de simulation conservés.

## Produit livré

Sélection des animaux depuis leur position réellement rendue, anneau de sélection, dossier Info/Santé, désignation de chasse ; double clic par groupe équivalent visible et rectangle priorisant les colons. Boutons de mobilisation sans chevauchement, R, déplacement au clic droit et choix d’attaque sur animal/hostile, avec filtrage explicite des membres incapables. Chemin restant réel et barres sur les travaux dont la progression est mesurable.

Le trait bleu et l’ancrage des barres au-dessus du colon sont des adaptations demandées : Core utilise une ligne blanche et souvent une barre sur la cible du travail. Social/Journal animaux, groupes de piles/bâtiments et file d’attaques restent absents ou partiels. Aucun de ces absents n’est simulé par une donnée fictive.

## Validation regroupée

- **25 contrôles passent dans sept fichiers** : `selection-v99`, `action-feedback-v99`, `animal-inspector-v99`, `drafting-ui-v99`, `drafting`, `colonist-inspector`, `farming-context`. Puis six contrôles directement touchés rejoués après le masquage initial des lots vides. Typage et build final passent ; avertissement historique de taille des bundles conservé.
- **Neuf contrôles natifs passent**, Chromium matériel, fenêtre 1440×1000, sources servies gelées, aucune erreur console/GPU. [Rapport](../../artifacts/interaction-native-v99.json), [pilote reproductible](../../scripts/interaction-native-v99.mjs). Animal/Santé/chasse, double clic, rectangle/Maj, bouton/R et absence de chevauchement, chemin confirmé, attaque contextuelle réelle, perspective, animal en mouvement, vrai abattage/pause/dézoom.
- Le travail n’a pas été raccourci pour faire apparaître une barre ; le pilote observe le vrai compteur. La sauvegarde des situations préparées est strictement validée avant chargement. Le chemin partage les attributs de trajet et l’horloge du personnage ; aucune nouvelle recherche de chemin pour le dessin.
- Trois défauts de **pilote** conservés : [profil et échéance animale invalides](../../artifacts/interaction-native-v99-initial-fixture-failure.json), [observateur de chasse avant réponse](../../artifacts/interaction-native-v99-observer-failure.json), [mesure avant confirmation/adoption de la pause](../../artifacts/interaction-native-v99-pause-observer-failure.json). Le premier a été corrigé en utilisant le profil réel approprié ; les autres attendent l’état confirmé. Aucune assertion métier supprimée.
- Aucune campagne de plusieurs jours : ce lot modifie l’accès et la présentation de règles existantes. Les campagnes historiques ne sont pas réattribuées à V99.

## Coût mesuré et limites

Ryzen 5 3600, Chromium matériel WebGPU, 1920×1080. Même sauvegarde publique V98 `mixed-100` (104 personnes dont deux morts), mêmes mouvements continus de caméra, détail graphique inchangé. Source V98 archivée depuis `d5cb6f7`. CPU, natif et autres validations successifs. Fenêtres initiales de huit secondes après trois secondes de chauffe, répétitions et final de douze secondes. Ce sont des observations courtes, pas une garantie universelle ni une comparaison à quantité exacte de ticks achevés.

| Passe | Vue / vitesse demandée | FPS moyens | Image p95 ms | Débit obtenu |
|---|---|---:|---:|---:|
| v99-baseline-v98 | near / ×0 | 195.7 | 8.4 | 0.00× |
| v99-baseline-v98 | near / ×6 | 95.6 | 29.1 | 2.45× |
| v99-baseline-v98 | far / ×6 | 109.4 | 25.0 | 2.37× |
| v99-current | near / ×0 | 200.2 | 8.4 | 0.00× |
| v99-current | near / ×6 | 92.6 | 29.2 | 2.16× |
| v99-current | far / ×6 | 130.5 | 20.9 | 2.56× |
| v99-current-repeat | near / ×6 | 78.1 | 29.2 | 2.41× |
| v99-baseline-v98-repeat | near / ×6 | 84.9 | 29.1 | 2.52× |
| v99-final | near / ×0 | 176.0 | 8.4 | 0.00× |
| v99-final | near / ×6 | 77.0 | 29.2 | 2.27× |
| v99-final | far / ×6 | 112.3 | 24.9 | 2.64× |
| v99-release | near / ×6 | 94.1 | 29.2 | 2.93× |

Les résultats fluctuent : la dernière vue proche est à **94,1 FPS, p95 29,2 ms**, contre 84,9–95,6 FPS et p95 29,1 ms dans les deux mesures V98 ; d’autres passages V99 sont plus lents. Aucun gain causal de FPS ni coût strictement nul n’est revendiqué. Le rendu global et le worker restent bien en dessous de 240 FPS et de 6× sur cette charge ; la dernière fenêtre livre 2,93×.

Le diagnostic a trouvé la reconstruction d’un index de toutes les ressources pour les compteurs : remplacée par une capture des seules cibles nécessaires, sans changer l’oracle de durée (`jobDuration` garde son comportement par défaut). Le coût moyen mesuré de `ActionFeedbackLayer.update` passe d’environ **1,00 à 0,54 ms par instantané** ; dernier p95 1,10 ms, maximum 1,60 ms. Ces valeurs ne sont pas un coût à chaque image ni un timestamp GPU. La synchronisation sans chemin coûte environ 0,0013 ms/image dans cette instrumentation. Les barres visibles demandent un lot ; les chemins sélectionnés un second, vides masqués. Les zones cliquables animales sont calculées seulement lors d’un geste, sans nouvelle boucle de projection permanente.

Rapports successifs : [v99-baseline-v98](../../artifacts/performance-v99-baseline-v98.json), [v99-current](../../artifacts/performance-v99-current.json), [v99-current-repeat](../../artifacts/performance-v99-current-repeat.json), [v99-baseline-v98-repeat](../../artifacts/performance-v99-baseline-v98-repeat.json), [v99-final](../../artifacts/performance-v99-final.json), [v99-release](../../artifacts/performance-v99-release.json). `v99-current-repeat` précède la réduction d’indexation ; `v99-final` précède seulement les dernières sorties anticipées des lots vides ; `v99-release` correspond aux sources livrées. La vitesse d’évolution de la simulation et les variations de charge interdisent de confondre ces valeurs avec une garantie de performance.

## Publication et jalons

Netlify : déploiement `6ab5a08e252bef16783b20b9`, [site public](https://lisiere-duponch.netlify.app). Le contrôle public vérifie le bundle exact, le chargement d’une colonie V98, le dossier Santé animal et bouton/R, sans export de debug de production ; [rapport public réussi](../../artifacts/interaction-public-v99.json), bundle `game-BthzO7GC.js`, aucune erreur console/GPU.

G0 en consolidation ; G1, G2, G3 partiels ; G4 engagé ; G5 absent. Aucun jalon global clos ni estimation fonctionnelle augmentée pour ces corrections. Recherche, implémentation et validation sont distinguées ; aucune estimation de temps restant dérivée des mesures. ROADMAP garde seule les priorités.
