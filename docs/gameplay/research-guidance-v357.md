# Première recherche guidée V357

Le lot facilite une progression déjà codée : choisir une technologie, construire son poste et affecter Recherche dans Travail. Il conserve les projets, prérequis, graphes, coûts, commandes, progression, travail physique et sauvegardes. La [journée naturelle V356](dining-day-v356.md) est committée/poussée en `ffc19efd` ; son export66037 reste distinct de la scène préparée ici.

## Comportement joueur

Conseils conserve ses sept rubriques et ajoute **Commencer la recherche**, facultative, vers le panneau Recherche. Elle distingue projet choisi, personne en chemin et travail réellement observé ; elle n’annonce pas un projet achevé ni un trajet garanti. Aucun projet ou métier n’est activé automatiquement.

L’alerte **Choisir une recherche** apparaît si un bureau construit et conservé est présent, aucun projet n’est actif et au moins un projet livré est sélectionnable. Un blueprint, un meuble emballé, un bureau détruit ou en retrait ne suffit pas. L’alerte conserve sa clé et ses interactions existantes : clic, Entrée ou Espace ouvrent Recherche, sans pause automatique. Elle ne dépend pas d’un colon affecté : choisir un projet et affecter un chercheur sont deux gestes distincts. Elle disparaît à la sélection et revient à la suspension/fin si les conditions restent vraies ; tout le catalogue acquis la supprime.

Recherche explique le nombre de colons locaux capables et affectés, les refus physiques présents, ainsi que les trajets/travaux effectivement observés. Dormir, être mobilisé ou faire une autre tâche ne transforme pas une affectation en priorité désactivée. Les visiteurs, prisonniers, personnes hors carte et contenus d’arrivée ne deviennent pas des chercheurs locaux. Intellectuel 0 n’interdit pas un travail admis par le moteur.

Deux boutons mènent aux panneaux existants : **Ouvrir Travail**, **Ouvrir Production**. Ils ne donnent aucun ordre. Les diagnostics de poste distinguent bureau simple/avancé, alimentation indisponible et analyseur requis. Ils ne calculent aucun trajet et ne garantissent ni accès, réservation, disponibilité momentanée ou future progression.

Le bouton de Moniteur vital et son tooltip sont aussi alignés sur le refus matériel déjà présent dans `selectResearch` : bureau avancé et analyseur alimentés sont requis avant ce choix. L’ancien tooltip indiquait à tort que le projet pouvait être choisi sans eux. Les autres projets restent choisissables avant la construction de leur poste, comme auparavant.

## Référence primaire et adaptations

Core installé relu : **1.6.4871 rev590**, assembly SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. ILSpy8.2.0.7535, outil SHA256 `c1635be8deba8b374b43863fe843950460f9860989decff3e522afab35d30904` ; classes inspectées sur stdout seulement, aucun code ou asset propriétaire enregistré pour le produit. Provenance et observations dans `tmp/early-access-v357/reference-plan.md`.

`Alert_NeedResearchProject` vérifie carte foyer, bureau colonial, absence de projet actif et projet disponible ; aucun filtre humain/priorité/courant/trajet. Son clic ouvre Recherche. `Alert_NeedResearchBench` lit la présence du modèle requis, pas son alimentation, avec exclusion gravship. Textes primaires locaux : `Data/Core/Languages/English/Keyed/Alerts.xml`, lignes 86–87 et 194–195 ; travail Research dans `Defs/WorkGiverDefs/WorkGivers.xml`, lignes 1469–1474.

Le délai global Core 600 et son cycle de 24 cohortes d’updates ne sont pas repris : Elsewhere utilise sa cadence de snapshots/UI existante, sans timer ni état sauvegardé nouveau. Les critères de sélection sont ceux de notre `selectResearch`, dont l’exception Moniteur vital ; ce n’est pas une traduction exhaustive de `CanStartNow`. La présence du bureau et son usage possible restent distincts, notamment pour un bureau en retrait. Pas de multicartes, gravship, techprints ou règles de narrateur ajoutés. Ces écarts sont des adaptations explicites, pas une parité exhaustive.

