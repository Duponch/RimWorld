# V443 — Forges, plaques et casque simple

État : **qualification ciblée, présentation et UI natives muettes acquises par reprises ; publication préparée**. Production conservée : V442, schéma266. Le lot prospectif emploie267 ; aucun achèvement Core ni gain FPS annoncé.

## Résultat joueur et fin du lot

Depuis des matières finies et les recherches déclarées, construire une forge à combustible ou électrique, la ravitailler ou l’alimenter, fabriquer une armure de plaques ou un casque simple, interrompre et reprendre le même ouvrage, puis porter, stocker, transporter, vendre ou récupérer le produit. Le casque est également fabricable à l’atelier d’usinage. Accès, réservations, contact, matières, auteur et qualité restent physiques ; aucun service à distance.

La fin exige une passe regroupée sur ces contrats, la migration266 par numéro seul après validation stricte, le refus des champs futurs dans les anciennes sauvegardes, une continuation et les contrôles de présentation adaptés aux nouvelles phases. Un court parcours natif muet vérifie les boutons et les apparences réellement livrés. Les échecs seront conservés avant reprise ; les sauvegardes publiques et personnelles restent intactes.

## Références et décisions

Lecture primaire locale : RimWorld Core **1.6.4871 rev590**, `Version.txt`, XML Core de production, armures, couvre-chefs, matières, statistiques, recherches et recettes ; IL frais privé pour les listes héritées, arrondis, ouvrages, combustible et récupération. DLL témoin SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Relevés privés : `tmp/forge-v443/reference.md`. Aucun code ou asset propriétaire intégré au produit.

La recherche Internet du20octobre conserve la branche1.6 comme référence : [annonce officielle Waylith et1.7](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) distingue la version instable ; [annonce officielle1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) sert de repère public daté. Le dernier manifeste Steam stable n’a pas été vérifié indépendamment. Les nombres précis ci-dessous proviennent du Core local identifié, pas de l’annonce.

Corpus utilisateur : chapitres11 et20 de l’original `Documentation_developpement.html`, SYS/TEST062–066/068, UI025 et contrats de stockage/équipement associés. Décision : adopter la chaîne physique et ses invariants ; adapter la représentation des matières en identités finies et la priorité de travail au système local existant ; ne pas attribuer aux statuts du corpus une validation locale.

| Élément | Règle primaire retenue |
| --- | --- |
| Recherches | Forgeage700 ; Armure de plaques600 après Forgeage et Vêtements complexes |
| Forge à combustible | 3×1 orientable,100acier, Construction4,180PV,3000ticks Core de construction ; réserve50bois ;80bois/jour d’utilisation seulement ; aucune source de chaleur définie |
| Forge électrique | 3×1,100acier+3composants, Construction5,180PV,3000ticks Core ;210W, chaleur4/s lorsque alimentée et allumée, même au repos ; panne et pluie |
| Armure de plaques |170unités d’une seule matière, Artisanat7,38000ticks Core de base,15kg,15s d’équipement,−0,8case/s ; couches Middle+Shell, torse/cou/épaules/bras/jambes |
| Casque simple |40unités d’un seul métal,3200ticks Core de base, sans minimum d’Artisanat,2kg,1,5s d’équipement ; haut de tête ; forges et atelier d’usinage |
| Matières | Plaques : bois, acier, plastacier, uranium, argent, or ; casque : les cinq métaux. Or/argent consomment dix fois les unités. Facteurs de travail,PV,armure,isolation et valeur propres à chaque matière |
| Filtres initiaux | Plaques : bois et acier ; casque : acier. Métaux précieux/avancés proposés mais décochés |
| Interruption | Même objet, matière, auteur et progression ; pas de nouvelle qualité au rechargement. Annulation :75% de chaque portion incorporée, avec arrondi natif et refus atomique si aucun dépôt admissible |
| Récupération | Nouvelle facture de fusion des dix variantes métalliques :25% de la matière, avec arrondi et filtres PV/qualité ; bois par brûlage, sans récupération |

Adaptations explicites : la priorité locale **Artisanat** regroupe ici Forgeage/Smith du Core ; Électricité est déjà une connaissance initiale dans l’arbre local. Les identités finies évitent de transformer les familles textiles en chemises métalliques. Le meuble cabinet d’outils est absent ; aucun bonus de cabinet fictif n’est accordé. Les deux anciens casques pare-balles fixes restent hors de cette récupération : leur coût Core comprend matière et composants, exigeant une transaction de récupération à plusieurs sorties, non livrée ici.

