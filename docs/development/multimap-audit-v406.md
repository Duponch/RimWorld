# Audit voyages, cartes et eau — V406

16 octobre 2026, produit lu `ab0f5725` (V404), schéma 254 inchangé. **Audit et consolidation QA, aucune nouvelle mécanique. Le chantier de fidélité multicarte/voyages au Core reste ouvert.** Dernière production V403/e24c5731 ; V404 est poussé mais non publié. V405, table3×3, reste figée en préparation privée et en attente de cette priorité humaine.

## Verdict fonctionnel

Elsewhere possède une boucle réelle de voyage et un avant-poste persistant, pas le système complet de caravanes et d’implantations du Core. « Qualifié V377/V401 » désigne le périmètre de ces tranches, pas une parité exhaustive du domaine. Le globe et les cartes locales sont séparés dans les deux jeux ; le terrain continu entre bords n’est pas prévu.

| Frontière | Core 1.6.4871 vérifié | Elsewhere actuel |
| --- | --- | --- |
| Implantations | Une par défaut, réglage1–5 ; ce plafond ne compte pas toutes les cartes tactiques. | Un foyer et un seul second site durable ; structure persistante singulière, aucun réglage1–5. |
| Carte vide et abandon | Une colonie reste même vide ; Abandon est une action distincte qui retire sa carte. | Le second site reste et évolue après départ ; aucun abandon/conversion en camp ou colonie. |
| Caravanes | Plusieurs, division/fusion, personnes/animaux/biens et route mondiale. | Un groupe collectif de1–8 humains ; anciens voyages individuels séparés. Pas animaux de bât, division/fusion ou groupes simultanés. |
| Territoires | Cartes générées pour implantations, camps, rencontres et sites selon leurs conditions ; pas toutes les tuiles chargées. | Terrain neuf lié à la tuile à la première entrée, même carte à la revisite ; pas troisième carte ni camp/rencontre tactique général. |
| Destinations | Océan/lac mondiaux non implantables pour cette boucle ; montagne ordinaire distincte du relief infranchissable. | Océan refusé ; toute destination `mountainous` est refusée à l’entrée locale. Une route possible n’annonce donc pas toujours une carte exploitable. |
| Retour | Formation, chargement, sortie, route et entrée ; choix multiples selon contexte. | Retour de tous les survivants de la visite ensemble, destination foyer imposée. Secours/évacuation et détachement de résidents incomplets. |
| Fret et vivres | Catalogue et animaux sélectionnables sous leurs règles ; besoins/âge/charge continuent. | Sources collectives bornées : rations/pemmican, argent, tissu/laine, bois/acier. Le minimum0,9nutrition/membre n’est pas une autonomie prévue. |
| Hors vue | Cartes actives et caravanes continuent ; certaines cadences hors caméra peuvent être réduites. | Deux moteurs locaux sur un même tick et une autorité commune ; seule la carte regardée est présentée. Alertes et pause couvrent les familles livrées, pas toute situation dangereuse. |
| Sauvegarde | Liste des cartes actives et monde/objets/personnes, avec carte courante. | World complet avec les deux cartes et groupe hors carte ; une projection de vue n’est jamais utilisée comme export. |
| Menus | Monde, formation/contextes caravane, onglets, division/installation, Jump to… et repères de cartes actives. | Panneau Monde propre, sélection/quantités/masse, entrée/bascule, manifeste et alertes navigables. Ni inventaire universel, ni commandes absentes, ni tous les parcours/pixels Core reproduits. |

Raccords lus : `secondary-site.ts`, `secondary-site-state.ts`, `secondary-site-context.ts`, `secondary-site-save.ts`, `engine.ts:859–874`, producteurs/consommateurs de groupe, `group-panel.ts`, `planet-view.ts`, GameSession et sérialisation worker. Aucune perte, téléportation ou faux dépôt certain nouveau trouvé dans cette revue bornée. La limite de deux cartes est architecturale dans le produit, pas une limite Vanilla à expliquer au joueur.

