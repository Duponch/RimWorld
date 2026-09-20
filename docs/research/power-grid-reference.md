# Réseau construit et commutation — référence V85

Enquête du 20 septembre 2026, Core sans extensions ni mods. Implémentation V85 validée dans le périmètre des [preuves](../history/validation-energy-v85.md) ; cette recherche reste distincte de sa validation. Les constantes, migrations et adaptations retenues sont décrites dans le [contrat électrique](../development/power.md). Les [batteries](power-battery-reference.md) et le [solaire](solar-power-reference.md) ont leurs recherches complémentaires.

## Sources et degré de certitude

Corpus utilisateur relu : chapitres 10 et 22, SYS/TEST-127 et SYS/TEST-128, CAT-047. Adopter ressources physiques, séparation des causes d’arrêt et invalidation des connexions. Adapter les unités et la présentation 3D. Les statuts P du corpus ne sont pas une validation locale. S02 renvoie au correctif officiel 1.6.4850 ; S11 concerne Odyssey et ne justifie pas les paramètres du générateur Core.

Source principale vérifiée : installation locale **1.6.4871 rev590**, assemblage SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, définitions électriques et métiers. Lecture seule des classes avec ILSpyCmd 8.2.0.7535 : PowerConnectionMaker, CompPower, PowerNetMaker/Manager, Building_PowerSwitch, CompFlickable, FlickUtility, WorkGiver_Flick, JobDriver_Flick, PlaceWorker_Conduit, CompRefuelable, ThingDefGenerator_Buildings, Building, GenSpawn, GenConstruct et ThingDef. Aucun XML propriétaire, code reconstruit ou sauvegarde personnelle brute n’est publié.

Sources publiques confrontées le même jour :

