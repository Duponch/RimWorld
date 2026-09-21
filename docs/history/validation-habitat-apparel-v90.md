# Validation V90 — habitat, confort et habillement

**État au 21 septembre 2026 : V90 validée dans son périmètre.** Les preuves
distinguent contrôles, UI, mesures, pilote préparé et continuation naturelle
avec reprises. Elles ne certifient ni la parité Core ni le débit 6× à cent colons.

## Périmètre

V90 regroupe les éléments de l'habitat et de l'habillement prévus par la
[feuille de route](../ROADMAP.md) : qualité des meubles, confort et beauté, pot de
fleur, continuité des travaux d'habitat, vêtements en tissu ou cuir léger, établi
de tailleur électrique, usure journalière et remplacement par politique. Le
[contrat d'habillement](../development/apparel-renewal.md) et la
[recherche V90](../research/apparel-renewal-reference-v90.md) fixent les limites.
Les chapeaux, chaussures, ceintures, équipements utilitaires, armures fabriquées,
teinture, réparation, recyclage et éditeur complet des politiques restent hors
périmètre.

Le point de départ de l'intégration est la V89 validée (`4e14400`). La chaîne
V90 doit préserver les identités, matières, qualité, points de vie, réservations,
ouvrages inachevés, travaux et calendriers déjà sauvegardés. Une migration V89
ne crée donc ni vêtement, ni textile, ni atelier, ni recherche, ni XP, et l'usure
historique ne doit pas être rejouée.

## État des preuves

### Contrôle Vitest antérieur aux corrections finales

Le contrôle global précédent a terminé avec **151 fichiers, 636 tests réussis
et 2 ignorés**, en **1 319,02 s**. Ce résultat est un point de contrôle antérieur aux
corrections finales des fixtures et des attentes V90. Il prouve la cohérence de
ce run précis, mais ne constitue pas le résultat final du lot et ne doit pas être
présenté comme une validation de l'UI complète.

### Régressions ciblées observées

Les traces des tests Playwright ciblés ont fourni les diagnostics suivants :

- des meubles injectés dans un monde V90 sans `quality` faisaient refuser la
  sauvegarde (`Invalid furniture quality for schema`) ;
- l'attente partielle des priorités ne correspondait plus aux priorités par
  défaut complètes du nouveau générateur ;
- plusieurs clics de cellules étaient masqués par un panneau ou une section de
  l'interface au lieu d'atteindre le canvas ;
- la comparaison de migration mouvement incluait de nouveaux champs V90 qui
  devaient être neutralisés explicitement avant comparaison ;
- une fixture de politique alimentaire conservait une durée de déplacement
  incohérente ;
- la fixture de déconstruction attendait encore le libellé `Prairie` alors que
  la tuile observée exposait `Terre ordinaire` ;
- l'attente d'humeur codait encore une cible fixe alors que les nouvelles
  pensées et le retrait physique d'un vêtement recalculent la cible.

Ces causes ont été regroupées dans les fixtures et les oracles attribués. Les
parcours concernés sont rejoués séparément après correction. Les erreurs de
typage intermédiaires ont été corrigées, sans retirer d'assertion métier.

La reprise centrale a également corrigé : extinction d'une flamme laissant un
second pompier en état de marche sans tâche, validation d'habillage refusant
la somme de durées de familles différentes, isolation des nouveaux vêtements,
affichage des couches et des cargaisons, orientation des meubles, visibilité de
la fleur réellement semée et séparation des pièces pour la beauté perçue.
La régression de persistance engage un vrai remplacement tenue tribale → pantalon,
conserve ses 21 ticks capturés, refuse les durées impossibles et compare la
continuation complète. Les 27 contrôles feu/habillement/rendu/gameplay passent ;
les quatre contrôles de persistance passent ensuite (6,28 s).

La campagne ciblée finale de contrats passe ensuite : **49 contrôles dans dix
fichiers, 10,67 s**, incluant persistance, feu, confort, installations de chambre,
beauté, repas, rendu, vêtements et politiques. Le typage et le build passent.
La revue des installations a corrigé une lecture incomplète des sources :
`requiresLOS` vaut vrai par défaut dans la classe locale Core 1.6.4871, même
lorsqu'il n'est pas écrit dans la définition XML de la commode. Les tests
vérifient murs, portes ouvertes/fermées et distance entre centres d'emprise.

### Reprises UI ciblées

Le parcours UI initial a échoué pendant les fixtures avant les corrections.
Vingt contrôles historiques concernés passent désormais dans les reprises
successives : colonie, frontières, nouvelles parties, froid, cycle lumineux,
déconstruction, alimentation, hygiène, humeur, mouvement et horaires. La
restauration des colonies V84/V86/V87/V89 conserve tous leurs champs historiques
et accepte les ajouts stricts de migration. Le parcours V90 passe ensuite en
**14,4 s** (16,8 s avec lancement), soit **21 parcours ciblés réussis** au total
dans ces reprises ; ce n'est pas une nouvelle passe intégrale de toute l'UI.
Il vérifie choix du pot, chaise en acier et table longue orientées, recettes
pantalon/manteau/parka en cuir, politique, automatisation et reprise exacte.
La [capture finale](../../artifacts/habitat-apparel-ui-v90.png) montre la fixture
de commandes : ses plans ne sont pas présentés comme des meubles déjà fabriqués.

Ce parcours a aussi révélé l'absence de rotation des nouvelles chaises dans la
liste applicative des outils orientables. Chaise, fauteuil et chevet y sont
ajoutés ; le test clique le bouton visible et vérifie l'orientation acquittée.

La recette du lit en bois demande réellement 45 bois ; l'ancien oracle UI
employait encore le coût historique de huit. Le parcours coupe et range donc
la matière nécessaire, sans changer la recette. Les filtres de réserve sont
tous réglés, y compris Argent. Le menu est fermé avant de cliquer derrière lui.
Ces corrections ne retirent ni les assertions de consommation, ni les trois
lits, ni la reprise d'un transport engagé.

### Pilote contrôlé de deux jours

`artifacts/habitat-apparel-colony-v90.json` décrit un contrôle volontairement
préparé, issu de `tests/fixtures/colony-v89.json.gz` :

| Élément | Observation | Interprétation |
|---|---|---|
| Schéma et horizon | V90, ticks `969414` → `981414`, 2 jours locaux | contrôle court, non campagne naturelle |
| Matière | 60 tissu fourni | intervention de test, pas récolte observée |
| Recherche | mobilier complexe prérempli, deux derniers points laissés | frontière de déblocage contrôlée |
| Événements | raids différés au-delà de l'observation | aucune conclusion sur le calendrier des raids |
| Vêtement | seuil d'entretien maintenu à 90 % | condition de remplacement préparée |
| Résultat | 1 vêtement confectionné, remplacement d'une ancienne chemise | chaîne physique parcourue |
| Continuité | ouvrage inachevé repris exactement | preuve positive de la reprise sauvegardée |
| Habitat | chaise en bois `good`, établi identifié, 17 salissures nettoyées | preuve bornée des objets et du nettoyage |
| Vie minimale | 4 habitants vivants | garde-fou du pilote |
| Validité | `valid: true` | validation de cet artefact uniquement |

Ce pilote montre que la chaîne contrôlée peut traverser tissu, confection,
remplacement, habitat et nettoyage dans deux jours. Il ne mesure ni la durée
naturelle d'un vêtement, ni la fréquence d'un raid, ni l'équilibrage, ni la
performance. Le tissu fourni, la recherche préavancée et les raids reportés sont
des interventions explicites et doivent rester visibles dans toute reprise.

### Campagne naturelle avec reprises

Les [tentatives conservées](../../artifacts/habitat-apparel-attempts-v90.json)
distinguent trois branches : un pilote sans réaction au raid perd ses habitants ;
une reprise défendue atteint six jours avec quatre survivants mais sa boucherie
n'est plus alimentée ; une tentative de stockage supplémentaire accueille des
corps humains au lieu des lièvres et laisse les dépouilles animales pourrir.
Les trois checkpoints compressés restent associés à ce registre. La correction
du pilote doit employer les factures et ordres ordinaires de boucherie depuis
le checkpoint réel à six jours, sans créer de cuir ni modifier la conservation.
La branche pourrie à douze jours ne sera pas présentée comme la continuation
réussie d'une autre branche.

La branche finalement validée poursuit la colonie V89 du tick **969414** au
tick **1095464**, soit **J161,569 → J182,577**, 21,008 jours avec reprises.
Le [résultat](../../artifacts/habitat-apparel-natural-v90.json), le
[checkpoint et son journal](../../artifacts/habitat-apparel-natural-checkpoint-v90.json.gz)
et le [carnet de reprise](../../tests/fixtures/colony-v90.md) distinguent les
étapes acquises. Ce n'est pas une passe monolithique ni une durée moyenne Core.

Les quatre habitants survivent. Trois boucheries supplémentaires portent le
cuir cumulé de 14 à 59 ; 45 unités sont consommées par la chemise en cuir léger
`31187`, portée par Mina, qualité déplorable, 91 PV au dernier checkpoint.
Mobilier complexe est recherché depuis zéro jusqu'à 300 points au tick 1022747.
Un tailleur manuel, une table, un pot, une chaise, un chevet et une commode sont
construits ; l'hémérocalle est semée et renouvelée. Les observations enregistrent
au moins 415 semis, 164 préparations culinaires, 39 soins et 30 usages de table.
Les compteurs décrivent ce pilote et ne remplacent pas une chronologie exhaustive.

Après le checkpoint à six jours, le pilote donne le troisième ordre de boucherie
avant péremption. Au tick 1041414, la coupe est étendue au-delà des 25 cases
épuisées du pilote de départ. Au tick 1077414, deux plans sans matériau incorporé
sont annulés puis retracés sur des cases libres : la table recouvrait deux corps
humains, le chevet une arme. Ces objets restent conservés dans le monde. Au tick
1095414, tous les objectifs physiques sont acquis, mais l'oracle employait encore
les anciennes coordonnées capturées avant les nouveaux plans ; sa lecture devient
dynamique. La dernière reprise de 50 ticks passe tous les invariants et la
sérialisation/continuation exacte en 7,46 s, sans rejouer les semaines acquises.

Les [reprises pour le bois](../../artifacts/habitat-apparel-wood-resume-v90.json.gz)
et [les plans obstrués](../../artifacts/habitat-apparel-obstructed-resume-v90.json.gz)
restent disponibles. Aucun tissu, cuir, point de recherche ou délai de raid n'a
été injecté. Cette campagne ne prouve ni l'équilibrage intégral, ni une durée
moyenne de vêtement, ni l'occurrence de tous les événements en trois semaines.

## État G0–G5

| État | Niveau | Preuve et limite |
|---|---|---|
| G0 — socle et continuité | en consolidation | migrations et continuation contrôlées ; montée en charge incomplète |
| G1 — survie quotidienne | partiel | habillement et production enrichis ; catalogue incomplet |
| G2 — habitat et environnement | partiel | mobilier/confort/beauté ; impression, art et biomes incomplets |
| G3 — personnages et conflits | partiel | couches et effets physiques ; social, santé et conflits incomplets |
| G4 — histoires et progression | engagé | recherche et contenu enrichis ; narrateur, quêtes et économie incomplets |
| G5 — monde et consolidation | absent | aucun système mondial livré par ce lot |

## Reproduction et limites de charge

Le commit de livraison de ce document succède à `4e14400`. Le schéma est V90.
`npx vitest run tests/habitat-apparel-natural.test.ts` lit la fixture V89 ;
`HABITAT_APPAREL_NATURAL_CHECKPOINT` permet les reprises décrites ci-dessus et
`HABITAT_APPAREL_NATURAL_DAYS` borne le diagnostic supplémentaire. Le journal
conserve les commandes et les checkpoints conservent les mondes réellement atteints.

`npx playwright test tests/integration/v90-ui.spec.ts` rejoue les commandes
natives du lot. Les bancs `scripts/research-bench.ts` puis
`scripts/research-render-bench.mjs` tournent avec `HABITAT_APPAREL=1` et
`VALIDATION_VERSION=v90`, successivement, sans pilote lourd concurrent.
Les [mesures complètes](../research/performance-v90.md) conservent CPU p95
79,65 ms, image native p95 33,4 ms, maximum 112,5 ms et débit 2,324×/6×.
Les optimisations ne certifient donc pas la vitesse 6× à cent colons.

`npm run test:presentation` passe ensuite : minage et coupe, changements 1×/6×/3×,
zéro saut et zéro occupation solide relevés. Images p95 8,5/8,4 ms, maxima
45,7/50 ms ; ces petites charges sont distinctes du banc à cent colons. Le build,
le typage et le vérificateur documentaire passent avant publication.
