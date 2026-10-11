# V310 — secours et emplacements de couchage animaux

Lot fonctionnel demandé le 11 octobre 2026, schéma **221**, après l’abattage manuel V309. La demande humaine autorise la poursuite autonome des boucles élémentaires après commit/push ; les publications Cloudflare restent regroupées et la relance planifiée reste **PAUSED**. Les contrôles acquis et leurs limites sont consignés ci-dessous ; le parcours clinique préparé ne démontre pas une campagne naturelle.

La boucle ajoute un emplacement gratuit normal ou médical, le secours physique d’un animal possédé à terre et le sommeil sur ces places avec repli au sol. Lièvre, cerf, gazelle, mufalo et dromadaire sont les cinq espèces admises. Le patient reste la même entrée Wildlife, avec sa santé, son âge, sa faim, son repos et son identité ; il ne devient ni une copie humaine ni une pile vivante. Les [soins vétérinaires V277](veterinary-care-v277.md), l’[alimentation assistée V279](animal-feeding-v279.md) et l’[abattage V309](slaughter-v309.md) conservent leurs chaînes physiques.

## Référence et écarts déclarés

La [recherche Core actuelle](../research/animal-rescue-core-v310.md) relit l’installation RimWorld **1.6.4871 rev590**, XML et assembly locale, avec provenance et empreinte. Les annonces officielles de [Ludeon en 2015](https://ludeon.com/blog/2015/08/rimworld-alpha-12-animal-taming-released/) et de [la version 1.3](https://ludeon.com/blog/2021/07/announcing-update-1-3-and-the-ideology-expansion/) corroborent sommeil, couchages assignables et désignation médicale ; elles ne définissent pas les détails du build relu. Le « Rescue » d’entraînement animal de 2015, où l’animal porte un colon, reste hors de ce lot.

Le secours Core est un travail Doctor, sans minimum Animals ni capacité Violence, qui approche, prend et dépose un patient à terre hors lit. L’affectation normale précède le ramassage ; propriété, réservation et occupation sont distinctes. Le soin d’un animal couché au sol demeure permis dans le code Core actuel : V310 n’introduit donc pas un veto au soin vétérinaire hors couchage.

Les adaptations Elsewhere sont explicites :

- Le secours vise seulement les cinq espèces **possédées**, par un colon libre avec **Médecin activé**, manipulation et déplacement possibles. L’ordre direct ne contourne pas Doctor0 ou la mobilisation. Il ne demande ni arme, niveau Animaux, violence, médicament, aliment ou tirage de réussite.
- L’automatique refuse un ennemi vivant proche dans 25 cases et les dangers locaux du patient. L’ordre direct conserve les refus locaux du patient et peut ignorer cette proximité distante ; les classes Unity Danger.None/Some/Deadly ne sont pas reproduites à l’identique.
- L’ordre direct refuse la politique `none`. L’automatique peut rejoindre une place normale pour ce patient, conformément à la distinction Core ; une place médicale refuse toujours `none` et l’abattage. La politique de médicaments reste indépendante de l’alimentation V279.
- Un seul type de place est livré : classement médical → affectation normale → autre normale, avec distance et ID stables. Les différences entre types, qualités et tailles de boîtes/lits Core ne sont pas inventées.
- Le ramassage ne soigne pas et ne restaure pas le sang. Le repos sur la marque gratuite utilise les valeurs médicales de sol existantes ; aucun bonus hospitalier, confort, qualité ou immunité supplémentaire n’est ajouté.

## Place, affectation et sommeil

**Architecte → Meubles → Emplacement de couchage animal** pose immédiatement une marque **1 × 1**, orientation 0, sans matériau ni travail de construction. L’inspection propose **Usage médical** et distingue place disponible, affectation, secours en cours et occupation réelle. Retrait et changement de mode sont immédiats. La marque n’a ni PV, qualité, factures, rôle prisonnier, installation emballée ou tâche de chantier.

La pose conserve les zones de stockage/culture, pâturages, conduits, végétaux et biens au sol. Elle refuse massif/eau, ressource rock, édifice ou plan de sa couche sur la case. Une pile de fragments peut cohabiter avec la marque : son usage attend toutefois que la case soit praticable. Une pile déposée ensuite ne rend pas la structure de sauvegarde malformée ; la réconciliation libère les tâches qui ne peuvent plus l’utiliser. Les limites d’usage demeurent distinctes de la légalité du marquage.

Une place normale est affectée au premier trajet de repos ou secours admis, avant ramassage. `DomesticAnimal.bedId` décrit cette propriété persistante : elle peut survivre à une interruption du secours. Une place médicale n’a pas de propriétaire permanent. `WildAnimal.animalRest` décrit uniquement le trajet ou l’occupation actuels ; deux animaux ne peuvent occuper la même place, deux transports ne peuvent réserver la même destination, et une affectation normale ne constitue pas à elle seule une occupation.

Un animal mobile fatigué ou nécessitant du repos cherche une place disponible par sa navigation Wildlife existante, avec enclos/portes et budget de recherche conservés. Le repos médical peut utiliser une place médicale si les soins sont autorisés ; le sommeil ordinaire cherche une place normale. Faim, danger, services, récupération et disparition du lieu peuvent interrompre le trajet ou le sommeil. Sans place ou chemin disponible, le sommeil au sol historique reste possible. Le soin et l’alimentation assistée peuvent accéder à un patient occupant réellement la place ; l’occupation n’est pas une réservation de service qui les exclut.

## Secours physique et interruptions

Le planner Médecin et la fiche **Secourir · nom du colon** partagent la même tâche. L’admission vérifie patient vivant possédé à terre, hors couchage, sans abattage, accès au patient et à une destination libre, disponibilité du porteur et absence d’un autre service réclamant le patient. Soins, alimentation, conduite, traite, tonte et abattage restent exclusifs pendant le transport. Le porteur ne peut partager son travail avec une pile portée, un meuble emballé ou une autre tâche.

L’approche finit au contact physique, diagonales avec contrôle du coin. Le ramassage attend la fin des segments du patient et du porteur ; il supprime le trajet autonome, repas ou accouplement pendants du patient. La phase `carry` copie profondément position et segment humain, y compris délais capturés, stagger et stuns. La faim, santé, saignement et vie du patient continuent ; sa locomotion autonome ne remplace pas ce segment. Aucune durée fixe de travail, expérience de dressage, apprivoisement ou souvenir de secours humain n’est attribué.

Le dépôt attend l’arrivée physique sur la place et la fin du segment. Le lien de transport disparaît ; `animalRest.phase='sleep'` matérialise l’occupation. Un patient médicalement **à terre reste downed**, sans devenir un dormeur mobile. Les médicaments V277 et portions V279 doivent ensuite être réellement collectés, portés et utilisés ; le dépôt n’en crée aucun.

Doctor0, mobilisation, stun, incapacité, autre tâche, décès, récupération du patient, perte de propriété, abattage, retrait du lieu ou impossibilité de l’utiliser libèrent le transport par la réconciliation commune. Avant ramassage, le patient reste inchangé. Après ramassage, une dernière synchronisation conserve exactement l’edge déjà engagé et la position physique ; il finit ce mouvement sans propriétaire invalide ni téléportation. La réservation se libère immédiatement, tandis que l’affectation normale peut subsister. Une mort suit la conversion commune en une seule dépouille ; la saturation du sol reste gérée par ce pipeline, sans effacer l’identité ou le corps.

Le passage normal→médical efface l’affectation et conserve l’occupation d’un patient encore admissible. Le passage médical→normal peut affecter le véritable occupant. Le retrait libère affectations, repos et destinations de secours sans restaurer santé ou ressources.

## Persistance et frontières

Les champs prospectifs sont facultatifs et absents dans les anciennes parties :

```ts
AnimalRescueTask = {animalId:number; spotId:number; phase:'approach'|'carry'};
AnimalRestTask = {spotId:number; phase:'travel'|'sleep'};
// Pawn.animalRescue? ; WildAnimal.animalRest? ; DomesticAnimal.bedId?
// Structure.kind='animal-sleeping-spot' ; medical?:true
```

`validateAnimalRest` et `validAnimalRestTransport` portent la même garde normative fichier/Decoder pour structures, affectations, usages et transports. ID, clés, phases, vraie destination, propriétaire exclusif, patient unique, position d’occupation, endpoint de route, absence de chemin autonome du porté et edge exact du porteur restent stricts. Les stuns copiés appartiennent au segment capturé ; ils ne sont pas reconstruits avec la vitesse animale.

Une fois libéré, le patient peut finir un segment humain même si sa santé récupère avant son terme. Faute de marqueur supplémentaire de provenance, le fichier admet pour les animaux possédés en 221 une enveloppe prospective des coûts/intervals humains ; géométrie, horloges, topologie et coût capturé demeurent contrôlés. Les états downed/dead/moving et idle après récupération peuvent conserver cet edge. Le Decoder vérifie l’edge copié pendant `carry` ; son périmètre historique Wildlife hors tâche reste inchangé, sans appel à `validateWorld` complet ni nouvelle réparation implicite.

La migration **220→221** valide d’abord l’ancien schéma strict, puis change uniquement son numéro. Champ ou kind V310 déclaré en 220 est refusé avant migration ; aucune place créée, nouvelle affectation, déplacement, tâche rétroactive, reset de travail, quantité, compétence ou flux aléatoire. Aucun `false`, `null` ou `undefined` déclaré ne remplace l’absence canonique des nouveaux champs.

## Contrôles et limites

### Simulation et frontières

Les quatre nouveaux fichiers `animal-rescue-core-v310`, `animal-rest-core-v310`, `animal-rest-persistence-v310` et `animal-rescue-presentation-v310` passent **42 cas en 12,205 s**, journal `v310-group-reprise-2026-10-11T00-27-43.153Z-7148`. Ils couvrent les cinq espèces, admission, contacts, interruptions, edge capturé, mort et dépouille, vrais soins/alimentation, affectation/occupation, modes et retrait, migration stricte, fichiers et Decoder, ainsi que la construction TSL des modèles et trajectoires.

Le groupe élargi acquiert **90/91 cas dans neuf fichiers en 19,153 s**, `v310-final-group-2026-10-11T00-31-59.062Z-20284`. La reprise commune acquiert **60/62 cas dans sept fichiers en 16,585 s**, `v310-shared-reprise-2026-10-11T00-33-11.539Z-12184`. Les trois refus historiques viennent de fixtures rétrodatées portant des champs futurs : `zoneId` sous134 et permission de pâte nutritive sous211/213. Le nettoyage est limité à ces champs ; les attendus réintroduisent explicitement la permission au passage217, sans modifier les gardes produit. La reprise des deux fichiers de soins/alimentation passe **26 cas en 8,595 s**, `v310-save-fixtures-final-2026-10-11T00-38-53.513Z-19916`. Le fichier de conduite corrigé passe dans la reprise commune. Ces groupes se recouvrent et ne constituent ni un total unique ni la suite complète.

Le premier groupe reste **FAIL 12,252 s**, `v310-first-group-2026-10-11T00-25-55.839Z-8676` : échéance stun de fixture hors borne, repos comparé avant le coût du trajet, clé de cible incluse dans une comparaison de géométrie, et véritable erreur de classement des destinations. La correction produit garde une seule recherche pondérée et termine le groupe prioritaire accessible, au lieu de tronquer la recherche au premier lit proche ; le chemin historique sans rang reste conservé. Le premier typage reste rouge15,673s : tables exhaustives et types de fixtures corrigés, puis reprise complète PASS15,412s (`v310-types-reprise-2026-10-11T00-28-44.567Z-14196`).

### Parcours matériel et corpus historique

Le parcours clinique préparé **Chrome, WebGPU, 2560×1440** passe **79,235 s**, `v310-native-final-2026-10-11T00-33-49.977Z-11760`. Les vraies commandes posent une place médicale et une normale, transportent le même mufalo blessé, interrompent et reprennent le secours, déposent le patient, puis collectent et consomment **un médicament et 34 unités de riz**. Une interruption alimentaire conserve la portion réelle avant reprise. Un lièvre fatigué rejoint la place normale et restaure son repos ; le patient médical reste à terre avec ses blessures pansées, sans guérison synthétique.

Dix sauvegardes/recharges comparent le monde complet exactement aux ticks **3000,3059,3059,3107,3158,3211,3248,3267,3341,3341**. Le milieu d’edge compare les quatre composantes des trajectoires GPU du patient et du porteur ; le patient garde son identité et son modèle d’origine, sans pile vivante. Rapport, checkpoints, WGSL réellement généré et trois PNG inspectés se trouvent sous `tmp/animal-rescue-v310/native-final/animal-rescue-v310-V310-na-4241c-food-cargo-and-normal-sleep/`. Aucune erreur page/console ; les **2623 entrées figées** source/tests/publics sont exactes après le contrôle. Chrome et Vite5381 propres au parcours sont fermés.

Le premier natif demeure FAIL37,010s (`v310-native-first-2026-10-11T00-29-15.374Z-22508`) : l’oracle attendait l’ancienne échéance de décision après libération, alors que la réconciliation réveille légitimement l’animal au tick courant. Les positions, santé, identité et quantité restent contrôlées exactement. Reprise PASS78,239s puis parcours final identique avec PNG effectivement enregistrés ; aucune règle de secours n’est détendue. La génération privée de vignette comporte aussi un premier refus de pilote cherchant uniquement `<polygon` dans un SVG fait de `<path` ; garde corrigée puis PASS9,410s, sans changement de modèle.

Le corpus public frais passe **63/63 références, 66 fichiers en 69,180 s**, `v310-public-reprise-2026-10-11T00-36-13.314Z-11164`, rapport `tmp/animal-rescue-v310/public-controls/public-context-check-pTM5gb/`. Migrations, reprises canoniques et un vrai tick ordinaire par référence sont exacts ; RAW et corps littéral du MAIN courant conservent les anciennes vues et donnent les mêmes continuations. Recensement et empreintes source/publics/contrôles sont identiques avant/après. Le premier lancement demeure FAIL1,150s : copie privée avec fins de ligne normalisées, réparée en recopiant les octets littéraux du MAIN ; aucun public ni assertion produit modifié.

### Présentation commune, compilation et limites

La présentation commune dans Chrome passe **121,956 s**, `v310-presentation-final-2026-10-11T00-39-19.887Z-27208`. Minage186→162 au tick2885, abattage262→238 au tick2887 ; aucune erreur, starvation, occupation rocheuse, saut ou retrait avant confirmation. Réponses visibles maximales52,2/16,6ms, sous la borne100ms. Rapport et deux PNG inspectés : `tmp/test-runs/v310-presentation-final-2026-10-11T00-39-19.887Z-27208/artifacts/`. Chrome et serveur propres au contrôle sont fermés. Ce résultat qualifie Chrome ; le refus TintIR Chromium V309 reste historique, sans réparation ni qualification Brave revendiquée.

Typage complet final `--singleThreaded` : **PASS14,247s**, `v310-types-final-2026-10-11T00-42-01.041Z-2160`. Build Vite mode Pages séparé : **PASS2,266s**, `v310-pages-final-2026-10-11T00-42-24.019Z-22492` ; harnais public littéral typé **5,401s**, `v310-public-types-final-2026-10-11T00-42-35.889Z-28204`. Les deux commandes produit ne sont pas présentées comme une exécution unique de `npm run build:pages`.

Le contrôle documentaire passe **1,973 s**, `v310-docs-final-2026-10-11T00-43-53.210Z-18060` : liens, six en-têtes221 et sources originales conservés. Le dossier utilisateur `references_UI/` reste hors lot ; aucun payload historique ni source publique n’est réécrit. Les rouges et rapports restent sous `tmp`, sans remplacement des archives historiques.

Les boîtes et lits rembourrés, confort/qualité/immunité hospitalière, chirurgie animale, secours d’animaux sauvages ou étrangers, animal sauveteur d’humains, Scaria, caravanes animales, DLC et quotas automatiques d’abattage restent absents. Aucun nouveau public isolé ni régénération des checkpoints historiques n’est demandé. Ce lot ne certifie ni campagne annuelle, fréquence naturelle, balance générale, performance CPU/GPU,240FPS ou débit ×6 constant.

Liens de maintenance : [inventaire](implementation-status.md), [catalogue](content-catalogue.md), [guide joueur](player-guide.md#secourir-et-coucher-un-animal--v310), [feuille de route](../ROADMAP.md), [recherche primaire](../research/animal-rescue-core-v310.md). La validation datée reste dans cette note unique ; les synthèses ne dupliquent pas les journaux.

## Publication regroupée avec V311

Le lot est inclus dans la publication unique `5f225003` du11octobre2026 sur [Cloudflare](https://elsewhere-cq7.pages.dev/). [Preuves et limites de publication V309–V311](../development/cloudflare-pages.md#publication-regroupée-v309v311) ; les contrôles de jeu datés ci-dessus ne sont pas rejoués ni transformés en benchmark par cette publication.
