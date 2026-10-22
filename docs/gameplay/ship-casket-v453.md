# V453 — Caisson de cryptosommeil spatial

**V453 publiée — schéma 277.** Recherche et chantier payés, entrée/portage des mêmes occupants représentés, suspension puis éjection directe. **83 cas distincts acquis par reprises : 53 nouveaux et 30 voisins** ; typage, continuation entière comparée, présentation et interface Chrome/WebGPU muettes acquis. Build Pages acquis ; produit `6d90207c`, déploiement `208e401f`,20réponses HTTPS ciblées exactes et sauvegardes publiques inchangées. Aucun lancement, victoire, gain FPS global ou clôture des six ensembles. L’audit transversal des bases est désormais [consigné](../development/audit-core-20261022.md).

## Référence et règle retenue

Lectures primaires du22octobre2026 : installation Core **1.6.4871 rev590**, XML `Buildings_Ship`, parents `Buildings_Base`, recherche `ShipCryptosleep` et comparaisons avec le caisson ordinaire. Lectures IL ciblées de Building_Casket, Building_CryptosleepCasket, fournisseurs de menu, drivers d’entrée/portage, ReservationManager et règles de placement. Même assemblage identifié que V451–V452 : SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Relevés privés dans `tmp/ship-casket-v453/reference.md` et `physical-plan.md`. Aucun code ni asset propriétaire intégré au produit.

Recherche officielle renouvelée : [l’annonce Ludeon du12octobre2026](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) distingue toujours la branche principale1.6 de la1.7 instable. Elle ne documente pas les recettes ; les nombres ci-dessous viennent des XML/IL locaux identifiés. Le corpus humain conserve CAT-052 et les domaines logistique051–054, chantier056, retrait058 et réseau127 ; les originaux et leurs statuts restent préservés, sans clôture globale déduite de ce lot.

| Propriété | Règle Core vérifiée |
| --- | --- |
| Recherche |Cryptosommeil spatial,2 800points ; Construction de vaisseau et Cryptosommeil, ce dernier prérequis caché dans la référence ; bureau avancé avec multi-analyseur |
| Construction |120acier,14uranium,3composants,3composants avancés ; Construction8 ;8 000travail Core/800local |
| Physique |1×2orientable, défaut Sud2 ;200PV, inflammabilité0, support Heavy ; sans toit |
| Placement |Cellule exacte ancre−direction sur une poutre de vaisseau achevée ; cellules d’interaction distinctes des autres bâtiments/plans/cadres |
| Passage et réseau |Traversable sans arrêt, surcoût42Core/4,2local, remplissage0,5, vent bloqué mais pas la lumière ; pièce de vaisseau et transmetteur passif |
| Service |Entrée volontaire ou patient initialement à terre porté par un colon capable, mobilisé ou non ;500Core de fermeture après approche réelle |
| Sortie |Éjection directe par le joueur, sans autre colon, travail d’ouverture300Core ou alimentation électrique ; maladie seulement aux êtres de chair, slime au véritable occupant |
| Retrait défavorable |Destruction sans appel à l’éjection ordinaire ; blessures réelles, tentative de dépôt, explosion Flame2,66 et mêmes propriétaires à conserver |

La poutre est une condition de placement. Sa destruction après achèvement doit couper le graphe sans invalider rétroactivement le caisson ou empêcher une éjection. Le caisson ordinaire ne devient jamais une pièce spatiale.

## Occupants et conservation

Le conteneur natif n’ajoute aucun filtre Humanlike, âge, faction ou espèce. Le portage vise un Pawn réellement à terre, puis n’annule pas sa fermeture au seul motif qu’il retrouve la capacité de se lever. Les exclusions QuestLodger et hôte supplémentaire restent distinctes. Une entrée volontaire concerne une personne réellement contrôlable ; cette règle ne donne pas au joueur le contrôle d’un prisonnier ou d’un animal.

Le nouveau détenteur `shipCryptosleep277` distingue explicitement humain, animal et mécanique. Une seule identité originale, avec ses biens originaux, quitte la liste active au transfert final. Les anciens détenteurs271 et leurs admissions ne sont pas élargis. Santé, âge biologique, besoins, produits/croissance et durées actives doivent être suspendus sans guérison, consommation, tirages ou rattrapage ; les dates factuelles et le temps civil conservent leur sens. Sortie, voyage, retrait de carte et destruction doivent conserver faction, captivité, registres et possessions, sans doubler un propriétaire ni effacer un adversaire.

La représentation mécanique locale possède un état `downed`, mais le combat ordinaire actuel transforme sa première mise à terre par violence externe en mort certaine. Un cas CPU préparant un état mécanique à terre valide ne prouvera donc pas son acquisition par un combat ordinaire ; cette limite préexistante reste nommée.

## Implémentation et limites

