# Validation courante — V47

17 septembre 2026. [Traitements et repos médical](tending.md), [références vérifiées](../research/tending-reference.md). Preuves V46 [archivées](../history/validation-rescue-v46.md). Les scénarios suivants ne constituent pas une garantie exhaustive ni une promesse de fluidité parfaite.

## Simulation et continuation

**Contrôle final : 173 scénarios sur 173 passent en 55,7 s**, après correction de la génération et des relations médicales : [rapport](../../artifacts/core-care-final-v47.json). Le seul scénario exclu est le pilote long déjà exécuté plus tôt dans ce lot, décrit ci-dessous. Compilation finale réussie, puis parcours UI médical repassé en 18,3 s. La suite d'intégration complète n'a pas été rejouée ; les parcours choisis couvrent soins, charge, partie de trois jours et chronologie minage/abattage.

Le [premier passage global](../../artifacts/core-care-v47.json) contient 174 scénarios. Le pilote sur trois graines 250² pendant cinq jours, huit jours sur la graine 42, passe en 141,4 s. Ce passage échoue toutefois sur des fixtures anciennes contenant les nouveaux champs et sur la migration V42→43 qui injectait Médecine trop tôt via le helper partagé. L'étape intermédiaire reste maintenant limitée à Construction, avec validation stricte avant V47. Les fixtures historiques sont corrigées sans assouplir leur validateur.

Le [passage regroupé suivant](../../artifacts/care-regression-v47.json), hors ce long pilote, passe 172 des 173 scénarios en 51,4 s. Son seul échec vient d'un nouveau test d'accès qui plaçait une roche sous le médecin déjà arrivé : fixture invalide, corrigée pour fermer le chevet pendant l'approche. Les [cinq scénarios médicaux](../../artifacts/care-final-v47.json) passent ensuite. Ces comptes se recouvrent ; ils ne sont pas additionnés comme des tests uniques.

Les [essais initiaux](../../artifacts/care-first-v47.json), [ciblés](../../artifacts/care-targeted-v47.json) et [migrations](../../artifacts/care-migrations-v47.json) restent conservés. Deux erreurs de délai ont d'abord disparu au [contrôle isolé](../../artifacts/care-final-targeted-v47.json), puis récidivé lors de la [relecture](../../artifacts/care-review-v47.json). Le diagnostic a isolé une contamination des nombres initiaux entre créations sous le runtime Node/V8 local ; [reproduction et correctif](starting-pawns.md). La fabrique indépendante remplace le littéral dans le parcours chaud de génération, sans modifier les règles ou la validation. La reproduction directe passe soixante générations après correction ; les [24 contrôles médicaux/construction](../../artifacts/care-review-final-v47.json) passent aussi. Un passage sans optimisation avait passé sans suffire à résoudre le problème : [trace](../../artifacts/care-generation-no-opt-v47.json).

Les cas croisent qualité additive/plafond, XP seulement à l'achèvement, deux médecins/un patient, lit réellement rejoint, repos/sommeil, faim active, fermeture du chevet, politique/rôle du lit, interruption, perte des mains, mort, amputations, durée capturée, sauvegarde, snapshots et rejet de relations corrompues. Le coucher d'un blessé utilise le choix médical au lieu d'un repli artificiel au sol. Devenir incapable dans un lit déjà utilisé conserve ce service indépendamment du métier Patient, y compris après le dernier soin ; aucune seconde opération de secours inutile. Une sauvegarde de repos médical sans affection admissible ou de chevet solide est rejetée.

## Partie et gestes natifs

Chromium natif WebGPU, AMD RDNA 1, Ryzen 5 3600, Windows 11 10.0.26200, viewport 1440×1000. Le parcours médical utilise Travail, politique de soin, clic droit, pauses/vitesses et sauvegarde pendant traitement. Il vérifie les vrais attributs GPU, le face-à-face, le chevet cardinal et la personne allongée sur l'horloge de présentation. [Rapport final](../../artifacts/care-ui-v47.json) : 722 observations de soin, deux plaies traitées, qualités 47,5 % / 48,2 %, 175 XP nettes sans passion et aucune erreur. Les captures au chevet et du patient traité sont inspectées ; affichage arrondi, dossier en millièmes.

