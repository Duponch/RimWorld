# Validation de l’expédition commerciale V193

Relevé du 3 octobre 2026 ; base V192 `53fd6d8`, **schéma 180**. [Contrat](../development/caravan-trade-v193.md), [recherche Core](../research/caravan-trade-core-v193.md), [guide](../gameplay/player-guide.md). Première destination civile abstraite : engager une personne, rations et argent réels, choisir des fournitures, puis les ramener. Aucun nouvel item/recette ni planète, groupe, rencontre, vente générale ou diplomatie. Les durées3h/1h/3h et l’attente d’entrée sans besoins restent des adaptations déclarées.

## Contrôles ciblés et corrections

**111 tests uniques dans26 fichiers** passent par composition. La première passe82 avait78 réussis et4 anciens oracles rouges. La passe élargie100 avait98 réussis et2 autres fixtures historiques rouges. Les gardes finales et ces deux réparations passent21/21 dans5 fichiers ; l’admission capsule, quête et capacité passe14/14 dans3 fichiers, dont11 nouveaux contrôles de capsule dans la matrice. Il ne s’agit ni d’une unique passe111/111, ni de la régression exhaustive ni des campagnes naturelles longues.

Les six réparations concernent uniquement les tests : permissions alimentaires/vestimentaires futures retirées des fixtures rétrogradéesV65/V87/V135/V150/V170 ; oracle V182 vérifie son hash immuable, provenance et migration intégralement neutre plutôt qu’une égalité au générateur contemporain ; transport chirurgical historique178 vérifié avec le validateur du schéma courant puis gardes de snapshot178 inchangées. Aucun JSON historique ni validateur n’est assoupli. Les journaux initiaux rouges sont conservés.

Nouveaux contrôles : masse de toutes familles portées, argent/rations/biens et poids limite ; RNG de stock distinct, tirages/réassort strictement après30jours, états et identités ; prix de site distinct du visiteur ; préparations/refus byte-exacts, sources quantitatives concurrentes, annulation après prise, réel circuit avec consommation de ration, achat/reprise, entrée fermée, retour inventorié et dépôts sur cellules distinctes ;179 strict avant migration neutre, rejet des champs commerciaux futurs, corruption des phases/horloges/quantités/propriétaires, création du poste et achat au même tick, immutabilité du decoder après refus. Deux gardes de capacité incluent la personne et les piles hors carte ; le scénario plafond de32768 piles prépare une frontière de transaction, il ne simule pas un voyage ou une campagne de32k objets.

La revue indépendante a identifié deux corrections produit : collisions d’identités du comptoir/voyage avec la carte et les archives dans le decoder ; achat partiel pouvant dépasser le plafond global de piles après draft. Les commandes refusent avant commit. Les admissions capsule/arrivée/visiteurs incluent maintenant le registre absent, comme quêtes/raids. La réconciliation commerciale couvre aussi une source future détruite pendant une arête engagée, sans effacer ce segment ou accorder des biens. L’entrée civile commune conserve les contraintes historiques de la reconnaissance ; son trajet publicV182 est rejoué.

Journaux : `tmp/v193-targeted-initial.log`, `tmp/v193-targeted-final.log`, `tmp/v193-targeted-repair.log`, `tmp/v193-admission.log`. **Typage final et build passent,673 modules** (`tmp/v193-typecheck-final.log`, `tmp/v193-build.log`). L’avertissement Vite de taille des chunks reste présent ; il ne constitue pas un échec.

## Catalogue et navigateur réel

La **43e scène publique « Expédition commerciale ·3 colons »**,32² préparée, graine42/tick3000, est publiée dans `public/test-saves/v193/expedition-commerciale.json`. SHA256 : `a9c58cb58ba62fbbc5d095ea38256514b00184e0dc3ccaf66f9a876ed8650df4`. Ada faim35, trois adultes sains, quatre rations et600 argent répartis500+100 sur deux cellules ; terrain dégagé, priorités de travail et incidents naturels hors preuve. Aucun départ, inventaire chargé, stock, achat ou retour accordé. Générateur indépendant du helper de simulation16²/700 argent. Les **43 payloads publics** passent hash de contenu, décodage gzip éventuel, validation stricte/migrations et roundtrip exact sous180 ; anciennes entrées et fichiers conservés (`tmp/v193/catalogue-check.json`).

