# V275 — prothèses en bois

Le schéma **210** ouvre une récupération clinique après perte d’un membre : organiser le bois, les médicaments, un médecin et un vrai lit, demander une pose dans **Santé → Opérations**, puis accompagner l’anesthésie, le risque opératoire et le réveil. La prothèse rend une fonction partielle ; elle ne reconstitue pas un membre naturel.

## Référence primaire

Core local **1.6.4871 rev590**, `Assembly-CSharp.dll` SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Sources : `HediffDefs/BodyParts/Hediffs_BodyParts_Medieval.xml`, `Hediffs_BodyParts_Base.xml`, `RecipeDefs/Recipes_Surgery_Misc.xml`, `Recipe_InstallArtificialBodyPart`, `Hediff_AddedPart`, `PawnCapacityUtility`, `MedicalRecipesUtility`, `HediffSet` et `XmlInheritance`. Relevés privés sous `tmp/prostheses-v275-reference/` ; aucune source propriétaire intégrée au produit.

| Prothèse | Sites gauche/droite | Efficacité de la partie | Travail Core |
|---|---|---:|---:|
| Jambe de bois | Jambe | 60 % | 1 500 |
| Main de bois | Main | 60 % | 1 500 |
| Pied de bois | Pied | 80 % | 1 000 |

Chaque pose exige **Médecine 3**, **1 bois et 2 médicaments physiques autorisés**. Les deux doses sont héritées du parent chirurgical ; le bois complète les ingrédients au lieu de les remplacer. Aucun objet « prothèse en bois » à fabriquer, recherche ou nouvel atelier. La pose réutilise le lit, le chevet, la réservation du patient, le transport, l’anesthésie, les conditions opératoires, les risques et l’apprentissage médical existants. Le travail de référence correspond à **150/100 ticks locaux** avant vitesse réelle, à **10 Core par tick local**.

Les deux doses sont du **même type de médicament**, éventuellement collectées dans plusieurs piles : adaptation locale qui conserve une puissance opératoire unique, sans mélanger les catégories ou fabriquer une dose. Les ingrédients non consommés gardent leur propriétaire physique pendant interruption et dépôt.

## Portée et anatomie

La pose est limitée aux **colons adultes libres présents sur la carte**, sur une **partie directement manquante**, dont le parent naturel est présent. Poser une main ne remplace pas un bras absent ; poser un pied ne remplace pas une jambe absente. Un membre sain, un parent absent, une partie déjà artificielle ou un descendant d’une prothèse ne sont pas admissibles. La seule sélection dans l’interface ne produit aucun changement anatomique.

Limiter la pose aux parties manquantes est une **adaptation de portée** : le Core permet aussi de remplacer des parties présentes et restitue certaines pièces retirées. Remplacement, ablation et récupération de prothèses, prothèses industrielles/bioniques, organes, détenus, visiteurs, animaux et opérations hors carte restent exclus de ce lot. Les amputations thérapeutiques historiques conservent leurs conditions et leur commande.

Une amputation thérapeutique qui retirerait une prothèse installée sur ce membre ou un descendant est refusée tant que la restitution physique du bois retiré n’est pas raccordée. Ce refus évite de supprimer silencieusement une possession ; il ne simule aucune ablation ni récupération de pièce.

L’état artificiel est canonique, avec la partie, le type et la date de pose. Les descendants naturels restent absents ; les capacités traitent le sous-arbre comme remplacé et appliquent l’efficacité de la racine **une seule fois**. Avec l’autre côté sain et sans autre affection, une jambe de bois ou une main de bois donne respectivement **80 %** de mouvement ou de manipulation ; un pied en bois donne **90 %** de mouvement. Ce sont des exemples physiologiques de référence, pas des valeurs garanties pour un patient douloureux, blessé ou encore anesthésié.

Les dégâts subis par une partie artificielle restent physiques et peuvent la détruire ; douleur, saignement, cicatrices et infection ne sont pas inventés sur le bois. La règle Core de guérison naturelle des lésions non permanentes reste applicable : « artificiel » ne signifie pas ici « aucune guérison ». Les maladies et besoins du patient poursuivent leur horloge ; l’anesthésie n’est pas un soin de ses autres affections.

## Décision et suivi

L’onglet Opérations propose les six sites admissibles, annonce les ingrédients, le niveau médical, l’efficacité partielle et le risque. Il montre la demande, la collecte, l’approche et le travail à partir des états confirmés. Une intention opératoire unique peut être annulée ; les ingrédients déjà consommés et l’anesthésie ne sont pas remboursés. Après une issue achevée, aucun nouvel essai n’est demandé automatiquement.

Le dossier Santé identifie la prothèse installée et conserve l’affichage des capacités réellement calculées. Il distingue la prothèse et les parties naturelles qu’elle remplace, sans afficher ces descendants comme des amputations nouvelles à soigner. Une nouvelle demande exige la disparition de l’anesthésie précédente, politique locale historique conservée.

Le rendu restaure la silhouette humaine du membre sans modèle ni matériau de bois distinct. L’anatomie et les capacités publiées dans le dossier Santé identifient la prothèse ; la silhouette seule ne prétend pas reproduire son apparence Core.

## Validation

**156 cas uniques dans 22 fichiers passent par reprises ciblées, dont 38 nouveaux cas dans cinq fichiers.** Ils couvrent les six sites, les capacités et dégâts, les gardes d’anatomie, les demandes et réservations, deux piles de médicaments, les pénuries, les annulations avant/après administration, les issues réussies/échouées, les anciennes opérations et les lecteurs. Les 62 sauvegardes publiques sont validées et leurs 65 fichiers restent inchangés. La pose garde le facteur de réussite Core **1**, sans hériter le facteur **1,2** de l’amputation.

Typage : reprise PASS **4,761 s** ; build avec typage PASS **7,568 s**. Parcours Chromium matériel **WebGPU**, 1440×1000, PASS **23,162 s** : demande par Santé → Opérations, admission et transports joués, sauvegarde/rechargement exact pendant le portage au tick **3094**, sous anesthésie pendant le travail au tick **3159**, puis après pose au tick **3252**. Le dossier affiche la jambe de bois, la consommation est de 1 bois et 2 doses, aucune erreur navigateur. Préparation explicite : moignon soigné, ressources, médecin niveau20 et flux initial fixés avant jeu ; aucune amputation naturelle ni campagne longue n’est revendiquée. Le patient est encore anesthésié à la dernière capture ; les capacités hors anesthésie sont contrôlées séparément par le noyau.

L’initial de typage reste rouge pour une fixture historique fixant littéralement209. Le premier groupe reste rouge (**58,686 s**) : nouvelle réservation convertissant une absence en NaN et garde de portage non étendue, corrigées ; la reprise (**20,443 s**) conserve deux attentes de fixtures erronées, XP naturellement décroissante et pensées de témoin non expirées après saut d’horloge. La dernière reprise (**10,006 s**) passe, avec un contrôle supplémentaire d’exclusivité des cellules de livraison entre opérations. Les journaux privés demeurent sous `tmp/validation-runs/v275-*` ; captures et rapport sous `tmp/wooden-prostheses-v275-native-hPskzZ/`. Aucun gain FPS ou reprise après perte GPU n’est déduit de ce lot.