## Autorité, sauvegarde et coûts

`smithing-content-267.ts` décrit les recettes et matières ; `smithing-work-267.ts` conserve les portions incorporées dans `MaterialPile.smithingWork`. Les chemins existants portent planification, transport, contact, vitesse, combustible, qualité, habillement, protection et commerce. Les gardes de pile, factures, propriétaires et snapshots partagent les mêmes frontières.

La migration266→267 valide d’abord266 puis change seulement le numéro. Elle n’ajoute ni poste, matière, produit, recherche, progression, politique enrichie, histoire ou tirage aléatoire. Les politiques anciennes gardent leurs filtres explicites ; les départs nouveaux proposent les nouvelles identités/matières. La garde historique parcourt les domaines propriétaires, pas les grilles géographiques. En l’absence d’ouvrage, sa validation ne parcourt pas les personnes ni les factures.

Décor, objets et habillement utilisent les lots résidents et les os rigides existants. Couleurs et silhouettes sont préparées à l’adoption, jamais par recherche métier à chaque image. Les ombres et portraits partagent la même géométrie. Le rig ordinaire conserve ses3 190sommets ; la première vraie nouvelle pièce portée étend une fois la géométrie à3 720, avec les mêmes attributs instanciés et matériaux. L’ancienne géométrie reste conservée jusqu’à la destruction du rendu pour protéger ses attributs partagés ; pas d’oscillation au retrait. Après ce premier port, la session reste sur la géométrie étendue. Les branches du shader et l’upload initial ont encore un coût à observer ; ces comptes ne prouvent ni coût GPU nul ni gain FPS.

## Validation et publication

**87cas distincts dans13fichiers acquis par reprises :45nouveaux,42voisins**, pas une suite complète ni une campagne naturelle longue. Les sorties restent sous `tmp/validation-runs/forge-v443-*` ; les échecs initiaux sont conservés. Aucun contrôle lourd n’a été lancé par les agents ; ROOT a exécuté les passes successivement.

| Contrat | Couverture acquise |
| --- | --- |
| Production4cas | Collecte/combustible réels, matière homogène, même ouvrage/auteur, annulation75%, reprise exacte, qualité unique et dépôt des plaques bois ; casque argent400unités à l’atelier d’usinage par un débutant ; travail réel sous blessure et45°C avec facteur sanitaire appliqué une fois et facteur thermique exact |
| Bâtiments6cas | Fin payée de Forge, construction des deux postes au contact depuis leurs matières, rotation ; réserve et dernier fragment de combustible ;210W/courant/interrupteur/panne ; chaleur électrique au repos, absence de chaleur du poste combustible ; contact/supportMedium/minifié20kg ; atelier/propreté sans cabinet fictif |
| Équipement14cas | Onze variantes de définition ; frontières matières/politiques ; vrai remplacement chronométré avec couches incompatibles, réservation et recharge au milieu ; protection, usure, masse et valeur de la même identité |
| Migration6cas | Trois témoins entiers stricts266 dérivés des sources publiques Forges/Aulnes/Éclaircies, puis267 par numéro seul ; anciens champs/biens/recettes/propriétaires/carte inactive refusés ; delta au même tick et checkpoint corrompus atomiques, ancienne instance préservée |
| Récupération8cas | Filtres/qualité/PV/rendements ; vraie collecte/fusion d’une plaque or en425or ; préflight bloqué atomique ; brûlage réel du bois sans sortie ; interdiction au sol ou en file libérant les réservations et refus neutre sur le vêtement porté |
| Rendu7cas nouveaux +5anciens | Modèles des deux postes/aperçus/surfaces/rotations ; géométrie des armures, os, normales, couleurs, codes existants, portraits et extension unique avec identités des attributs conservées ; anciens couvre-chefs inchangés |
| Voisinage37cas | Repos des caravanesV442, migration/registre d’alcoolV441, fusion des armesV311 et brûlageV395, dont recharges entières et frontières historiques |

