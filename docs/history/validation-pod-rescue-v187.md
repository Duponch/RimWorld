# Preuve bornée — secours civil V187

Relevé du 3 octobre 2026, schéma **175**. [Contrat](../development/pod-rescue-v187.md), [recherche Core](../research/pod-rescue-core-v187.md). Lot distinct de V186 et des retouches graphiques antérieures. Aucun push.

## Produit et conservation

Une capsule civile prospective utilise son tirage privé et produit un adulte neutre réellement blessé et une chemise existante à l’ouverture. Le ticket Misc 1,5 conserve l’enveloppe 16,9 sans redistribution des incidents absents. Approche et portage forcés réutilisent le secours réel ; le dépôt au lit seul accorde l’admission. Repas, médicaments, soin et repos médical restent physiques, sans travail ni mobilisation pour cet invité.

Le départ attend la fin de l’arête et des activités engagées. La personne et ses possessions restantes quittent ensemble, une fois, avec conservation des IDs et un état figé à la date de sortie. Le validateur commun contrôle cet état via une projection neutre, sans génération, besoin, stock colonial ni PRNG ; une politique alimentaire supprimée ensuite ne restaure aucune politique dans la carte. Ancien schéma 174 validé strictement avant migration neutre ; champs capsule/invité futurs refusés.

## Contrôles ciblés et corrections

Premier groupe : **63/63**, dix fichiers — domaine et rendu capsule, secours, soins, alimentation, urgence, infection, auto-soin, calendrier Misc et snapshots. Les huit nouveaux scénarios d’intégration apportent les contacts, doses/repas, repos après relèvement, reprise des phases, refus d’autorité, archives et corruption. Après corrections, **27/27** passent dans les quatre familles domaine/care/transport/bridge concernées. Le bilan dédupliqué initial est **71 contrôles dans douze fichiers**. Le groupe supplémentaire catalogue, régimes, règles/sauvegardes prisonniers, visiteurs et réservation de leurs repas passe **19/19 dans six fichiers**. Total ciblé dédupliqué **90/90 sur dix-huit fichiers** ; ce n’est pas une suite exhaustive.

Trois corrections sont distinguées de la mécanique : une provision personnelle artificielle dans une fixture civile n’était pas un état de jeu admissible et a été retirée ; un témoin de sortie sautait l’horloge médicale et utilise désormais le vrai `updatePawnHealth` ; le parcours natif comptait uniquement la faction explicite `colony`, alors que le profil camp utilise également l’absence de faction, et emploie maintenant `isColonist`. Les assertions utiles de consommation, dépôt, identité et refus n’ont pas été retirées.

Le bridge refusait initialement une forme valide portant une mobilisation incohérente. Le contrôle léger des mandats/incidents a été ajouté **avant adoption**, ainsi que l’horloge de santé des archives ; les tests démontrent le refus atomique et la conservation de la précédente révision. Aucun scan global de possessions ni projection médicale complète n’est fait à chaque snapshot.

## Catalogue et navigateur natif

La **38e** fiche publique, « Capsule civile et secours · 3 colons », contient une carte **32² préparée** et une capsule en attente, sans patient ni soin précréé. Lit, doses, repas, positions et priorités sont explicitement préparés. SHA‑256 du fichier : `81b01a03ab05aaa01b57ba42fb711dd1cd4b086b5882fdc39d6d2ed7a99470b3`. Les trente-sept fixtures antérieures ne sont pas régénérées.

Chromium lancé sans arguments de rendu logiciel : **1/1** passe, backend WebGPU. Catalogue réel, ouverture au tick **10**, pickup/portage observé au tick **47**, admission au tick **94**, premier soin au tick **204**. Sauvegarde/recharge pendant portage exacte ; dose herbal consommée, trois colons conservés, civil neutre, inspection et régime activés après accueil. Mille observations graphiques bornées, six éléments résidents pendant la capsule et aucun upload de matrices durant sa chute. Aucune erreur observée. Les avertissements TSL de fonction inline restent présents dans les journaux ; ils ne sont pas présentés comme des erreurs corrigées. Sortie entièrement naturelle après toute la durée de guérison non démontrée par ce court parcours : les tests de soins exercent le relèvement et le repos, ceux de sortie partent d’un checkpoint récupéré explicitement préparé puis marchent réellement jusqu’au bord.

Artefacts non versionnés : `tmp/test-runs/2026-10-03T02-13-22.601Z-26304/artifacts/pod-rescue-v187-browser.json`, captures du portage et du patient traité dans le même répertoire. Le premier essai natif a échoué uniquement sur l’oracle de faction explicite décrit plus haut ; il n’est pas compté comme une preuve réussie.

## Build, présentation et performances

Build et typage passent : **646 modules**. Présentation normale 250² minage/abattage passée, **7 783/7 737 images**, p95 RAF **6,2/6,2 ms**, zéro saut, excès de trajet continu ou occupation solide. Ce replay vérifie la continuité des pipelines communs, pas une campagne médicale naturelle.

Sources gelées et exécutions successives : navigateur, microbanc CPU, build puis présentation. Le banc `scripts/pod-rescue-bench-v187.ts` utilise Node **24.11.1**, Ryzen **5 3600**, carte **250²**, une capsule bloquée par une personne, cent échauffements et vingt valeurs de vingt appels par tour, quatre rotations alternées. World et PRNG inchangés, empreintes des sources exactes. Le contrôle de cellule courant a un p50 **0,00978–0,01063 ms**, p95 **0,01012–0,01870 ms**. L’ancienne expression reconstruite avec grille et ensemble mondiaux a un p50 **0,21585–0,27649 ms**, p95 **0,24216–0,35391 ms**. Il s’agit uniquement de l’attente sur une cellule, avec comparateur reconstruit, **pas d’un moteur historique complet ni d’un gain général de tick/FPS**. Résultat : `tmp/pod-rescue-bench-v187.json`.

La capsule possède un unique lot résident de six éléments, animés par uniforms GPU, et un graphe sans pigment lorsque les textures sont désactivées. Les contrôles purs protègent attributs, normales, comptage et restauration de compilation ; le parcours natif valide leur intégration. **Coût GPU isolé non mesuré**, pas de coût nul annoncé. Création du civil, recherche de sortie, validation d’archives au chargement et coût complet worker ne sont pas mesurés par ce banc.

Régression exhaustive, campagnes naturelles longues, toutes les factions de capsule, recrutement, réputation, stocks personnels civils, diplomatie et hospitalité générale restent hors lot. Contrôle documentaire final : **645 documents, 6 119 liens locaux**, six entêtes au schéma 175 et trois sources utilisateur byte-identiques. Archive des instructions et herbe utilisateur inchangées, trente-sept sauvegardes historiques sans diff ; `git diff --check` et typage final passent.
