# Mettre les matières sensibles à l’abri — V396

Qualifié le 16 octobre 2026, schéma 252 ; publication regroupée V395–V396 suivante, dernière production V394/eefe3715. Le joueur peut préserver les mêmes matières en les transportant vers une pièce couverte ou une étagère existante. Les réserves au sol exposé perdent progressivement leurs PV ; la dernière perte détruit la pile entière une seule fois. Les nouvelles inspections expliquent l’exposition et le taux moyen, sans nouvelle alerte ni automatisation.

Le périmètre est fermé à dix matières : bois, tissu, laine de mufalo, cinq cuirs locaux, composants et composants avancés. Acquisition et production restent celles du catalogue existant : les biens finis sont transportés, rangés puis consommés par les recettes ordinaires avec leurs PV conservés. Aucun objet nouveau, stock offert ou mise à jour de la colonie publique des Aulnes. Métaux et blocs restent hors de cette usure ; aliments, médicaments, biocarburant, vêtements/armes finis, paquets, dépouilles, plantes minifiées et inventaires hors carte ne sont pas couverts.

## Règles vérifiées et adaptation locale

Relevé primaire ciblé du 16 octobre 2026 : Core 1.6.4871 rev590, Assembly-CSharp SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Définitions résolues de ces dix matières, SteadyEnvironmentEffects, StatPart_EnvironmentalEffects, Room et règles de division/fusion relus dans les sources privées. La [protection par étagère V320](../research/shelves-core-v320.md) est réutilisée. Aucun code ou asset propriétaire n’entre au produit.

| Matière | PV existants | Taux de base moyen en PV/jour |
| --- | ---: | ---: |
| Bois | 150 | 0,5 |
| Tissu | 80 | 4 |
| Laine de mufalo | 90 | 3,4 |
| Cuir léger, cuir ordinaire, fourrure bleue, cuir de chameau, fourrure de renard | 60 | 2 |
| Composants et composants avancés | 70 | 2 |

Le facteur environnemental est la somme de 0,5 sans toit, 0,5 si la cellule utilise la température extérieure, et 3 sur terrain humide nu. La pluie multiplie cette somme par `1 + 4 × RainRate` uniquement sans toit. L’intérieur thermique provient des régions existantes : bord de carte ou au moins 25 % de trous de toit restent extérieurs. Un auvent extérieur conserve donc la moitié du taux sec, sans supplément pluie ; une pièce intérieure couverte sèche est à zéro. Sur marais nu, son terme 3 demeure même dans une pièce. Un pont fini ou un sol construit supprime ce terme ; une étagère installée annule tout le taux. Une réservation au sol ne protège pas. Cette protection ne supprime ni feu ni pourriture.

La correspondance du marais local au terrain humide Core et le terme 3 sont issus de la fermeture primaire complémentaire revue par ROOT ; le marais hérite de WaterBase via WaterShallowBase. Le terrain local `water` partage ce terme, sans rendre cette cellule nouvellement accessible ni stockable.

La cadence est une **adaptation** : toutes les 25 ticks locaux réellement simulés, chaque pile sensible encore au sol reçoit au plus un dommage de 1 PV avec probabilité `tauxFinal × 25 / 6000`. Le maximum de cette tranche est 1/3 pour le tissu sous pluie complète sur marais nu. Core échantillonne des cellules en ordre aléatoire fixe, à `ceil(surface × 0,0006)` cellules par tick Core et probabilité `tauxFinal / 36` par visite ; le nombre de visites dépend de la surface. Le moteur conserve les taux moyens visés et le principe stochastique, sans reproduire ce balayage ni sa distribution exacte. 25 ticks locaux représentent 250 Core dans l’horloge existante ; ce n’est pas une cadence d’objet Core vérifiée. ToxicFallout×3 est différé avec l’incident absent.