Les reprises corrigent deux catégories distinctes. **Produit :** garde textile rejetant les ouvrages de forge, plafond de durée d’équipement trop bas pour les nouvelles plaques, rotation électrique oubliée, factures manquantes à la vraie construction, permissions de fusion et facteurs sanitaire/thermique ; les revues ont aussi raccordé rotation UI, dimensions des plans, cadence de travail et texte du combustible. **Pilotes/oracles :** identité de structure confondue avec celle du chantier, recherche d’usinage absente du poste préparé, lecteur courant utilisé sur un témoin historique, calendrier journalier des compétences omis, nouvelles permissions conservées avant un cast historique et ancien catalogue de brûlage supposé exhaustif. Les assertions de contact, conservation, absence d’XP et égalité intégrale sont conservées.

Derniers rapports fonctionnels : `forge-v443-targeted` (19/23), `targeted-resume` (2acquis/2rouges/19sautés), `save-recovery-render` (19/26), `resume-remaining` (9acquis/1rouge/14sautés), `building-resume` (1acquis/5sautés), `compatibility` (32/37), `compatibility-resume` (5acquis/14sautés). Les noms abrégés gardent le préfixe `forge-v443-`. Les typages diagnostiques rouges sont conservés ; le typage final de source et le build Pages sont acquis. Présentation et UI natives muettes acquises ci-dessous ; publication préparée.

Le scénario d’atelier prépare explicitement500bois, cinq repas de survie, le poste, les recherches et les aptitudes. Collecte, ravitaillement, travail, interruption, annulation, production et stockage sont ensuite réellement exécutés. Ses exports `tmp/forge-v443/ui-plate-working.json`, `ui-plate-working.meta.json` et `ui-plate-final.json` servent au parcours UI ; ils ne sont pas une nouvelle partie publique ni une acquisition naturelle inventée.


### Contrôles natifs acquis

**Présentation : PASS161,050s**, Chrome natif, départ250²/trois colons, minage puis abattage, phases et vitesses1/6/1/3. Rapport `tmp/test-runs/forge-v443-presentation-2026-10-20T21-42-35.355Z-33620/artifacts/harvest-sync-verification.json` et captures conservés. Cela qualifie les chemins d’horloge/bridge/poses touchés, pas une campagne naturelle ou la fluidité des Forges.

**Interface : PASS37,434s par reprise**, Chrome155.0.8059.85, WebGPU AMD/RDNA1,1440×1000. Rapports `tmp/forge-v443/native-ui/2026-10-20T21-46-01-403Z/` (échec de pilote conservé : sélecteur d’export inexistant, aucune erreur produit) puis `2026-10-20T21-47-49-752Z/`. Les vrais réglages Effets sonores et Musique sont décochés avant import, Chrome est lancé muet ; diagnostics finaux : son coupé, zéro effet joué, musique décochée. Les défauts du produit publié restent inchangés.

Le vrai fichier d’ouvrage gagné au2646 est importé par le sélecteur de fichier. Sélection de la forge, lecture des80bois/jour de travail, ajout d’un casque, filtres acier seul par défaut puis argent confirmé au Worker, retrait de cette seule facture et export complet : **égalité intégrale**, seul `nextId+1` conserve l’identité retirée. Ouvrage, auteur, progression, combustible, propriétaires, horloges, stocks, PRNG et histoire sont identiques.

Le produit réellement fabriqué et rangé est ensuite importé. Sélection du colon par le HUD, vrai menu contextuel de port, service chronométré, pause et export : même plaque218, même qualité, même propriétaire humain après port ; modèle résident et portraits observés dans les captures. Aucune erreur de page, de rendu ou de pipeline. Les1 816empreintes des sources/actifs servis restent strictement identiques avant et après le navigateur.

Observation auxiliaire de cette **fixture préparée32²/un colon**, pendant la fenêtre du port logique :90ticks en5,0621s au réglage×3, soit physique×2,9632 ; RAF1 209intervalles,238,42FPS moyens, p50/p95/p99/max4,2/4,2/4,3/12,5ms, aucune LongTask>50ms dans cette fenêtre. La capture visuelle postérieure montre l’extension effective. Ces observations mêlent service, présentation et sondage ; elles **n’isolent pas l’upload GPU initial** et ne prouvent ni coût nul des nouvelles branches ni gain ou200FPS stables sur Les Forges. Le coût global après premier port reste à profiler dans la charge dense ; aucune amélioration FPS générale annoncée.

### Livraison

Build Pages acquis, artefacts de QA et sources privées exclus du paquet. Publication et vérifications HTTPS à consigner après la livraison du lot qualifié.