Le parcours médical et le banc natif passent ensemble en 52,1 s. Le [parcours de trois jours](../../artifacts/care-colony-v47.json) passe en 374 s ; [bilan métier complet](../../artifacts/care-colony-gameplay-v47.json), stocks entretenus, camp équipé, bois conservé, nourriture réconciliée et aucune erreur. Les gros corps encodés des checkpoints horaires sont retirés du rapport compact, pas les résultats métier. Ce camp sûr n'injecte pas de blessure : il vérifie les anciennes boucles ; les soins sont exercés dans les scénarios dédiés.

## Charge CPU séparée

`npm run test:presentation` passe : 45 s de minage puis 45 s d'abattage naturels, trois colons sur 250², changements 1×/6×/3× toutes les deux secondes. Aucun saut, aucune occupation solide et aucune famine du tampon ; intervalle image p95 4,3 ms dans les deux cas, maxima 12,6 / 16,7 ms. [Rapport complet](../../artifacts/care-presentation-v47.json). Ce passage précède les derniers contrôles du lit après incapacité et l'extraction de la création des colons, qui ne changent pas le chemin de déplacement minage/abattage.

Node 24.11.1, même Ryzen/Windows. `scripts/rescue-bench.ts --care` : carte dégagée 250², 800 ticks, 1/15/50 couples médecin/patient avec deux lésions chacun. Résultats, validité et continuation exacte contrôlés hors chronométrage. [Mesures](../../artifacts/care-cpu-v47.json).

| Acteurs / patients traités | Tick p50 / p95 | p99 / maximum | Clone intégral p95 |
|---|---|---|---|
| 2 / 1 | 0,044 / 0,217 ms | 1,493 / 9,916 ms | 72,47 ms |
| 30 / 15 | 0,328 / 1,122 ms | 5,601 / 22,086 ms | 52,05 ms |
| 100 / 50 | 1,701 / 4,575 ms | 12,100 / 29,537 ms | 50,18 ms |

Le libellé `scope` initial réutilise celui des secours ; le mode lancé est bien `--care`, 800 ticks et 136 ticks travaillés par médecin. `rescued` signifie ici patients entièrement traités, `carryTicks` ticks de soin. Le script porte désormais un libellé distinct pour les prochaines mesures ; les nombres originaux restent inchangés. Le clone intégral de 62 500 cellules n'est pas un message différentiel du worker. Un passage par combinaison ; aucun FPS déduit de ces temps CPU.

## Charge graphique et poses

Même matériel, vrai worker en 6×, 90 images d'échauffement, carte dégagée 250². `CARE_LOAD=1` active les traitements dans le banc médical partagé. [Rapport](../../artifacts/care-native-v47.json).

| Acteurs / patients traités | Intervalle image p50 / p95 / p99 / max | CPU image p95 | Draw calls max | Observations au chevet |
|---|---|---|---|---|
| 2 / 1 | 4,2 / 4,3 / 8,3 / 12,4 ms | 4,5 ms | 120 | 544 |
| 30 / 15 | 4,2 / 4,3 / 8,5 / 12,5 ms | 4,8 ms | 122 | 7 929 |
| 100 / 50 | 4,2 / 8,4 / 20,9 / 37,5 ms | 5,4 ms | 122 | 23 681 |

Aucune pose invalide détectée, géométrie stable, aucune erreur JS/GPU et zéro pipeline créé pendant mesure. `carriedFrames` désigne ici les observations au chevet, pas des corps portés. Les pointes restent présentes à cent acteurs ; cet essai court ne prouve pas une forêt chargée, un combat ou une colonie de cent personnes entretenue plusieurs jours. Temps GPU direct et origine exacte de chaque pointe non mesurés.

## Périmètre

TypeScript et Vite compilent le lot ; avertissement habituel de taille du chunk graphique. Documentation, guide, inventaire et catalogue distinguent actions médicales et nouveaux objets : aucun médicament ajouté. Originaux du corpus préservés. V47 valide strictement V46 avant migration sans inventer patient, blessure ou expérience passée.

Alimentation assistée, médicaments, auto-soin, files médicales, préemption générale d'urgence, complications et chirurgie restent absents. Équipement/combat et social restent les prochains grands systèmes après la chaîne médicale élémentaire. Aucun jalon G0–G5 n'est déclaré terminé.
