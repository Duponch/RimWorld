# Validation du rendu — 13 septembre 2026

Cette note conserve les observations du prototype. Elle ne constitue pas un benchmark, ni une validation sur tous les navigateurs.

## Tranche matérielle : piles, portage et empreintes

Le contrôle de la tranche matérielle du **13 septembre 2026** utilise Chromium 153 normal, **WebGPU, AMD/RDNA-1**, sur la carte 64²/graine 42. Le [rapport courant](../../artifacts/render-probe.json) conserve son heure exacte, les matériaux portés, l'achèvement du mur et du lit et la liste d'erreurs vide. L'inspection montre les piles au sol, la cargaison avec la pose des bras, le lit de 1,90 m et les colonnes collecte/construction/transport dans Travail. Le modèle humain reste à 1,75 m et le mur à 2,80 m.

Les nouveaux lits ont une empreinte logique orientée **1×2** et un aperçu correspondant. Un contrôle rapproché supplémentaire, feuillage caché et après deux frames de rendu, montre les quatre orientations autour de l'ancrage et la disparition de l'aperçu hors survol : [diagnostic de placement](../../artifacts/placement-preview-probe.json). Le cadrage général rendait l'aperçu difficile à distinguer ; aucun défaut de rotation n'a été trouvé. Le script principal attend désormais deux frames avant les captures.

Les objets portés partagent les attributs de déplacement des colons et leur interpolation GPU. Le rig procédural emploie six vertex buffers et les cargaisons quatre, sous la limite de huit observée. Il n'y a pas d'évaluation squelettique CPU par personnage et par image. Cette vérification concerne des placeholders rigides de six os, sans import glTF ni charge de centaines d'acteurs.

Le parcours attend une cargaison physique puis déclenche le vrai bouton Pause dans le même callback d'observation. Après l'acquittement du worker, il exige encore une pile possédée par le porteur. Cela élimine la course du pilote qui observait un transport déjà terminé au clic suivant. Les options murs/feuillage conservent exactement le JSON du monde pausé. Les contrôles restent accessibles à 1440×1000 et 1280×720 ; l'intégration séparée couvre aussi 768×900.

Les captures PNG dans `artifacts/` sont des sorties locales ignorées par Git, régénérées par `node scripts/render-smoke.mjs` avec le serveur Vite lancé : `colony-carrying.png`, `colony-proportions.png`, `colony-bed-preview-0..3.png`, `colony-work-panel.png` et `colony-final.png`. Les captures rapprochées du contrôle ponctuel sont conservées localement dans `tmp/preview-probe/` ; son diagnostic JSON est versionné. Aucun FPS affiché dans ces captures n'est une mesure de performance contrôlée.

## Historique : échelles et interface avant la logistique

Le passage du **13 septembre 2026 à 10:34:55 UTC**, après les changements ci-dessous, a réussi dans Chromium 153 normal : **WebGPU, AMD/RDNA-1, aucune erreur console ou GPU**. La carte utilisée mesure 64², graine 42. Le script désignait réellement collecte, mur et lit, attendait leur achèvement puis l'acquittement de pause avant de comparer les états. Les options murs/feuillage ne modifiaient aucun champ du monde. Le fichier `render-probe.json` et les captures ont depuis été remplacés par le passage matériel décrit ci-dessus ; les observations qui suivent concernent cet état antérieur.

L'inspection des captures a confirmé : personnages plus bas que le mur achevé, rivière continue plus basse que la prairie, massifs solides, arbre nettement plus haut que l'humain, coupe de mur révélant le colon masqué et masquage des couronnes conservant les troncs. Le lit était encore un placeholder miniature sur une cellule ; l'empreinte orientée a été livrée dans la tranche matérielle.

L'angle initial de caméra a été relevé d'environ 35° à 58° au-dessus du sol après inspection de la forêt 64² : les arbres proches masquaient les colons. Le camp est désormais lisible au départ tout en conservant les hauteurs définies ; la caméra reste orientable. Les couvertures végétales denses peuvent encore masquer des personnages ailleurs : le contrôle Feuillage sert à les retrouver. Une occultation automatique locale reste à concevoir.

Autre correction : la surface supérieure du socle était coplanaire avec l'eau à −0,12 m. Le socle a été abaissé de 4 cm, sa surface étant désormais à −0,16 m. Les images finales ne présentent plus cette superposition. Il s'agit de corrections de présentation, sans changement de topologie ou de sauvegarde.

L'interface est examinée à 1440×1000 et 1280×720 : portraits en haut, stock à gauche, alertes à droite, onglets en bas, tableau Travail au-dessus de la barre, contrôle des priorités à l'intérieur du panneau et inspection distincte. Le parcours d'intégration logiciel vérifie également 768×900 et le défilement horizontal des onglets, sans débordement de page.

Captures finales : [proportions](../../artifacts/colony-proportions.png), [mur coupé](../../artifacts/colony-cutaway.png), [feuillage masqué](../../artifacts/colony-foliage-hidden.png), [tableau Travail](../../artifacts/colony-work-panel.png), [inspection](../../artifacts/colony-inspector.png), [vue finale](../../artifacts/colony-final.png). Aucune cadence de rendu ou capacité à des centaines d'acteurs n'est déduite de ce parcours.