- [Power conduit](https://rimworldwiki.com/wiki/Power_conduit), révision affichée 179186, article marqué « Unverified » : catalogue et compatibilité. Les nombres retenus sont vérifiés dans les définitions locales.
- [Power switch](https://rimworldwiki.com/wiki/Power_switch), révision 152035 : catalogue et geste physique. Durée, priorité et cas limites vérifiés dans les classes locales.
- [Hidden conduit](https://rimworldwiki.com/wiki/Hidden_conduit), révision 179256 : variante distincte, différée dans cette tranche.
- [Correctif officiel 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : correction de connexions fantômes après décollage, sans spécification complète des réseaux.
- [Ancien PowerConnectionMaker fixé](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/PowerConnectionMaker.cs) : copie déjà étudiée en V42, concordante sur la portée et la rétention. Nouvelle ouverture web en échec de cache ; cette version ancienne n’établit pas le comportement du correctif actuel.

## Objets, couches et passage

| Élément | Résultat local 1.6.4871 |
|---|---|
| Conduit ordinaire | 1×1, 1 acier, 35 ticks Core de construction, 80 PV, fixe ; aucune restitution de matériaux après retrait ou destruction. Couche de conduits, non édifice, Standable, pas de dégagement général de l’emprise. |
| Cadre de conduit | Couche et propriété de dégagement héritées ; Standable, coût de passage 14 ticks Core. Aucun courant avant achèvement. |
| Interrupteur | 1×1, 15 acier et 1 composant, 200 ticks Core, 120 PV, fixe ; Standable et couche bâtiment ordinaire. Ne permet aucun raccord distant directement sur lui. |
| Remplissage pour couverture | Batterie : 0,40 explicite. Interrupteur et conduit : champ absent dans leur définition et BuildingBase, donc valeur initiale 0 du champ de ThingDef. Solaire : 0,50, vérifié dans l’enquête dédiée. |

Un conduit peut coexister avec mur, porte ou consommateur. Un interrupteur occupe la couche ordinaire et n’autorise pas cette superposition. Le placement de conduit refuse tout transmetteur, plan ou cadre de transmetteur, même éteint. Le remplacement inverse dans Core détruit le conduit au moment d’installer le transmetteur. **Adaptation V85 : refuser explicitement les deux sens**, tant qu’un remplacement conservatif n’est pas implémenté. Ne pas laisser deux transmetteurs sur une case ni effacer implicitement une construction.

La règle locale de plante précède le drapeau de dégagement : un travail de récolte strictement supérieur à celui du pissenlit bloque la construction. Héritages résolus : seuil 200 Core ; riz, pommes de terre, maïs et coton sont à 200, donc ne bloquent pas ; baies 250 et arbres 800, donc doivent être dégagés. Le conduit n’est pas un édifice et ne détruit pas les cultures admises à son apparition. Correction de recherche : ni « toutes plantes préservées » ni « toutes cultures coupées » ne sont exacts.

Les massifs naturels refusent les constructions non édifices sous leur emprise. Le conduit ordinaire n’a pas les propriétés du conduit étanche et n’est pas une traversée d’eau. Les variantes cachée et étanche restent distinctes et absentes de V85.

## Composantes et parents

La transmission relie les emprises réelles par contact cardinal. Les contacts diagonaux sont exclus. Générateurs, batteries, conduits et interrupteurs fermés transmettent ; les consommateurs ne prolongent pas un réseau.

Le raccord d’un consommateur cherche un transmetteur dans le carré de six cases autour de son ancre. Une case secondaire d’une grande emprise suffit à entrer dans ce carré. Le classement utilise ensuite la distance carrée entre ancres, avec départage stable selon le parcours z/x. Ce n’est ni un disque de rayon six ni une portée mesurée depuis l’emprise du consommateur. Les murs ne bloquent pas ce fil distant.

Un parent valide reste attaché même si un autre est devenu plus proche ou si le réseau est sans puissance. Il faut distinguer le meilleur **nouveau** raccord et la conservation du raccord existant. Exemple de l’oracle local : un conduit à distance² 13 gagne une recherche neuve face à une batterie à distance² 16 ; une lampe déjà attachée à cette batterie conserve son parent valide.

Un générateur arrêté ou vide et une batterie vide restent des transmetteurs. Seul l’interrupteur physique ouvert retire sa cellule de la topologie, sauf chemin alternatif. La propriété `allowWireConnection=false` de l’interrupteur l’exclut toujours des parents distants. Malgré son nom, la méthode locale FlickUtility.WantsToBeOn consultée ici lit l’état physique et non l’intention de clic.

## Intention et geste

Core distingue interrupteur réel et intention. Le clic crée ou retire une désignation, sans effet immédiat sur le circuit. Le travail réserve exclusivement la cible, rejoint son contact et attend 15 ticks Core. Il abandonne si le contact, l’objet ou la désignation deviennent invalides ; l’état réel ne change qu’à la fin.

Le métier est BasicWorker, actif initialement, sans compétence pertinente ; sa priorité naturelle est 1150 et le geste Flick a une priorité interne 500. Il peut être ordonné à un personnage mobilisé. Ces valeurs de tri Core ne sont pas des priorités numériques identiques au tableau local.

Décision V85 : **Tâches élémentaires**, distinct de Construction, priorité initiale et de migration 3 ; le geste franchit le seuil de 15 Core au deuxième tick local de dix Core, sans XP ou multiplicateur de construction. Une interruption remet cette courte attente à zéro. Le geste sur un personnage mobilisé reste différé. `power.switchOn` contient l’état réel ; le job `flick` porte le désir et la cible précise. L’alimentation `power.on` reste séparée : une pénurie ne réécrit pas le choix du joueur. Recliquer à l’état réel annule une intention sans modifier le réseau.

La combustion ordinaire s’arrête seulement lorsque l’interrupteur réel est éteint. Une demande encore en trajet ne suffit pas. Le ravitaillement automatique refuse un appareil réellement éteint ou portant une désignation de commutation ; les cargaisons déjà engagées doivent être conservées lors de l’interruption. L’ordre forcé de ravitaillement est traité séparément.

## Frontières et vérifications prévues

La migration conserve cartes, parents, matières et calendriers, sans dessiner de nouveaux fils. La topologie dérivée capture emprises, rôles et commutation réelle ; elle exclut combustible, production instantanée et charge de sa clé. Elle ne garde pas de références périmées aux structures lors d’une restauration.

Les contrôles regroupent pont cardinal, chemin alternatif, diagonale, parent retenu, emprises orientées, égalités, coupure physique, annulation, matières et continuation. Le pilote énergétique poursuit la vraie colonie V84 à J24 : recherche, extraction, construction, charge, alimentation nocturne, coupure et raccord. Ses dates sont des observations, pas des objectifs imposant d’accélérer le jeu. Le banc `ENERGY=1` fournit séparément des stocks, appareils et charges synthétiques pour mesurer 3, 30 puis 100 colons en activités mixtes ; il ne prouve pas une économie autonome.

L’action Core « Reconnect » est immédiate et distincte de Flick : elle parcourt les réseaux non encore essayés dans une mémoire temporaire de sélection. Elle reste différée ici. Incidents électriques, feu, extinction, météo complète, éolienne, réparation générale des appareils et tout le métier BasicWorker restent hors de cette tranche. La conformité exhaustive à l’exécutable n’est pas établie.