## Eau, générateur et Les Aulnes

Core4871 associe caractéristiques mondiales et génération locale : biome, relief, côtes, rivières, mutateurs et patchs de terrain. Les définitions de forêt tempérée contiennent aussi des poches humides : fréquence0,015, bandes terre riche/boue, puis eau peu profonde à partir de0,93. Le boréal emploie mousse/marais puis eau à0,76 ; la toundra mousse puis marais à0,83. Ces seuils ne sont ni des pourcentages ni une garantie d’eau dans chaque carte. Relevé direct `Biomes_Temperate.xml:98–120`, SHA2564d6a48e5f6f0b5eed5f239077a1af78cadd8924785d76bdde2329da137dbc7ae ; source propriétaire gardée privée.

Le générateur Elsewhere ne reproduit pas encore cette géographie complète : étangs prospectifs seulement boréaux, marais seulement toundra, `river:none`, bruit et ordre des couches originaux, franges incomplètes, océans/côtes/rivières non matérialisés localement. L’ancien terrain `water` infranchissable demeure distinct de `water-shallow`. Le pont standard payé conserve le terrain sous-jacent et fournit Light sur marais/eau peu profonde ; aucun pont universel sur eau profonde, ni pont lourd Odyssey. Voir [V403](../gameplay/shallow-water-v403.md), [V385](../research/marsh-core-v385.md) et [V387](../research/bridge-core-v387.md).

Lecture directe du RAW public AulnesV394/tick10733 : forêt tempérée, petites collines, aucune rivière,62500cellules : roche2226, pierre rugueuse4011, gravier4270, herbe49985, terre riche2008 ; **zéro eau ou marais**. RAW SHA19bd59c90dfbae4983d04cb6eae95a2eb728cd61b59b19172c37366e7704be47, fichier compressé da5c4e94508aa0d9df43e98bc3af1d6713d574dd0e906aa0ada91254344478c2. Sa conservation littérale est normale et aucune eau n’est ajoutée rétroactivement. En revanche, l’absence totale de génération d’étangs tempérés dans le produit est une omission réelle ; cette sauvegarde ne prouve pas une parité du générateur.

## Vérifications ROOT de l’existant

Le seul vrai dernier état joué de la branche V397 reste21483/SHA9758f629ebdf902a97414c22f7d52d86d807df92a366721db6a7a053cea6713f. Test de lecture seule **PASS16,133s** : migration252→254, validation des deux cartes, projections/Encoder/Decoder foyer puis site, sauvegardes/recharges complètes exactes. Seule la sélection volontaire de vue varie, puis est restaurée ; zéro tick joué, RNG/personnes/biens inchangés. Les trois résidents restent à terre, Tao et sa cargaison engagée restent sur site. Ce contrôle ne soigne ni ne rejoue la campagne et ne revendique pas une nouvelle recharge UI. Rapport `tmp/multimap-audit-v406/conservation-report.json` ; gel d’entrée3517chemins exacts.

Six fichiers de frontières existantes relus/exécutés ensemble : site/retour/revisite, calendriers partagés, fret, interruption de chargement/décharge, provisions persistées et contexte de validation. **28cas :27PASS/1RED en20,052s**. Le seul rouge attendait encore un résultat de migration253 alors que l’entrée252 migre maintenant jusqu’au schéma254. Les deux comparaisons entières utilisent désormais SCHEMA_VERSION ; contrat ancien252, refus de champs futurs et absence de fret offert conservés. Ce seul cas repasse en8,744s, les sept autres cas du fichier explicitement non rejoués. Aucun validateur, moteur, sauvegarde historique ou assertion de conservation détendu. Rouge conservé sous `tmp/validation-runs/`.

