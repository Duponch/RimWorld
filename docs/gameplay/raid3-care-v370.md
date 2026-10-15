# V370 — soins après le troisième raid

Schéma 238 conservé. Même campagne réelle86133→86535, après la défense V369 : le moignon et les trois blessures récentes de Gaël sont réellement traités, sans nouveau combat ni modification produit. Saignement nul ne signifie pas guérison : l’orteil reste perdu, neuf plaies et l’infection demeurent. Aucun moteur, règle, rendu, interface ou sauvegarde produit modifié.

## Soins et reprise ordinaire observés

Le pilote importe le vrai86133 puis l’exporte et le recharge exactement. Les commandes réelles Arrêter puis Démobiliser Gaël préservent à leur tick sa frappe861291→861411, son mouvement hérité et son stagger ; aucun cooldown n’est réinitialisé. Patient/Repos choisit physiquement le couchage médical19797/122114. L’événement86152 et le constat86154 établissent son installation réelle, phase sleep/état resting, sans lit donné ou téléportation.

Iris est alors réellement démobilisée, puis reçoit un seul ordre civil Soigner Gaël. Elle garde le même service entre les traitements ; le pilote ne répète pas l’ordre à chaque portion. Léonie reste mobilisée122112 pendant l’urgence. La matière médicale est physique : pile coloniale19678 passe10→7, cargo20154×3 porté par Iris observé86165, puis3→2→1→disparition aux trois traitements. Les trois médicaments personnels19776 du visiteur restent distincts et intacts.

| Traitement réel | Événement | Premier constat utile |
| --- | --- | --- |
| Moignon left-big-toe, maintenant tended:true | 86257 | 86258 ; cargo20154 reste2 |
| Coupures27/28 du torse et de la jambe droite, qualités990/1000 | 86342 | 86343 ; cargo reste1 |
| Fissure26 du tibia droit, qualité1000 | 86427 | 86427 ; cargo consommé |

Le moignon est déjà une cible légale du moteur ; tendMissingPart le panse et arrête sa contribution au saignement, sans faire repousser l’orteil. Aucun correctif produit nécessaire n’a été démontré. Les trois doses nominales de la préparation deviennent ici trois consommations observées ; aucune autre dose ou guérison n’est ajoutée.

Urgences groupées terminées et saignement nul constatés86429 ; vraie démobilisation de Léonie au même tick. Une courte fenêtre ordinaire suit jusqu’au vrai86535, au-delà du minimum86533. Iris reprend alors la cuisine18884/bill18886 ; son riz20144×10 est placé126116 et sa tâche work reste engagée. Léonie a commencé un vrai feeding du visiteur19768 : source20101, cargo20155×1 simple-meal physiquement porté, phase feed/progress69 sur75, au chevet123112 face au patient124112. **Ce repas n’est pas encore terminé** ; aucune ingestion ni chaîne source complète n’est créditée rétroactivement. La prochaine reprise doit laisser finir ce service, sans lui redonner un ordre qui perdrait le travail ou le cargo.

## État final et limites

Gaël repose réellement19797, désormais medical:bedrest. Les neuf plaies restent présentes, avec guérison naturelle partielle de certaines sévérités. Missing exact : `{part:'left-big-toe',bornAt:86111,tended:true}`. BloodLoss18398272 est conservé : il a augmenté avant l’arrêt du saignement, aucun sang n’est rendu artificiellement. Infection1 torse toujours active, severity626037104/immunity994436432 ; aucune disparition clinique annoncée. Faim43,09/rest80,48/mood21,30 ; le risque d’humeur reste réel.

Iris est saine, civile126115 en cuisine, faim43,25/rest65,06. Léonie est saine, civile123112 au feeding, faim36,24/rest60,97. Visiteurs19768/19771 restent couchés avec leurs anciennes blessures ; le second garde son infection malgré immunité1e9. Sept doses coloniales au sol et trois personnelles chez le visiteur demeurent ; les consommations futures légitimes ne sont pas interdites par une invariance7.

L’assaillant20141 est encore à terre124114, vivant et non capturé ; son relèvement futur reste un danger, sans menace permanente réputée supprimée. Porte18648 détruite et mur nord18661 démonté restent absents ; aucune enceinte thermique close n’est déduite. Bois143, douze plans non payés, paquet/meubles et anciens dommages conservés. ProductiveEvidence est vide : aucun nouveau paiement, annexe, recherche Batteries ou énergie utile acquis.

## Qualification ROOT

- Typage PASS13,117s, puis Chrome/WebGPU PASS102,138s ; body82,045s/overall96,850s.
- Deux exports/recharges UI86133 et86535 exacts ; deux captures inspectées ROOT.
- Errors[], lifecycle[], artifactErrors[] et conservationDiagnostics[] ; gel2999 chemins uniques exact avant et après natif.
- Budget100–150s, horizon86933, minimum86533 ; première nouvelle blessure/incapacité/crise/infection distincte, relèvement ou cible hostile, nouveau danger ou dégâts d’ouvrage arrêtent.

ROOT revoit et adopte une copie distincte : active est absent du RAW86133, donc assertion undefined et non null ; deadline active même à la garde finale, puis jugée après export/recharge. La garde nextInjuryId couvre aussi les lésions fusionnées. Le dernier batch est observé avant de vérifier que le tend continu ne s’est pas interrompu prématurément. Les erreurs de diagnostic ou PNG ne bloquent pas une conservation UI, mais restent rouges. Une revue statique indépendante confirme la transition normale des batches ; aucun contrôle agent.

Le premier gate documentaire est rouge1,283s : espace absent dans le nouvel en-tête de schéma, qui sortait aussi l’ancienne mention de sa fenêtre de lecture. Format corrigé en schéma 238, sans assouplir le contrôle ; reprise documentaire PASS1,111s. Aucun ancien banc produit, corpus, build ou refus WebGPU rejoué. QA seule : V36528a2e8a9/publication2f42e85c et106HTTPS exacts restent acquis, aucune nouvelle publication. Aucun FPS, guérison globale, campagne entière, parité exhaustive ou EA100% certifié.

## Preuves et prochaine reprise

Natif sous `tmp/early-access-defense/raid3-care-adopted-01/native-01/raid-third-care-Real-raid3-94414-etaining-anatomy-and-losses/`.

- **Canonical86535** : vrai issue.json exporté/rechargé exactement, SHA `406fa2d7e15b23b8a287aff55f133712fbb3978133b641153864b17cef9aee07`.
- Ledger `52e03953f3240d9a48f874936ada2111dfda8ef5fe25ddfbcba125d203796c30`, kind explicit-raid-recovery/intervention raid3-care, resumeAllowed:false ; summary `bac9e11e1b8674cd398cab9052242cd809f5f3e1f8598125702ba219e7c2f712`.
- Préparation privée manifest7993e4d9/driver3e5476d5 ; adopté ROOT corrigé7f7feee3 et entry-review637de8d2. Parents et réservations immuables.

Le FULL productif V367fca539be6d24875ca99f31a4f14525769222172cbdd61b3031c91d68d2057591 et le parent de défense7b51b1f8 restent entiers dans la nouvelle chaîne. Origine75566/horizon111566 ne changent pas. Reprendre uniquement le vrai86535 avec un nouveau mandat ROOT, sans réactiver les anciens false ni rejouer86133 favorablement. Laisser finir le feeding69/75 et préserver la cuisine engagée, puis revenir aux Batteries réellement payées/utiles par une personne disponible, sans forcer Gaël hors repos. Les trois biomes et extensions autorisées suivent ; références, UI papier, identités/biens/mémoires et sessions préservées, sous-métiers reportés.
