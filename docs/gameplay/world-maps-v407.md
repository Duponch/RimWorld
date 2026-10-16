# Registre de cartes, colonies et caravanes — V407

Étape des fondations du16octobre2026, **schéma255**, qualifié ; publication différée avec les fondations suivantes. Ce lot supprime la racine foyer obligatoire et la limite produit d’un seul second site. Il ne clôt pas la conformité monde/voyages au Core. Dernière production inchangée : V403/e24c5731, schéma254.

## Résultat joueur et autorités

Monde réunit les cartes et les caravanes réelles. Le plafond de colonies est une préférence globale confirmée, réglable1–5 et initialement1 ; l’abaisser ne supprime aucune colonie. Une colonie conserve sa carte même vide. Un camp temporaire utilise une vraie carte200² et peut devenir une colonie sans régénérer son terrain. Les cartes possèdent des identités monotones ; changer de vue ne transporte personne.

Abandonner est une action explicite avec conséquences et confirmation. L’ancien foyer peut disparaître, une autre carte réellement présente devient racine technique ; après la dernière carte, la campagne reste sur le globe avec ses vrais voyageurs. Une caravane existante peut ensuite fonder une nouvelle colonie, avec ses personnes et biens originaux. Aucun faux terrain n’est conservé pour simuler une campagne sans carte.

Les cartes et groupes partagent l’horloge, les allocations et le flux aléatoire autoritaires. Les cartes hors vue continuent leurs mécanismes ; affichage, alertes et commandes résolvent les vrais IDs. Les snapshots ne transmettent que la carte sélectionnée et des résumés bornés ; la sauvegarde complète conserve toutes les cartes et tous les groupes. Les préférences du navigateur ne sont pas offertes par une migration World.

Au retrait d’une carte, les propriétaires personnels sont compactés séparément des terrains/bâtiments perdus : humains, animaux, biens réellement tenus, capsules et lien de portage restent identifiables. Une arête inachevée s’arrête à son origine physique ; les tâches sont libérées par leurs transitions existantes. Le soin, le sang, les plaies, les besoins et le RNG ne sont pas réécrits. Le terrain retiré n’est ni une carte secrète conservée, ni un stock restitué.

Référence : [voyages et persistance Core4871](../research/travel-persistence-core-v397.md), relevés primaires privés des propriétaires WorldPawns et du retrait de carte, et [auditV406](../development/multimap-audit-v406.md). Aucun code ou asset propriétaire copié. Les captures Vanilla déjà datées ne prouvent pas une parité pixel actuelle ; cette UI reste une étape raccordée, pas la fin du chantier.

## Compatibilité

Ancien254 strictement validé sur ses deux cartes et propriétaires avant enveloppe neutre255. Ancien foyer et éventuel second site gardent leurs terrains, tâches, personnes, objets et chronologies ; le second site historique n’acquiert pas rétroactivement un statut de camp ou une fondation. Les anciens groupes et leurs bilans restent littéraux. Champs futurs et anciennes représentations privées de brouillons sont refusés, pas normalisés silencieusement.

Les sauvegardes complètes et les projections d’affichage ont des contrats distincts. Deux réparations transversales conservent aussi le témoin de saleté des personnes projetées et la connaissance sociale des humains réellement présents sur une autre carte. La validation des souvenirs n’a pas été assouplie. La branche blessée21483 conserve ses trois résidents à terre et Tao occupé sur le site ; zéro tick, soin ou replay favorable.

## Qualification ROOT

Sources/tests/pilotes/inputs gelés sous `tmp/world-foundations/registry-255/`. Contrôles exécutés successivement, agents en copies privées. Typage de toutes les sources et des pilotes concernés PASS16,844s après corrections de préparation/type consignées. Groupes ciblés :52cas acquis par reprise de deux seuls témoins API/UI ; groupe compact initial33cas, puis douze cas de réparation/conservation comprenant deux nouveaux contrôles de connaissance. Les échecs initiaux sont conservés ; aucun total unique additionnant des groupes qui se recoupent n’est annoncé.

Deux historiques250² réellement chargés sans avancer : Aulnes publiques10733 et seul vrai V39721483. Terrains/domaines locaux/personnes/biens/horloge/RNG conservés ; vues des deux cartes, full Encoder/Decoder et sauvegarde/recharge complets exacts. Rapport `historical-conservation-report.json`. Temps Node descriptifs de migration à froid ~2491ms et2192ms sur ces deux seules entrées ; aucun débit navigateur ou FPS déduit.

Présentation Chrome PASS140,354s : continuité des phases existantes et bridge. Ce contrôle de synchronisation n’est pas une nouvelle fonction de minage. Il n’est pas rejoué après le seul correctif de sortie de l’écran de chargement.

Parcours natif indépendant préparé Survivants32², avec deux véritables formations/chargements/trajets exécutés une seule fois avant import. À tick2879 et ensuite en pause : camp200², deux colonies, abandon du foyer puis de la dernière carte, sauvegarde sans carte locale. Premier natif RED170,274s : écran de chargement conservé à tort après la reprise sans carte ; vrai export gardé. Correctif produit : terminer aussi le chargement d’une campagne globe seule. Natif02 RED32,473s : le premier terrain apparaissait avant la fin des pipelines GPU ; le pilote attendait seulement12s. Sans changer les règles, la reprise attend désormais l’interface réellement interactive, au plus60s. Natif03 PASS45,560s depuis le seul export mapless2879/SHA567d92a8b3e61418838021eb6e5aaf5d4d4d680e98a3445e3bc42c8e0fac3533 : recharge complète exacte, nouvelle colonieID2 avec le même voyageur et toutes ses pilesID/item/quantité, seconde recharge complète exacte, WebGPU sans incident, errors[]. Aucun voyage ou abandon acquis rejoué. Trois captures acquises et deux captures de refus inspectées ROOT ; zéro tick joué pendant les gestes natifs en pause.

La frontière migration255 justifie une passe statique des66 références publiques : PASS147,058s, validation/migration, sauvegarde/recharge entière et full Decoder sélectionné, sans aucun tick. Le premier ancien oracle comparait à tort le snapshot sélectionné au World contenant tout le registre : il utilise maintenant la vraie projection sélectionnée, tout en conservant la comparaison exacte de sauvegarde complète. Source historique inchangée, aucune grille inactive transmise pour faire passer l’oracle.

Build Pages PASS3,373s ; contrôle documentaire PASS3,074s avant ce seul ajout de résultats. Gel final `freeze14.json` : sources et entrées exactes, historique des gels et rouges conservé. Aucun paquet distant, déploiement255 ni gain FPS acquis.

## Fondations encore ouvertes

Le globe dense, ses paramètres Vanilla, les14biomes, les vraies côtes/rivières/terrains/plantes/animaux et leur provenance locale sont en préparation256, pas activés par ce lot. Restent également division/fusion, animaux et catalogue complet de chargement des caravanes, cadence et règles de voyage Core, menace différée des camps, propriétaires WorldPawns évolutifs et composition des factions/établissements. Les propriétaires perdus restent pour l’instant conservés et gelés ; ce n’est pas le cycle de vie complet WorldPawns Core. Pas de parité fonctionnelle globale, menu exhaustive, graine composée Core, performance générale ou campagne entière annoncée.