## Implémentation et coût

Le catalogue de30 projets est extrait littéralement vers `research-projects.ts`, réexporté par le panneau pour les consommateurs existants. Une vue commune pure `readResearchReadiness` lit les prérequis, vrais postes et affectations. Elle n’appelle ni commande, fournisseur de travail, pathfinding, réservation, RNG ou initialiseur de progrès ; aucun ID, propriétaire, besoin ou schéma n’est modifié. Les gardes de versions suivent l’admission actuelle.

Les30 diagnostics de nœuds partagent une capture uniquement lorsque Recherche est ouvert. Alertes/carnet lisent seulement le projet concerné ; l’alerte sort tôt si un projet est actif. Parcours de personnes, structures, jobs et catalogue, puis tris d’IDs ; les liaisons avancées conservent leur recherche spatiale existante. Aucun coût nul ou gainFPS n’est revendiqué. Pas de cache fondé uniquement sur l’identité d’un World mutable.

## Qualification acquise

ROOT seul, sources/tests/pilotes figés, gel 2935 exact. Typage **PASS 19,215 s**. Groupe ciblé **86 cas/6 fichiers PASS 29,104 s**, dont20 nouveaux cas du lecteur et3 du guide : immutabilité répétée/gelée, postes réels/détruits/retirés, projets acquis/verrouillés, admission spéciale, alimentation/analyseur, incapacités/états physiques, personnes étrangères et affectations endormies. Régressions recherche, alertes et activité existantes passent. Revue indépendante statique : aucun nouveau P1/P2 trouvé, catalogue/graphe/commandes conservés.

Chrome/WebGPU **PASS 27,756 s/body 22,792 s**, petite scène32² préparée : chercheur 182 capable, priorité initiale 0, bureau 183 fourni par la fixture. Alerte via Entrée, liens Travail/Production, huitième conseil puis choix ordinaire Vêtements complexes et priorité 1 dans la vraie UI. Le colon rejoint réellement son poste et travaille ;3024/34805 micro-points, soit 0,034805 point. Le format HUD arrondit encore à0,0 ; aucun achèvement n’est prétendu. Suspension conserve ces progrès, rend l’alerte, puis Espace ouvre Recherche sans reprendre l’horloge.

Deux exports/recharges exacts :3000 SHA256 `8126740175b2576e4b8a02c93a30c6a30b1ac117d0ff9cb4f66e14514b5dc45f` et3024 `da0ecfde9e39abb5e5b1652c06326b59543c683893e299027ea1fe01c5e7627d`. Erreurs[]/lifecycle[] ; deux captures inspectées ROOT, dans `tmp/early-access-v357/native/research-guidance-v357-V35-5f3d5-and-exact-save-continuation/`. Cette préparation qualifie l’UI et un premier travail, pas une construction payée, recherche achevée, campagne V356 ou débit/FPS. Aucune rouge V357 à ce stade.

Build Pages **PASS 2,499 s**, typage déjà acquis sur le même gel. Les63 références/66 fichiers publics, moteur, bridge, rendu et schéma 236 sont conservés ; aucun corpus codec inchangé n’est rejoué pour ces seules projections UI. Gate documentaire puis commit/push et package/publication en cours. La suite autonome revient à la campagne66037 : besoins, usages alimentaires/médicaux, renouvellement et incidents avec mêmes personnes, branches blessées conservées, sans résultat futur promis.

Clôture : produit `5cd5ffce` commité/poussé, documentation initiale PASS1,172s ; [publication unique965abf99](../development/cloudflare-pages.md#publication-v357--première-recherche-guidée), package517fichiers/119566517octets et106réponsesHTTPS exactes acquis. V353 reste l’état historique précédent. Le prochain lot V358 prépare les réveils/repas depuis66037 ; aucune nouvelle ingestion ou suite naturelle acquise par cette clôture.