**Suite réorientée par l’utilisateur le22octobre :** terminer ce lot, puis analyser transversalement les lacunes et prioriser les boucles classiques/basiques encore manquantes. Ordinateur, capteurs et lancement restent dans l’objectif final, sans être automatiquement les lots suivants. Les domaines cités par l’utilisateur sont seulement des exemples : l’audit doit couvrir tous les systèmes du Core et leurs interactions, y compris les aspects non cités.

Raccorder recherche, outils et modèle original au lot graphique existant ; chantier payé et rotation exacte ; vrai service au contact, interruptions et réservations ; éjection directe ; lecteurs RAW/public, migrations et tous les propriétaires. Le graphe du vaisseau compte le caisson et son occupation réels, sans autoriser un départ incomplet : ordinateur, capteurs et lancement restent absents de ce lot.

Prévoir les transitions et espaces de dépôt avant mutation, conserver les refus sans effet, sceller les originaux des transactions froides. Réutiliser le réseau électrique et l’index de pièces ; aucun nouveau graphe par image ou pas physique. Les mesures porteront sur les chemins modifiés si leur risque le justifie ; aucun gain FPS global ne résulte d’un choix de conception.

Les contrôles acquis ci-dessous couvrent un périmètre ciblé, sans parité exhaustive. Les sauvegardes publiques, Les Aulnes et les références humaines restent préservées.

## Réalisation et adaptations

Le service possède les réservations, l’approche et la fermeture réelles, y compris pour un colon mobilisé. Les humains, animaux et mécanoïdes gardent leurs originaux et possessions ; faction, captivité, cohortes, lits et registre WorldPawns ne sont pas reconstruits à la sortie. L’entrée n’ajoute aucun filtre humain/adulte/faction. L’éjection directe reste possible quand le dernier colon est suspendu ; l’alerte le nomme vivant et pointe son vrai caisson, sans déclarer une arrivée ou une disparition.

Le portage applique le **facteur de vitesse natif 0,6**, vérifié dans Pawn.TicksPerMove pour toute cible de catégorie Pawn. Le patient conserve exactement l’arête humaine, également après annulation. Le lecteur277 admet son segment humain résiduel strict sans route/activité autonome ; anciennes enveloppes inchangées. Les corps Lancer/Pikeman ont deux cas de garde supplémentaires : seul le Pikeman dépassait réellement son ancien plafond de vitesse propre.

Les dossiers biologiques conservent un temps clinique actif et une frontière civile ; anesthésie, maladies, âge, besoins et produits ne rattrapent pas le sommeil. Tir, mêlée et EMP gardent leurs vraies récupérations et dates. La migration valide strictement276 avant de changer le seul numéro277 ; futur278, autres propriétaires et identités doublées restent refusés. Les lectures publiques partielles ne parcourent pas terrain/flore pour le nouveau namespace.

Déconstruction, KillFinalize, Vanish et explosion restent distincts. Le reçu terminal277 et les résultats destroyed277 sont des adaptations locales explicitement bornées, sans mort clinique inventée ni réaffiliation d’un vivant. La perte mécanique sans biens ne crée aucun compteur de pertes vide. MapRemoved/Vanish des trois genres sont exercés sur une vraie campagne géographique V414 conservée, avec nouveaux caissons/patients préparés déclarés ; cela ne prouve pas un voyage ou une construction naturelle de ces caissons. L’impossibilité naturelle du dépôt Near n’a pas été jouée : le kernel Vanish est exercé directement. Un ancien monde littéral sans véritable registre WorldPawns refuse conservativement une perte terminale sans dépôt ; il n’invente pas ce registre.

Le modèle low poly original et les changements d’occupation réutilisent le lot électrique existant. Le graphe froid du vaisseau compte le caisson et ses deux cellules sans élargir les obstacles solides ; inspection mise en cache, aucune reconstruction du graphe à chaque image. Aucun gain FPS n’en est déduit.

## Contrôles acquis et reprises conservées

ROOT conduit seul les contrôles lourds, successivement. Résultats dans les dossiers datés `tmp/validation-runs/` et `tmp/test-runs/` ; les archives antérieures ne sont pas écrasées.

| Groupe | Cas distincts acquis |
| --- | --- |
| Recherche, physique, retrait |21 |
| Services réels et présentation/alertes |16 |
| Propriétaires, horloges et MapRemoved |8 |
| Graphe, migration et chantier moteur réel |8 |
| Voisins : clinique/caisson271, anesthésie, coques, migrations |30 |
| Total |83 |

Première passe :32/49 acquis,17 rouges conservés. Après diagnostic :21/27 puis5/6 acquis ; dernier portage sauvage acquis séparément. Deux cas mécaniques et deux cas d’alerte ont ensuite porté le lot nouveau à53. La passe voisins/services/owners donne37/44 : ses sept rouges sont des oracles futurs277 devenus courants et un numéro de migration attendu276, pas des gardes produit à relâcher. Les attentes courantes/futures sont corrigées vers277/278 ; dernière reprise UI/voisins acquise. Ces passages ne s’additionnent pas au nombre de cas distincts.

