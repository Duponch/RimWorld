# V303 — zones, sélection et actions de carte

Les végétaux ne percent plus les zones de stockage ou de culture. Les roches, murs et constructions incompatibles restent des obstacles. Les zones adjacentes utilisent des couleurs distinctes ; l’arrêt des semis conserve la couleur du champ. Le panneau de stockage sépare ses filtres défilants de son titre et de ses commandes.

Choisir un outil ferme maintenant Architecte dans toutes les catégories, en gardant le mode choisi. Un clic droit sur le panneau ferme également son interface. Les gestes sur la carte conservent le comportement V302 : clic bref sortant, maintien pour la caméra et annulation d’un tracé gauche/droit.

Le double clic sélectionne les objets du même type visibles à l’écran, avec une limite de 200 et un contour par objet. Maj ajoute au groupe. Matière, qualité, résistance et rotation ne divisent pas le groupe ; meubles posés et emballés au sol partagent leur type intérieur. Les propriétaires porteurs, ateliers et vaisseaux restent exclus. Animaux sauvages et domestiques restent des groupes distincts. Une cible disparue retire seulement ce membre du groupe.

Les massifs rocheux proposent « Miner », les fragments au sol proposent leur transport. Les plantes, constructions et ordres conservent leurs actions spécialisées ; l’annulation vérifie l’intention réellement résolue par la commande à coordonnées. Les actions groupées transmettent les commandes ordinaires, chacune revalidée par le moteur ; elles ne constituent pas une transaction globale.

Les boutons d’un groupe sont revalidés à chaque nouvelle adoption, y compris si seul un membre secondaire change. Leurs lectures d’objets sont partagées pendant cet appel ; les rafraîchissements sur le même monde ne reconstruisent pas le groupe. Un meuble emballé lié à une installation conserve son annulation depuis la pile source.

Les marqueurs ajoutés couvrent transport des fragments, déconstruction, désinstallation, retrait de sol et intentions de toiture. Ils utilisent trois atlas existants dans un seul dessin instancié. Les buffers ne sont publiés qu’en cas de changement ; les permissions de transport et toitures sont détectées à l’adoption, sans parcours supplémentaire dans la boucle RAF. Les plans de construction conservent leurs fantômes. Aucun coût nul de shader ou gain FPS n’est présumé.

## Référence et limites

