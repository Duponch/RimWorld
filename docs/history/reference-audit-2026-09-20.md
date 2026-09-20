# Audit de référence du départ — 20 septembre 2026

**Recherche et diagnostic, aucun nouveau gameplay livré.** Le code produit et le schéma restent V81 au commit `88649eb`. La [synthèse](../research/core-reference-baseline.md) relie narration, difficulté, génération et observations. Le [contrat de menus](../development/new-game-menus.md) enregistre la demande utilisateur ; il ne décrit pas une interface déjà présente.

## Provenance et vérifications

- Installation RimWorld **1.6.4871 rev590** : définitions et classes ciblées inspectées en lecture seule ; version/hash/méthode dans la synthèse. Aucune dépendance de Lisière ajoutée.
- Dix-sept captures utilisateur examinées : accueil, scénario, narrateur, difficultés et infobulles, puis monde, site, personnes et arrivée. Radio difficulté/mode vide, Cassandra préselectionnée ; Récit d'aventure choisi explicitement ensuite par l'utilisateur. Les cinq dernières accompagnent le témoin ci-dessous.
- **88 sauvegardes historiques, deux mondes**, puis **un nouveau témoin**, soit trois mondes étudiés : une carte initiale 1.4.3641, 87 états d'un tutoriel 1.6.4633 et `Reference-Core-4871`. Cinq états historiques détaillés ; reprises temporelles, dotation du tutoriel et limites d'inventaire consignées. Aucune donnée brute personnelle publiée.
- Nouveau témoin : en-tête **1.6.4871 rev591**, Cassandra/Medium, Core seul, Atterrissage forcé, tick 283, 250², forêt boréale/grandes collines. `Version.txt` reste rev590 ; la différence est conservée. Quantités du scénario corroborées, sept recherches initiales ; [mesures et limites](../research/map-calibration-reference.md#témoin-actuel-fourni-par-lutilisateur). Le site tempéré/petites collines initialement proposé n'est pas substitué au site réellement choisi.
- Cartes : cinq graines de Lisière comparées aux comptages des cartes originales sous leurs versions et reliefs respectifs. Cela fournit des écarts démontrables, pas des percentiles robustes de génération ni une distribution universelle de RimWorld.
- Corpus, sources Internet, XML/classes et observations distingués. Les données de version ancienne ne sont pas transformées en certification du patch courant ; les contradictions restent dans les documents de domaine.

Les trois recherches indépendantes ont été intégrées centralement, puis une relecture indépendante a précisé le centre des filons et l'anonymisation des anciens témoins. Aucun benchmark CPU/GPU, build ou parcours de colonie nouveau n'est nécessaire pour cette livraison de recherche et d'outillage ; aucun gain de performances revendiqué. Les performances publiées restent celles de V81/V80/V79, avec leurs charges distinctes.

Outil ajouté : [audit en lecture seule](../../scripts/audit-reference-map.py), Python standard, sans dépendance nouvelle. **7/7 contrôles synthétiques réussis**, puis extraction centrale du [témoin actuel](../../artifacts/reference-core-4871-map.json). Les trois grilles ont chacune 62 500 cellules et leurs sommes concordent ; aucune correspondance de hash n'y reste inconnue, sous les limites explicites du résolveur. Plantes 11 269, arbres 3 287, roche 10 975, minerais 1 136 corroborés par l'extraction exploratoire indépendante. Les entrées réelles contrôlées sont inchangées par SHA-256 ; écrasement et sortie dans le dossier Saves refusés. Le rapport contient des agrégats, pas les noms des personnes, chemins privés, identifiants de compte ou contenu XML. Les anciennes versions gardent leur hash acier non résolu dans le CLI, au lieu de certifier leur allocation depuis le binaire actuel.

Contrôle documentaire : **290 documents, 2 996 liens locaux**, 25 identifiants de domaine et cinq familles de validation conservés ; intégrité des trois originaux préservée. Whitespace relu avant commit. Le code produit et les suites de gameplay sont inchangés. Les contrôles de cet outil ne constituent pas une validation d'un nouveau générateur, du narrateur ou des futurs menus.

## Parcours de sept jours engagé avant la réorientation

Ce travail antérieur était un **brouillon non publié**, désormais suspendu. Il ne faut pas le confondre avec les trois jours V80 validés ni le pilote médical V81. Le diagnostic reste utile ; il ne devient pas un critère de parité.

1. Contrôle court de préparation/défense sur trois graines : matériel équipé physiquement par commandes, sans équipement injecté.
2. [UI courte, graine 42](../../artifacts/survivor-week-commands-v81-42.json) : 46 commandes réelles, tick 0→626, revolver/gilet, mobilisation/tir libre, sauvegarde/reprise. Une passe réussie, environ 1 min 12 s. Ce n'est ni une semaine dans le navigateur ni une nouvelle mesure de performance.
3. [Premier parcours cœur, graine 42](../../artifacts/survivor-week-v81-42-initial.json) : **échec** après sept jours, environ 90 s de commande. Trois survivants vivants ; abri et métal rangé ; menace du calendrier actuel résolue ; 42 rations consommées, huit restantes. Aucun repas renouvelable produit/ingéré, refroidisseur passif inachevé. L'échec n'a pas été renommé réussite.

Les checkpoints complets sont conservés localement sous `tmp/survivor-week-*`. L'état final ne prouve pas une continuation réussie : aucun rejeu de ce parcours après correction n'a été exécuté. Les premières observations intermédiaires avaient des références imbriquées mutables ; leur succession ne doit pas servir de mesure médicale temporelle fiable. La copie profonde a seulement été proposée ensuite.

Diagnostic du pilote : une commande créée par étalement d'une ressource recopiait son `kind`, remplaçant `chop`/`harvest` par `tree`/`berries`. Le refus d'admissibilité supprimait donc silencieusement le réapprovisionnement. Correctif proposé : copier les seules coordonnées. Autres préparations : filtrer les personnes gérées, renforcer le bilan de combat, copier les observations et comparer la continuation sur deux copies. **Ces corrections ne sont pas livrées dans cet audit** et devront être intégrées/validées avec le nouveau parcours.

Les six fichiers de code préparatoire ont été préservés dans `tmp/suspended-first-week-2026-09-20`, avec les versions proposées des deux pilotes communs. Les suites publiées ont retrouvé leur état antérieur. Aucune assertion de conservation, de soins ou de nourriture n'est supprimée pour obtenir du vert : le brouillon entier est suspendu à la demande de changement de périmètre, et l'échec demeure publié ici. Les prochains critères temporels découleront de la référence plutôt que d'une échéance de sept jours.

## Décision et état du plan

Le profil cible est désormais **Atterrissage forcé / Cassandra / Récit d'aventure**, options alternatives grisées. La différence entre ce profil et Trois survivants est explicite. L'installation locale confirme 250², 6 h locales au départ, 16 min 40 par jour nominal à 1×, introduction classique conditionnelle et maturité sauvage initiale. Les corrections de règles et l'interface ont leurs prérequis identifiés ; elles restent à implémenter.

**G0** en consolidation ; **G1/G2/G3** partiels ; **G4** engagé ; **G5** absent. Aucun pourcentage fonctionnel augmenté, aucune parité globale ou difficulté équivalente annoncée. Le travail restant est ordonné uniquement dans [ROADMAP](../ROADMAP.md).
