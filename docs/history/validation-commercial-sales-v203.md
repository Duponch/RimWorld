# Validation des ventes de textiles V203

Relevé du 4 octobre 2026, base V202 `c9abf50`, **schéma 185** après validation stricte de 184 et migration de version seule. [Contrat](../development/caravan-sales-v203.md), [recherche Core et arbitrages](../research/caravan-sales-core-v203.md), [guide](../gameplay/player-guide.md#vendre-des-textiles-au-comptoir--v203). Nouvelle décision G5 : exporter des textiles produits par les filières existantes pour financer les fournitures du poste. Aucun nouvel objet, recette, planète, groupe ou clôture de jalon.

## Simulation et intégrations ciblées

**72 tests uniques dans 17 fichiers passent par composition** : matrice71/71 (`tmp/v203-targeted-final.json`), puis18/18 ciblés de garde/reprise (`tmp/v203-final-guard-fixed.json`) comprenant un contrôle supplémentaire. Agrégation par fichier/nom dans `tmp/v203/aggregate-tests.json`, pas une passe unique72/72. Neuf nouveaux contrôles simulation, cinq de sauvegarde/bridge et quatre UI sont inclus, avec achats V193, chargement/reconnaissance, laine V120, catalogue et publication worker. Les campagnes naturelles, la régression quotidienne entière et la suite exhaustive ne sont pas exécutées.

Départ sans argent, prises et réservations au contact, source refusée/détruite, annulation conservant les prises, vraie sortie et propriétaire hors carte, vente puis achats dépassant l'argent initial, invendus et dépôts, continuation à chaque phase, devis périmé, fonds finis, capacités/identités, divisions/conditions, 33 ventes avec reçus tronqués, réassort strict et cumuls conservés sont exercés. L'encodeur publie vente et achat au même tick ; le decoder refuse une corruption sans adopter sa révision et accepte ensuite le paquet correct original. Les champs futurs, y compris propriétés `undefined` examinées directement, sont refusés sous184 avant migration.

Revue indépendante : deux gardes produit consolidées, inventaire textile admissible sous185 seulement et provenance du stock du poste. Celui-ci doit être au plus le cumul des ventes et au moins les ventes récentes de sa génération courante ; aucun textile magique ni stock vendu disparu pendant cette génération. Paiement, biens, IDs et compteurs sont engagés uniquement après validation de drafts, sans RNG de transaction. Le réassort peut remplacer explicitement l'ancien stock tout en conservant les cumuls.

Journaux initiaux conservés : `tmp/v203-targeted-first.json` a28réussis/4échecs, tous dus à la fixture publique demandant80 tissus dans une pile limitée à75 ; la préparation est corrigée à75. `tmp/v203-save-repair.json` a3/4 : le dernier oracle envoyait un nouveau delta après avoir refusé sa base ; il réutilise désormais le paquet original correct, avec témoins immuables et assertion de refus conservés. Une fixture de réservation/UI d'agent a été corrigée pour respecter son type réel et la masse ration300g ; ces réparations de pilotes ne sont pas de nouvelles mécaniques.

**Typage et build passent,696 modules**, `tmp/v203-build-final.log`. Avertissement Vite de gros chunks conservé. Les tests courts d'agents se recouvrent avec la matrice centrale ; ils ne s'ajoutent pas à72.

## Scène publique et interface native

La **49e scène « Ventes de textiles ·3colons »**, `public/test-saves/v203/ventes-textiles.json`, prépare32²/graine42/tick3000, trois adultes sains, quatre rations,75 tissus et60 laines au sol, aucun argent. SHA256 `a19b4c2c11210d496ff051ca7d6a8816c1ce8229ac0d48dd6976944ecc6d1090`. Aucun chargement, voyage, comptoir, vente, achat ou retour déjà accordé. La production des textiles est préparée, pas une campagne agricole/d'élevage. Le catalogue accepte au plus64 fiches, avec frontière64/65 testée et limiteHTTP128Kio conservée ; ouvrir le menu ne charge pas les49 payloads.

**Chromium153.0.8010.12 matériel, WebGPU AMD rdna-1 sans fallback :1/1**, `tmp/v203-native.log`, rapport `tmp/test-runs/commercial-sales-v203-native/artifacts/commercial-sales-v203-native.json`. Vraie entrée publique, aucune substitution de manifeste/payload, commandes UI/worker et reprises exactes : préparation3000 ; prise/reprise3011 ; sortie3038 ; visite observée3795 ; vente et achat3795 ; retour inventorié4545 ; dépôts achevés4554. Le tick de pause observé n'est pas la durée logique de la jambe750.

Les60 tissus et40 laines vendus rapportent **121 argent** ; un médicament et un composant coûtent **69**, prix propres à ce négociateur préparé. Le retour conserve **52 argent,15 tissus,20 laines, les deux fournitures et les rations non mangées**, déposés au contact. Une ration a été réellement consommée. Les textiles vendus et l'argent reçu/payé restent chez leurs propriétaires respectifs, sans crédit distant ou duplication.

**76→76 pipelines**, géométrie humaine stable,3→2→3 instances au départ/retour et aucun acteur local hors carte. Trois captures UI sauvegardées, préparation et vente relues visuellement. Aucune erreur JavaScript/WebGPU du parcours ; warnings TSL historiques distincts. Preuve de résidence bornée à cette scène, aucun chronométrage GPU ni coût nul annoncé.

## Mesure CPU isolée et présentation

CPU, build, navigateur et présentation exécutés successivement avec sources produit gelées. `scripts/profile-commercial-sales-v203.ts`, `tmp/v203/commercial-sales-cpu.json` : Node24.11.1, Ryzen5 3600, camp préparé250²/trois acteurs/1000 piles au sol sans lien au manifeste. Vingt warmups et200 échantillons individuels ;1/10/30 sources textiles. Les prises/sortie/arrivée réelles sont hors chronométrage ; états/devis/empreintes restent exacts avant/après.

| Sources | Réconciliation chargement p50/p95 ms | Devis vente p50/p95 ms |
| --- | --- | --- |
|1|0,014 /0,022|0,018 /0,030|
|10|0,088 /0,111|0,026 /0,043|
|30|0,259 /0,284|0,052 /0,088|

Mesure absolue, sans comparateurA/B : elle borne ces consultations et leur croissance dans la préparation choisie, pas le tick complet, la carte active, le GPU, les FPS ni une amélioration générale. Aucun nouveau shader, lot d'acteur ou update graphique par voyage n'est ajouté. La première tentative du script CPU utilisait le retour `void` d'`addMaterial` : corrigé dans le banc seulement avant acquisition de cette mesure.

`npm run test:presentation` passe à250² sur minage puis abattage :10813/10682 images, p50RAF4,2ms et p95RAF4,3ms, maxima20,9/33,4ms ; zéro saut, excès continu de déplacement ou occupation solide. Rapport `tmp/test-runs/commercial-sales-v203-presentation/artifacts/harvest-sync-verification.json`. Ce contrôle observe horloge/bridge et travaux de récolte, pas une campagne commerciale ou un chronométrage GPU. Sources historiques et corpus originaux préservés ; pas de push automatique. Paniers vente/achat successifs avec deux arrondis, refus sans don et rachat textile différé sont des adaptations explicites, pas une interface Core exhaustive.


## Consolidation finale et portée

Après le parcours natif acquis, une garde de sauvegarde borne aussi le nombre minimal de sources textiles du manifeste initial, même après vente. Le premier contrôle a montré que la borne calculée avec le plus grand stack n'était pas assez précise pour le tissu75/laine100 : elle utilise maintenant la somme des arrondis supérieurs par matière ; les18 contrôles concernés passent. Les sources servies du parcours natif et de présentation étaient gelées ; ce correctif concerne les états invalides et conserve leurs états observés. CPU et build ont été réexécutés sur les sources finales. Aucun autre navigateur ou campagne n'est présenté comme une nouvelle exécution.

Les **49 payloads publics** passent hashes, validation stricte/migrations, roundtrip et un tick réel de continuation exact, `tmp/v203/payloads.json` ; les48 fiches antérieures sont inchangées. Ce contrôle court ne remplace pas leurs campagnes. Les entrées courantes, guide, catalogue, architecture, adoption du corpus et instructions sont raccordés au schéma 185 ; les résumés obsolètes V201 de la roadmap/validation sont corrigés. Les productions préexistantes ne deviennent pas des acquisitions naturelles prouvées par cette scène.

Recherche, nouvelle boucle, corrections produit, réparations de préparation/oracle et mesures restent séparées. Mode jour après commit local ; aucun push. La réalisation a utilisé recherche/revue, simulation et interface sur fichiers distincts avec intégration centrale, puis mesures successives ; pas d'économie chiffrée de tokens ou de temps revendiquée.


`npm run check:docs` passe :695 documents,6767 liens locaux,25 domaines/cinq familles, six en-têtes courants185 et trois originaux byte-identiques (`tmp/v203-docs-final.log`). Repères de travail non additionnables : contrat initial12:28 → premier ciblé12:36, environ8min de mise en œuvre/intégration ; recherche créée12:31 puis arbitrages terminés12:41, fenêtre d’environ10min incluant la revue, cadrage antérieur non chronométré ; premier ciblé12:36 → build final12:55, environ19min incluant diagnostics et finitions. Recherche et code ont avancé en parallèle ; ces fenêtres ne sont pas des chronométrages purs par phase. Les reprises ciblées ont conservé le parcours natif et la présentation acquis plutôt que de les rejouer pour une garde d’état invalide.
