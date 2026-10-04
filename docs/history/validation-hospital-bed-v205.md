# Validation V205 — lit d’hôpital

Lot du 4 octobre 2026, schéma **187**, baseline **8c4ddb3**. [Contrat](../development/hospital-bed-v205.md), [recherche Core](../research/hospital-bed-core-v205.md). Une nouvelle boucle de recherche, construction et usage médical ; moniteur vital, sols stériles et hôpital exhaustif restent différés. Core 1.6.4871 exige aussi Matériaux stériles : son omission locale est une adaptation explicite, pas une règle Core.

## Simulation, sauvegardes et reprises

**159 scénarios ciblés uniques dans 29 fichiers passent par reprises**, sans suite exhaustive ni campagne longue supplémentaire. Les trois ensembles successifs ont parcouru 11 fichiers/65 cas, 14 fichiers/75 cas puis 9 fichiers/46 cas ; les derniers résultats remplacent ceux des fichiers rejoués. Les cinq nouveaux fichiers V205 comportent **28 cas**, tous rejoués sur les sources finales avec rapport `tmp/v205/targeted-final.json`. Les résultats des ensembles antérieurs sont ceux des commandes ciblées, pas des rapports JSON prétendument produits.

Les contrôles exercent recherche au vrai poste alimenté et refus de parents absents, construction/livraisons de 120 acier et cinq composants, dernier composant manquant, Construction 7/8, qualité à la finition, rôles médical/prisonnier, réservations et accès, secours, soins et auto-soin, immunité, guérison naturelle et chirurgie, réparation, désinstallation/transport/réinstallation et continuation. Un patient déjà dans un lit valide conserve son service ; réservation, portage, marche et sol n’accordent aucun bonus hospitalier. L’auto-soin au chevet n’acquiert pas le bonus d’un lit que le médecin-patient a quitté.

Les sauvegardes 186 sont validées avant migration neutre : aucun ouvrage, projet, médicament, bonus passé ou progression n’est ajouté. Le nouveau contenu est refusé sous 186. Les corruptions de matière, qualité, PV, recherche et enveloppes sont rejetées avant adoption des snapshots. Le garde hospitalier est partagé entre sauvegarde et bridge, sans réunir temporairement leurs collections.

Les premiers ensembles ont détecté des défauts distincts. Le produit a été corrigé pour la qualité du lit emballé et les refus stricts/atomiques des états hospitaliers. Les préparations cliniques ont reçu leurs parents de recherche explicites ; l’oracle d’immunité lit filtration et âge réels. Le contrôle de désinstallation distingue une désignation permise d’un enlèvement bloqué par la réservation, sans retirer la conservation ni le contrôle du secours. L’oracle indépendant des empreintes reconnaît le nouveau meuble tout en gardant les refus des objets non constructibles.

## Parcours réel et présentation

**Chromium matériel WebGPU 1/1 passe**, version **153.0.8010.12**, AMD **rdna-1**, sans fallback logiciel. La scène préparée 32² est d’abord importée depuis le menu réel, avant sa publication. Travail, Recherche, Architecte et commandes médicales déclenchent les transitions ; aucune mutation distante du World ne remplace les livraisons ou soins.

Recherche terminée au tick 3067, cadre travaillé au tick 3449, lit construit au tick 3753 : acier, qualité bonne, médical initial. Mina rejoint effectivement l’ancre au tick 3782 ; son modèle repose à y=0,5. Ada porte une dose réelle pendant le soin au tick 3832 ; le soin est achevé et la dose consommée au checkpoint 3901. Sauvegarde/recharge exactes pendant cadre et traitement. Rapport `tmp/test-runs/v205-native-b/artifacts/hospital-v205-native.json`, captures iso/perspective inspectées dans le même dossier.