Référence primaire : Core installé 1.6.4871 rev590, DLL SHA `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, [baseline](../research/core-reference-baseline.md). `ThingDef.CanOverlapZones` exempte les plantes ; `Designator_ZoneAdd_Growing` exige une fertilité minimale de .7 pour le sol Core sans DLC. Les empreintes des constructions, plans et cadres conservent leurs exclusions. Aucun végétal n’est supprimé lors du tracé.

`Selector.SelectAllMatchingObjectUnderMouseOnScreen` utilise l’écran, sans rayon circulaire, et `MaxNumSelected` vaut 200 dans ce Core. La comparaison porte sur le type intérieur et la faction. Les anciens témoignages de plafond 80 ne déterminent pas cette version. Les exceptions Unity de dessin des piles en bordure et son ordre interne de Things ne sont pas reproduits à l’identique par la caméra 3D.

Deux adaptations explicitement demandées : Core ne garantit pas des couleurs différentes entre voisins, et ses définitions excluent certains arbres, rochers et murs du double clic. Elsewhere distingue les voisins et admet ces éléments. Les emplois locaux sélectionnables n’ont pas tous une ThingDef Core. Ces extensions ne sont pas présentées comme une parité entière.

Les références et extractions locales sont conservées sous `tmp/zones-v303/current-core` et `tmp/interactions-v303/core`, avec leurs commandes et empreintes. [Miroir de ThingDef](https://raw.githubusercontent.com/Chillu1/RimWorldDecompiled/master/Verse/ThingDef.cs), [discussion des contrôles](https://ludeon.com/forums/index.php?topic=26222.0) et [archive historique](https://ludeon.com/forums/index.php?topic=28475.0) corroborent le contexte ; les classes installées priment pour les règles et nombres actuels.

Schéma 219 conservé, sans nouvelle donnée persistée ni tirage RNG. Les lecteurs des anciennes versions gardent leurs refus historiques. Les 63 références et 66 fichiers publics sont préservés ; aucune régénération des Aulnes.

Limite historique hors de ces corrections : l’altitude d’une icône d’abattage peut garder la taille antérieure d’un arbre encore en croissance jusqu’au prochain changement d’intention. V303 n’ajoute pas de recensement de croissance par adoption pour ce cas.

## Validation

68 cas uniques dans 14 fichiers acquis par contrôles groupés et reprises ciblées. Premier groupe : 60/65, 19,338 s ; reprise thermique finale des huit cas de zones : PASS6,952s. Les rouges intermédiaires sont conservés : plantes d’espèces injectées dans un camp sans état de biome, sérialiseur courant utilisé à tort pour un monde218, puis facteur thermique non initialisé dans les fixtures. Seules les données/oracles de ces tests ont été corrigées. La relecture finale corrige les deux régressions d’actions décrites ci-dessus ; les dix cas d’actions, dont trois ajoutés, passent en4,744s.

Corpus public : PASS82,964s, `tmp/interactions-v303/public-controls/public-context-check-WldxII/report.json`. 63 fichiers de partie, ancienne vue RAW/MAIN, checkpoint, delta et un tick ordinaire indépendant puis recharge identiques ; census66 exact. Les changements produit suivants concernent la priorité visuelle des colons libres et les actions de l’inspecteur, sans changement moteur ou lecteur.

Build Pages final avec typage : PASS8,110s ; le build antérieur PASS8,526s reste conservé. Aucune nouvelle mesure de performances ni campagne longue n’est revendiquée.

Huit groupes Chrome matériel WebGPU acquis par parcours puis reprise ciblée. `tmp/interactions-v303/native-ghost/run-gfiYB3/report.json` (SHA6AAD991F, gel2B6F4C70) acquiert les sept groupes des Aulnes : fermeture des neuf catégories par choix ou clic droit, fantômes et rotation, quatre familles au double clic et leurs contours F32, plafond200 réellement atteint, huit désignations de minage, trois atlas dans le WGSL construit, zone sur herbe et panneau avec29 branches dépliées en1440p/1080p. Les captures de stockage et de contours ont été inspectées. Recharge8434 exacte, puis deux ticks ordinaires jusqu’à8436. Le champ créé près du stockage ne constitue pas à lui seul un oracle d’adjacence ; les quatre cas de couleurs couvrent celle-ci.

Ce parcours reste **FAIL70,152s** sur la lecture trop précoce des marqueurs du dernier groupe, après ses commandes. La reprise distincte attend l’identité de la scène réellement appliquée, puis contrôle seulement ce groupe : `tmp/interactions-v303/native-haul-current/run-1isidA/report.json` (SHAB28A74C2, gel70A78FD4), **PASS28,590s**. La référence publique `family-v214` fournit18 fragments réels absents des Aulnes : double clic, aperçu,18 permissions de transport et18 marqueurs, puis sauvegarde/recharge au tick0 exacts. Aucun transport jusqu’à une réserve n’est revendiqué. Les instances et programmes observés ne sont pas une lecture GPU ni une égalité universelle de pixels.

Sources/publics exacts et erreurs vides dans les deux parcours ; Chrome et les ports5356/5358 possédés sont fermés. Les rouges antérieurs restent intacts : typage du pilote supposant `Tile.roof`, imports Node sans extension, fixture de fragments absente, et oracle d’icône de toiture alors que le fantôme physique V285 est volontairement conservé. Aucun produit changé pour ces erreurs du pilote ; les gels non exécutés sont distingués des rapports acquis.

Publication Cloudflare demandée après cette validation ; ses preuves sont enregistrées dans [la procédure Pages](../development/cloudflare-pages.md). Relance planifiée en pause, aucun lot suivant engagé.