## Historique des premières observations

## Environnements observés

| Exécution | Preuve observée | Portée |
|---|---|---|
| Navigateur intégré Codex, page locale `http://127.0.0.1:5173`, viewport 1280×720 | Le pied de page affichait **WebGPU** ; les logs du navigateur ont enregistré une erreur native `GPUValidationError` de création de pipeline avant sa correction. Après rechargement, terrain, trois personnages et ombres visibles ; aucune nouvelle erreur dans les logs observés après correction. | Démarrage et compilation du pipeline WebGPU observés. Aucun nom de GPU, pilote ou temps GPU n'a été relevé pendant ce passage. Ne pas déduire « GPU matériel certifié » du seul nom WebGPU. |
| Chromium headless / SwiftShader, scénario Playwright | Le passage automatisé de l'intégration utilise le repli **WebGL 2**, également indiqué dans la capture `artifacts/colony-desktop.png`. | Parcours UI, simulation/worker et rendu de repli. Un test passant ici ne démontre pas que le pipeline WebGPU compile. |
| Chromium 153, nouveau mode headless, sans adaptateur logiciel imposé, 1440×1000 puis 1280×720 | `GPUCanvasContext`, backend **WebGPU**, adaptateur communiqué `vendor: amd`, `architecture: rdna-1`, limite 8 vertex buffers. Identifiant et description du GPU non communiqués. Aucun message d'erreur lors du chargement, de la pose de travail et de l'inspection. | Contrôle graphique final via `node scripts/render-smoke.mjs`. Diagnostic exact dans `artifacts/render-probe.json`, captures `colony-final.png`, `colony-working.png`, `colony-inspector.png`. Ce passage n'est pas un benchmark. |

Les compteurs FPS affichés à ces occasions sont des diagnostics instantanés, sans chauffe, protocole ni isolation de charge. Ils ne doivent pas être présentés comme des résultats de performance.

## Défauts identifiés et correctifs

1. **Trop de buffers de sommets pour les personnages.** Le pipeline utilisait neuf buffers distincts, contre une limite de huit sur le device WebGPU observé. Position, normale, couleur, indice d'os, pivot et masque de teinte sont maintenant interleaved dans un seul buffer statique ; avec les attributs d'instances, le rig utilise cinq buffers. Le renderer affichait encore un canvas et un compteur FPS malgré cet échec : vérifier aussi les erreurs console/pipeline est nécessaire.
2. **Raccords pointillés du terrain.** La capture desktop du repli WebGL montrait des coutures de profondeur entre cases. Les boîtes avaient une largeur/profondeur de 1,005 pour un espacement de 1 ; leurs faces supérieures se chevauchaient. Elles mesurent maintenant exactement 1×1. Il n'y a donc plus d'aire de faces supérieures coplanaires superposées entre voisines.
3. **Raccourcis caméra et UI.** La caméra ignore maintenant les touches avec Ctrl, Meta ou Alt, ainsi que les saisies de formulaire et les dialogues ouverts. Les touches maintenues sont vidées pendant l'ouverture d'un dialogue. `Ctrl+S` peut ainsi sauvegarder sans être interprété comme un déplacement vers le bas.

Après les deux derniers correctifs, TypeScript et la validation générale ont passé. Une inspection supplémentaire dans Chromium, sans imposer SwiftShader, a confirmé WebGPU et l'absence de coutures pointillées sur les captures. Elle a détecté puis permis de corriger une icône manquante (404) et le chevauchement de la fiche colon avec la barre d'outils à 1280×720. Le panneau est maintenant défilable et les priorités restent accessibles ; le script vérifie leurs bornes. Le dernier passage retourne une liste d'erreurs vide. Les suites de simulation n'ont pas été relancées pour ces corrections de présentation seules.

## Relever une preuve reproductible

En développement uniquement, `ColonyRenderer` journalise `Lisière renderer diagnostics` à sa création, avec le backend, le type du contexte, le user-agent, la limite de vertex buffers et l'information d'adaptateur disponible. Cette donnée vient du device effectivement configuré sur le canvas, obtenu par `GPUCanvasContext.getConfiguration()` ; aucun second adaptateur n'est demandé. Si l'API ou le champ manque, la valeur est `null`. Rien n'est envoyé à un service distant et ce log est absent du build de production.

Ces API publiques permettent de décrire le device courant sans accéder aux propriétés internes de Three.js : [configuration du canvas](https://developer.mozilla.org/en-US/docs/Web/API/GPUCanvasContext/getConfiguration), [information du device](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/adapterInfo).

Pour les futures modifications : recharger la page, conserver le diagnostic exact, observer le terrain au zoom global puis proche, tourner la caméra, vérifier marche/travail/ombres et relever les nouvelles erreurs console depuis ce chargement. Compléter avec `Ctrl+S`, ouverture de l'aide pendant une touche caméra maintenue, perte de device et import de vrais clips lorsque ces domaines évoluent. Archiver la capture et le backend réellement constaté ; un champ matériel masqué reste « non communiqué ».

Le protocole de charge et les futures comparaisons VAT/atlas d'os/compute sont décrits dans [la recherche de rendu et performance](../research/rendering-and-performance.md).