La géométrie résidente du mobilier conserve son identité **505**, les instances passent **34→52**, les pipelines **76→76**, aucune erreur relevée. Cette stabilité ne mesure pas le temps GPU. La première tentative native a expiré avant la fin des livraisons : le checkpoint gardait 120 acier répartis entre chantier, sol et porteur, sans perte. Le pilote attend maintenant ces transports à vitesse 6 puis reprend ses checkpoints en pause ; aucune livraison ou durée métier n’est court-circuitée.

`npm run test:presentation` passe sur carte **250×250**, minage et abattage observés chacun 45 s : aucun saut, excès de trajet, occupation solide ni starvation détectés. Rapport `tmp/test-runs/v205-presentation/artifacts/harvest-sync-verification.json`. Intervalles RAF p50 **4,2 ms**, p95 **8,2/4,3 ms**, p99 **8,4/8,4 ms** ; ces parcours temporels ne prouvent pas les FPS généraux.

## Publication et compilation

La **51e** scène publique **« Lit d’hôpital · recherche et soins »** prépare trois colons, infrastructures existantes, 1 198/1 200 points hospitaliers et une contusion. Recherche, chantier, admission et soins restent à accomplir. SHA du payload : `87bf287d7250930887f2f3ed0ac4a9d7673f7acaeddd13524593331c838b4853`. Les 50 entrées et payloads historiques restent byte-identiques. **51 payloads** passent en décodage strict, SHA, sérialisation exacte et un tick réel repris (`tmp/v205/payloads.json`), séparément de toute campagne.

Typage/build TypeScript/Vite passent après intégration, **701 modules** (`tmp/v205/build-final.log`). L’avertissement historique de chunks supérieurs à 500 kB reste présent. Liens et en-têtes sont contrôlés au schéma 187, avec les trois sources originales byte-identiques. Les sorties courantes restent sous `tmp/v205` et `tmp/test-runs`; aucun résultat ne réécrit les preuves historiques. La régression périodique et le pilote commun acquis en V204 ne sont pas annoncés comme rejoués pour V205.

## CPU et limites

Microbanc CPU **successif**, sources gelées, Node **24.11.1**, Windows, **AMD Ryzen 5 3600**, carte **250²**. A/B/B/A compare l’adaptateur médical à celui de 8c4ddb3 avec dépendances communes actuelles, 30 chauffes, 100 échantillons de trois lots, 3/30/100 dossiers sains. Une continuation ordinaire d’un pas est comparée exactement. Rapports `tmp/v205/cpu.json` et `cpu-summary.json`, outil `scripts/benchmark-hospital-bed-v205.ts` ; préparer son module baseline sous `tmp/v205` depuis le commit indiqué avant reproduction.

Pour **100 acteurs couchés en lits ordinaires**, moyenne des médianes A **0,204 ms**, B **0,265 ms**, soit environ **+0,061 ms sur ce seul sous-coût**. Pour 3 et 30 couchés, différences respectives **+0,0036/+0,0056 ms**. La consultation des porteurs ajoutée est bornée aux candidats couchés ; les acteurs debout ne la font pas. Les résultats debout sont fortement affectés par chauffe/JIT et ne prouvent aucun gain général.

Adaptateur hospitalier absolu à 3/30/100 acteurs : p50 **0,0113/0,0742/0,2768 ms**, p95 **0,0316/0,1540/0,3489 ms**. Garde des métadonnées de 100 lits : p50 **0,00325 ms**, p95 **0,00477 ms**. Ces préparations n’ont ni blessure, maladie, navigation, besoin, travail ou campagne naturelle. Tick complet, worker, adoption complète, CPU image et temps GPU ne sont pas mesurés ici ; aucun coût nul ni accélération générale revendiqué. Les 18 instances par lit ont aussi un coût graphique réel.

Recherche, implantation, corrections produit, réparations de préparations/oracles et exécution des contrôles sont distinguées. Parcours natif réussi environ 1,2 min ; reprises non présentées comme un gain de temps ou de tokens. Livraison locale puis attente d’une nouvelle relance en mode jour.
