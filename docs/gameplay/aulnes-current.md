# Les Aulnes, référence intégrée

Ouvrez **Charger une partie → Colonies de test → Les Aulnes · référence intégrée 250×250**. Cette première entrée du catalogue ouvre une nouvelle copie en pause. Le [fichier publié](../../public/test-saves/v284/les-aulnes-integrees.json) peut aussi être importé. L’ancienne [référence V224](aulnes-seating-v224.md) demeure accessible avec ses sièges corrigés et son état original.

La carte de 250×250 conserve le village, les 14 colons, Dorian en prison, les biographies, les relations, les équipements et les qualités des meubles. Les ateliers, cuisines, chambres, télévision, élevage et réseau électrique existants sont complétés par les installations compatibles livrées jusqu’à V283. Trois animaux domestiques — cerf, gazelle et lièvre — rejoignent les mufalos et dromadaires.

| Quartier | Repères | À consulter |
| --- | --- | --- |
| Hôpital, à l’est | 159–169 × 96–111 | Lits médicaux, moniteurs vitaux, sol stérile, patient et prothèse en bois |
| Serre, à l’ouest | 91–103 × 146–158 | Bacs hydroponiques, cultures et alimentation électrique |
| Pharmacie, au sud | Laboratoire113,173 | Facture de médicaments, plantes médicinales, neutroamine et tissus |
| Industrie, au sud | Raffinerie128,173 | Deux factures de biocarburant, piles réelles et rangement |
| Prospection | Foreuse110,165 ; scanner112,166 | Veine préparée, travail du mineur, scanner à ciel ouvert |
| Alimentation, à l’est | Distributeur180,101 | Trémies, ingrédients réservés et repas de pâte nutritive |
| Commerce | Console114,127 | Marchand orbital, marchandises physiques sous balises et argent disponible |
| Énergie | Générateur166,156 | Réserve de biocarburant, ravitaillement et réseau commun |

Reprenez à 1× pour suivre les déplacements et les travaux, puis accélérez si souhaité. Les factures, priorités et horaires donnent aux habitants des activités ordinaires ; sélectionner un colon ou une installation permet d’examiner son état réel. Sauvegarder puis recharger conserve ces activités et leurs possessions.

Émile raffine du bois et Basile produit des médicaments. La recette de carburant à partir d'aliments est suspendue pour préserver les provisions ; elle peut être réactivée. Le générateur neuf attend son premier ravitaillement réel. Le lanceur EMP est disponible dans la réserve de l'atelier sud.

Les annexes, neuf recherches, stocks finis, patients, prothèse, veine connue et marchand de passage constituent une **dotation déclarée de la référence**. Une continuation du moteur ordinaire suit cette préparation : collecte, transport, consommation et production proviennent alors des règles jouées. Cette scène ne représente pas une campagne entièrement développée depuis zéro et sa couverture indique la présence des fonctions compatibles ; elle ne certifie pas que toutes leurs branches ont été exercées.

Le marchand de passage repart au tick 10 934 ; le checkpoint s'ouvre au tick 8 434, avec 2 500 ticks restants. Pour une négociation, utilisez Léonie et la console avant ce départ. Le calendrier de quêtes est activé ; l’offre d’asile exige moins de 12 colons au total, y compris ceux hors carte. Les 14 habitants rendent donc cette offre inéligible ici. Les incidents conservent leurs calendriers ordinaires ; aucune crise n’est imposée pour enrichir la référence.

Le pointeur de catalogue `aulnes-current` désigne le checkpoint courant. Chaque publication utilise un nouveau fichier versionné ; les 62 anciennes références et leurs payloads demeurent inchangés. Pour comparer les performances, conserver le numéro de version, le hash et la caméra : ce village enrichi constitue une charge différente de V224.

## Maintenir la référence

Lors d'un prochain lot fonctionnel autorisé, partir du dernier checkpoint intégré, ajouter les installations et stocks finis pertinents, puis laisser jouer une continuation ordinaire courte. Remplacer seulement le pointeur `aulnes-current` du catalogue ; conserver le précédent fichier versionné et sa provenance. Les situations privées de validation restent utiles aux cas rares sans créer une nouvelle entrée publique pour chaque fonctionnalité.

Le préparateur `scripts/update-aulnes-test-save.ts` réalise spécifiquement l'extension V224→V284. Il refuse de réappliquer cette dotation à une colonie déjà enrichie ; les prochains ajouts devront prolonger la référence courante. Après génération privée, la publication exige un rapport réussi correspondant au hash et au tick du checkpoint. Une interruption ou un contrôle rouge ne publie rien.

La tâche planifiée reste en pause. Cette sauvegarde ne la réactive pas.

## Validation

Checkpoint V284 : schéma 218, tick 8 434, carte 250×250 ; SHA-256 décompressé `e11bdf91eb592c1432a879b4d6fea296469ec7d7416537f6b5e8702a361e644d`. Les 62 payloads historiques et leurs fiches de catalogue sont conservés. Le catalogue place cette 63e entrée en premier.

La préparation conserve les identités humaines et animales historiques, les structures et leurs qualités. Quatre contrôles ciblés passent après correction du défrichage des nouvelles empreintes et des plantes incompatibles sous conduites. La continuation 6 934→8 434 passe en 87,558 s, avec rechargement et tick ordinaire 8 435 exacts. Recherche, soins humains/vétérinaires, semis, forage, logistique et ateliers sont observés ; un médicament est réellement produit, 45 unités d'acier sont retirées de la veine. Les ordres aux nouveaux ateliers sont admis au tick 6 935 pour Basile et 6 970 pour Émile.

Preuve privée de cette continuation : `tmp/aulnes-v284-generation-mKJ0cn/report.json`. Les essais rouges restent conservés : défrichage initial, qualification interrompue faute de mémoire Windows après 1 500 ticks, ordre demandé avant alimentation de la raffinerie, puis attente électrique injustifiée du laboratoire manuel. Ces corrections concernent le préparateur et ses contrôles ; aucun moteur, lecteur de sauvegarde ou rendu produit n'a été modifié. Le premier démarrage natif en environnement restreint n'a pas rendu le serveur disponible ; sa reprise reste distincte.

Cette validation ne constitue ni une campagne naturelle entière, ni un exercice de tous les incidents, ni une mesure de performances.

Chromium WebGPU matériel AMD passe en 128,875 s : chargement depuis le vrai menu public, 19 ticks à 1× puis 176 ticks à 6×, sauvegardes/recharges UI exactes aux ticks 8 453 et 8 629. Le premier lot de 35 biocarburants est présent au dernier checkpoint natif. Captures du village, des ateliers sud et de la serre ; erreurs vides, navigateur privé et port 5 317 fermés. Rapport : `tmp/aulnes-v284-native-70To4M/report.json`.

Contrôles finaux regroupés : 9 cas dans 2 fichiers passent en 32,574 s (référence, compression, reprise et bibliothèque publique) ; typage et build passent en 17,686 s. Les tests historiques du catalogue utilisent désormais les identifiants et la version plutôt qu'une position réservée aux anciennes entrées.