Défauts produit corrigés : validation du mandat non mobilisé, sous-gardes médicales animales après suspension, rotation du caisson, annulation de portage, comptage vide des pertes mécaniques, segments humains des patients, ralentissement de portage et alerte du dernier colon. Préparations invalides corrigées séparément : âge des herbes, nutrition/anesthésie animale, champs humains copiés sur un animal, lésion mécanique létale, pose sans support et chantier enfermé par la coque. La première vraie simulation du chantier inaccessible, avec ses conséquences, est conservée ; aucun pathfinding n’a été simplifié pour la contourner. Les anciens rouges des autres lots non relancés ne sont pas déclarés résolus.

**Chantier réel Node :** source V452 entière au46030, SHA `c41c0ec8e585ced1c88cc85cb5453b088bee8216e47a27f8b2a1754993fdf2ef`. Seules deux connaissances et les quatre stocks finis sont préparés ; un vrai changement de planning remplace l’ancien travail forcé, sans réinitialiser repos, santé, dégâts ou histoire. Cadre550 payé au49516, progrès1 ; caisson569 construit au50149 sur le bord Ouest accessible de la vraie poutre445. Matières consommées, continuation entière et deux lecteurs publics acquis ; entrée,40ticks suspendus et éjection des mêmes originaux acquis.

**Continuation indépendante :** Les Éclaircies publiques,1730→1810,80vrais ticks sur ancien code V452 et courant277 ; deux désérialisations indépendantes et deux mondes entiers comparés avant/après, seul `$.schemaVersion`276→277 aligné. Les deux comparaisons sont exactes, avec tous propriétaires, événements, dates et PRNG. Sources, manifeste et partie publique restent identiques. Rapport `tmp/ship-casket-v453/ordinary-continuation/2026-10-22T00-01-18-291Z/report.json`. Ce n’est pas une mesure FPS ni une campagne longue.

**Interface native :** Chrome155/WebGPU,1440×1000,108,077s. Cadre réel49516→49528, progrès1→16 ; monde construit importé entièrement sans changement. Ada168 entre par le vrai menu, ferme depuis50162 pendant500Core et est détenue au50212. Même holder exact jusqu’au50252, recharge entière occupée exacte ; éjection au50252 en pause, aucun travailleur ni tick ajouté, même personne et vraie maladie10531Core/slime. Soixante images en pause conservent le monde entier. Les biens personnels sont couverts par les cas CPU ; Ada n’en possède pas dans ce parcours natif. Six notifications ResizeObserver sont conservées, aucun autre défaut/arrêt graphique ou simulation relevé ; cause et absence de régression de mise en page non attribuées. Rapport `tmp/ship-casket-v453/native-ui/2026-10-22T00-02-11-925Z/report.json`.

**Présentation commune :** minage puis abattage,45s chacun, départ250²/trois colons, vitesses1/6/1/3 ; aucun saut, dépassement continu ou occupation solide détecté. Maxima d’intervalle30ms/36ms dans ces fenêtres ; aucune cible FPS globale ou stabilité longue n’est certifiée. Rapports datés `v453-presentation-mine` et `v453-presentation-chop`. Les2171chemins produit figés sont strictement identiques avant/après tous les navigateurs. Chrome est muet ; effets/musique coupés avant la première page, volumes0 dans le pilote UI. Aucun réglage joueur publié n’est changé.

## Publication et suite

**Produit sélectionné : `6d90207c7f426a65ec823cea3e000ff409ab94b2`.** Build Pages acquis en5,206s ; paquet `tmp/elsewhere-pages/v453-package-N0jav5/`,552fichiers,152675165octets. Les68fiches et71chemins publics sont strictement identiques ; actifs statiques/CSS conservés et laboratoire/branchements QA absents du paquet inspecté.

Déploiement **`208e401f`** acquis sur [l’adresse publique stable](https://elsewhere-cq7.pages.dev/) et [son adresse immuable](https://208e401f.elsewhere-cq7.pages.dev/). Les20réponses HTTPS ciblées sont exactes en octets/MIME sur les deux adresses ; rapport `tmp/elsewhere-pages/v453-http-nUE8mM/report.json`. L’ensemble des sauvegardes est comparé localement public↔dist ; cette passe distante ciblée ne retélécharge pas chaque sauvegarde et ne remplace pas les parcours natifs acquis. Le dépôt conserve le dossier humain `references_UI/` non suivi ; il n’entre pas dans le paquet.

L’[audit transversal](../development/audit-core-20261022.md) réexamine tous les domaines et leurs interactions, pas seulement les exemples humains. Prochaine priorité décidée : corriger le paludisme géographique existant, puis les réserves d’habits utilisables et le débouché commercial des vêtements actuels. Ordinateur/capteurs/lancement restent dans l’objectif final, sans passage automatique avant ces bases.