**Chromium153.0.8010.12 matériel, WebGPU natif :1/1**, menu public réel et commandes UI/worker, sans substituer le payload ni le manifeste. Simulation et rendu confirmés aux checkpoints : préparation3000 ; argent chargé/reprise3011 ; sortie physique3038 ; comptoir observé en pause3795 ; achat au même tick3795 ; retour inventorié4545 ; déchargement achevé4550. L’horloge d’arrivée logique est3038+750, la pause UI est acquittée ensuite ; ne pas confondre le tick observé3795 avec la durée contractuelle750. Reprises exactes pendant chargement, aller, visite, achat, retour, déchargement et état final.

Le panier prend **2 médicaments et3 composants pour181 argent**, poids6752g ;419 argent et3 rations coloniales restent à la fin, une ration du voyage a été réellement mangée. Argent versé au poste, acquisitions et rations sont comptés entre leurs seuls propriétaires. Prix propre à ce profil préparé, non un prix garanti universel. Fermer Monde/sauvegarder ne fait pas repartir ; achat n’a pas déclenché retour, commande explicite l’a fait. Délai automatique et attente fermée sont exercés en simulation ciblée, pas en campagne naturelle.

**77→77 pipelines**, même géométrie humaine541 ; instances3→2→3 au départ/retour, aucun acteur local simulé ou rendu hors carte. Probe plafonné aux4096 dernières images. Aucune erreur JavaScript/WebGPU ; avertissements Three.TSL historiques conservés. Deux captures UI relues : panier Monde et retour. Rapport `tmp/test-runs/commercial-v193-native/artifacts/commercial-v193-native.json`, captures dans le même dossier. Cela prouve la résidence de cette scène ; pas coût GPU nul, temps GPU général ou FPS constant.

## CPU et présentation — successifs

CPU isolé, puis build, puis navigateur natif, puis présentation ; aucune mesure lourde parallèle ni mutation des sources servies. Node24.11.1/V8 13.6, Windows10.0.26300 x64, Ryzen5 3600/12 processeurs logiques/16Go. `commercialCamp(250)` prépare **250² vide, trois acteurs**, sans flore/bâtiments/charge générale. Les vraies transitions et vérifications sont hors chronométrage.200 échantillons individuels domaine,50 pour decoder, cinq warmups par consultation ; World, RNG, paquets et empreintes des sources inchangés. **Absolu, sans comparateur A/B** (`tmp/v193/commercial-cpu.json`).

| Consultation | p50ms | p95ms |
| --- | ---: | ---: |
| Aperçu masse2 rations/600 argent |0,0019|0,0033|
| Réconciliation chargement intact3 sources |0,0067|0,0090|
| Devis2 médicaments/1 composant |0,0166|0,0283|
| Adoption checkpoint au comptoir |0,1167|0,2007|
| Adoption delta d’achat au même tick |0,0570|0,1232|

Encodage, cloning du paquet, decoder neuf et amorçage du delta exclus des timings ; pas de gain général de simulation, worker, FPS ou GPU établi. Aucun nouveau travail graphique/matériau/buffer par image. Devis UI seulement aux mises à jour pertinentes et entrées du panier ; stock non tické, renouvellement paresseux à l’arrivée confirmée.

`npm run test:presentation` passe à250² sur minage puis abattage,10 820/10 721 images ; p50RAF4,2/4,2ms, p95 **4,3/4,3ms**, maximum20,9/33,3ms. Zéro saut, excès continu de déplacement ou occupation solide. Ce contrôle d’horloge/bridge ne mesure pas une campagne commerciale ou le GPU ; les phases V193 ont leur propre parcours natif. Rapport `tmp/test-runs/commercial-v193-presentation/artifacts/harvest-sync-verification.json`.

## Documentation et méthode

Contrat, recherche, guide, catalogue, six en-têtes courants, inventaire, roadmap et instructions raccordés au schéma 180. La recherche conserve IL/XML locaux1.6.4871rev590, SHA de l’assembly et sources Web avec leurs limites de version. `npm run check:docs` passe :663 documents,6309 liens locaux,25 domaines/cinq familles, six en-têtes180 et trois originaux byte-identiques (`tmp/v193-docs-final.log`). Les contrôles lourds non exercés restent ouverts.

Recherche, mise en œuvre de la nouvelle boucle, réparation des oracles historiques et exécution des preuves restent distinctes. La fenêtre des journaux ciblés initiaux→dernières admissions est d’environ15min ; elle exclut le cadrage/implémentation antérieurs et la finition documentaire. Deux reprises ciblées sur erreurs historiques ont évité de rejouer les nouveaux scénarios métier et le navigateur déjà acquis ; aucune économie de tokens chiffrée revendiquée.