[Le concept officiel Deterioration](https://github.com/Ludeon/RimWorld-ChineseSimplified/blob/master/Core/DefInjected/ConceptDef/Concepts_NotedSelfshow.xml) et [l’annonce officielle des étagères 1.4](https://store.steampowered.com/news/posts/?appids=294100&enddate=1665179782&feed=steam_community_announcements) corroborent l’intérêt de l’abri et des étagères ; ils ne fixent pas les taux 1.6. Les tentatives visuelles Steam/Ludeon n’ont exposé aucun nouveau pixel de gameplay exploitable : aucune qualification de l’UX Vanilla actuelle n’est revendiquée. Les forums anciens contradictoires et règles de mods ne sont pas adoptés.

Corpus utilisateur, chapitres 10–11, SYS/TEST-051..061 : adopter propriétaires réels, stockage filtré, PV, division et fusion existants ; adapter cadence/PRNG et diagnostic local ; différer couverture environnementale exhaustive et inventaires hors carte. Les originaux et leurs identifiants restent inchangés ; aucune entrée globale n’est close par ce lot.

## Continuation et coûts

L’état map-local `deterioration` contient seulement revision1, RNG privé non nul et dernier tick. Le moteur le visite chaque vrai tick des deux cartes, ne rattrape aucun temps historique et ne tire pas dans le RNG principal. La migration valide strictement les deux cartes 251 avant d’introduire les seuls calendriers futurs 252 à la date confirmée ; aucun dommage, bien, ID, tâche ou progrès rétroactif. Les formes historiques contenant un champ futur sont refusées avant migration ; sauvegardes RAW, checkpoints, deltas et Decoder suivent cette frontière.

Division et fusion conservent les règles de PV déjà livrées : copie entière à la division, moyenne pondérée avec PV survivants arrondis vers le haut à la fusion. Transporter ne répare pas. La destruction préflight le ledger neutre et retire la source avant libération ; elle conserve les autres cargaisons engagées en arête jusqu’à leur vrai dépôt, sans FireLedger ni remboursement.

La passe rare collecte les références initiales en ordre inverse, vérifie chaque identité et réutilise l’index de pile quand il est encore valable ; un déplacement des autres piles a un fallback. Les objets libérés pendant une destruction ne sont pas visités à nouveau dans cette passe. Une seule table temporaire des empreintes d’étagères est créée quand il y a des candidats ; le layout thermique fourni est réutilisé, sans nouvelle inondation, index maintenu, recherche de chemin, scan RAF ou lot graphique.

## Qualification et limites

ROOT a acquis 114 cas distincts dans 11 fichiers par reprises, dont 19 nouveaux : 84 verts lors du groupe initial de111, puis61 verts sur les six fichiers affectés/couplés. Les rouges sont conservés : calendriers des fixtures décalées à midi non ancrés, permissions futures dans un témoin historique, et véritable cache de contexte secondaire périmé après migration. Ce dernier est corrigé : la lecture de validation ne crée plus de contexte runtime, tout en conservant l’autorité des tableaux vivants avant flush ; trois régressions couvrent contexte froid, migration des deux cartes et contexte vivant/RNG invalide. Aucun validateur assoupli.

Le corpus public de66 sauvegardes passe en113,332s : empreintes historiques, validation, aller-retour complet et Decoder, sans simulation de campagne. Typages14,401/15,796/13,195s. Présentation Chrome133,476s après deux rouges de préparation conservés : lancement réseau refusé en sandbox puis calendrier absent de la scène initiale midi ; seul cet ancrage de fixture est corrigé. Le microbanc a d’abord refusé un import auxiliaire inexistant, corrigé vers le module de chargement existant.

Le parcours Chrome/WebGPU passe en54,063s sur scène32² préparée honnêtement avec dix tissus et une étagère finie. Tick3001 : source183 perd1PV ;3010 : vraie cargaison186 de10 portée, source retirée ; export/réimport UI exact au3010 avant arrivée ; dépôt3031 puis deux vérifications ordinaires jusqu’au3076. Les mêmes10 tissus restent à79/80PV, taux0 sur étagère ; aucun tirage supplémentaire ni réparation. Trois captures inspectées ROOT, erreurs[], aucun incident graphique/simulation. Le stock et la phase initiale24/25/RNG1 sont déclarés avant import, aucune acquisition naturelle ou usure accélérée prétendue.

Mesure CPU du chemin rare complet, Ryzen5 3600/Windows/Node24.11.1, Aulnes250² au10733 :382 piles/34 candidates,0,195–0,513ms, médiane0,384ms. Témoin sans candidate :0,074–0,099ms, médiane0,091ms ; stress artificiel10000 candidates :3,649–6,415ms, médiane4,592ms. Cinq appels frais après un échauffement, GC non contrôlé ; clonage/préparation/validation/layout thermique existant exclus. Ce n’est ni un FPS, ni un temps GPU, ni un débit général×6. Aucun banc global inchangé ou longue campagne rejoué.

Sources servies, tests, entrées et pilotes : `tmp/deterioration-v396/freeze05.json`,3441 chemins exacts avant/après natif ; rapports sous `tmp/validation-runs`, natif sous `tmp/deterioration-v396/native-01`, mesure `cost.json`. Les archives et les Aulnes courantes restent immuables. Le prochain parcours humain des Aulnes est distinct de cette scène de qualification. Build, documentation et publication sont consignés après exécution dans la clôture ci-dessous.

Clôture locale : Pages3,136s, contrôle documentaire12,336s, diff sans erreur. Publication V395–V396 regroupée après commit produit ; les résultats distants restent à confirmer.