Les vrais voyages V397 et les natifs séparés V401/V402 restent des preuves distinctes réutilisées, pas un nouveau parcours courant entièrement vert. Trois captures de ces lots ont été réinspectées ; aucune nouvelle capture actuelle de tous les menus Vanilla acquise. Corpus66, présentation, nouvelle campagne, FPS et déploiement non rejoués sans changement produit.

## Performances : ce qui reste ouvert

Le parcours V397 sur deux250², Ryzen5 3600/Chrome WebGPU AMD RDNA1/1440×1000, fenêtres3s, avait observé au foyer×6 **36,5 puis11,5images/s** avant/après le voyage, avec15–18ms moyens de Decoder par réception. Météo, travaux et campagne avaient changé : cela démontre un ralentissement dans ces fenêtres, pas sa causalité isolée ni un débit durable. Le site peu bâti et la pause sont des charges différentes.

V399/V400 ont ensuite réduit des relectures CPU précises ; V400 mesure17,115→14,285ms par adoption en moyenne dans un banc Node borné. Ce résultat n’est pas une nouvelle mesure navigateur/GPU/FPS et ne clôt pas le problème de fluidité. Les chronomètres uniques de chargement du contrôle actuel restent descriptifs Node, sans extrapolation.

Avant d’élargir le nombre de cartes, la consolidation doit mesurer brièvement le produit courant dans le navigateur, séparer simulation+encodage worker, réception/adoption MAIN, CPU image et GPU si disponible, puis corriger la cause dominante mesurée. Pas de nouveaux certificats par domaine ou longue campagne automatique.

## Priorités issues de l’audit

1. Garder V405 en attente et le statut multicarte **partiel** visible ; annoncer les destinations non exploitables avant un départ et clarifier retour/secours/stock réellement chargeable.
2. Fermer le diagnostic de performance courant et les défauts de conservation/commande éventuellement constatés ; conserver un contrôle composé de voyage, fret, travail, retour, revisite et reprise, avec dangers distants surveillés. Réutiliser les jalons acquis plutôt que refaire les voyages Aulnes.
3. Pour viser la fidélité Core, traiter explicitement registre de cartes et plusieurs implantations/caravanes, camps temporaires/abandon et menus associés. Ces mécaniques restent à concevoir et livrer ; changer seulement une limite numérique ne suffirait pas.
4. Compléter ensuite les règles de génération encore absentes, dont eau tempérée et géographie mondiale/localement raccordée ; aucune régénération des parties personnelles ou des Aulnes historiques.

## Références et limites de l’audit

[Voyages Core V397](../research/travel-persistence-core-v397.md) réutilisé et confronté au Core installé1.6.4871rev590. [Annonce Alpha16](https://ludeon.com/blog/2016/12/rimworld-alpha-16-wanderlust-released/) : cartes multiples, caravanes et colonies réglables ; [mise à jour gratuite1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) et son changelog officiel accessibles : camps, outils de caravane, Jump to… et géographie. [Annonce1.7](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) : unstable, ne pas confondre avec le Core installé audité. DLC/mods et pixels actuels exhaustifs non audités.

Revue visuelle de la capture officielle caravane2016 réutilisée, build exact inconnu : elle ne certifie pas l’ordre ni l’apparence de tous les menus1.6. Les trois revues privées restent sous `multimap-audit-v406/` dans la racine privéeC ; code et assets propriétaires n’entrent pas dans le produit. Référence Core SHA7be6aebd…, audit UI SHA6ef85fea… ; source produit en attente de note finale. Aucun nouveau jeu public, nouvelle mécanique ou gain de performance revendiqué par cette consolidation.

Typage toutes sources et témoins touchés PASS12,970s. Les contrôles courant et les reprises sont successifs ; aucune source produit ni durée de jeu modifiée. Cette clôture QA ne nécessite ni build ni déploiement.

Le premier contrôle documentaire est rouge1,322s : l’en-tête courant écrivait « schéma254 » sans espace, donc le lecteur prenait l’ancien253 plus bas. Libellé corrigé en « schéma 254 », sans modifier le contrôle.
