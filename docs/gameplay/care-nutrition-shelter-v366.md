# Soins, repas et abri après le raid V366

La même campagne passe du vrai 74950 au vrai 75566. Les neuf plaies de Gaël sont désormais traitées et son saignement est nul ; les trois originaux ont réellement mangé. Un couchage supplémentaire accueille le visiteur par son propre repos médical, et la brèche reçoit un nouveau mur payé avec cinq bois livrés. Gaël reste blessé et le visiteur infecté : ce lot QA ne certifie ni guérison globale, ni campagne entière, ni nouvelle performance.

## Trois continuations, sans reprise favorable

Depuis [V364](raid-care-v364.md), aucune entrée ancienne n’est rejouée pour obtenir un meilleur résultat. Les deux premiers arrêts restent rouges, leurs exports et ledgers interdits conservés. Le mandat suivant part toujours du nouvel état effectivement produit.

| Entrée réelle | Résultat observé | Contrôle ROOT |
| --- | --- | --- |
| 74950, tâche/cargo d’Iris hérités | Léonie démobilisée, ration consommée à table 75032 ; coupes 17/18 de Gaël traitées et saignement nul constaté 75034 ; tabouret désinstallé puis nouveau couchage médical 19877. Secours refusé légalement car le visiteur s’est naturellement relevé. Conservation 75094 non rechargée. | Chrome/WebGPU RED 73,009 s ; body 42,712 s, overall 63,932 s, erreurs[]/lifecycle[], gel 2977 exact. |
| 75094, soins toujours engagés | Repos médical autonome du visiteur constaté 75096 ; fin des soins de Gaël 75216 ; repas d’Iris 75278 et alimentation assistée de Gaël 75347. Cinq bois transportés au chantier ; arrêt au relèvement de l’assaillant constaté 75426, vraie conservation 75443 non rechargée. | Chrome/WebGPU RED 80,616 s ; body 59,779 s, overall 74,632 s, erreurs[]/lifecycle[], gel 2979 exact. |
| 75443, frame payé/progress 6 et assaillant en retraite | Aucune nouvelle commande de travail, soin, nourriture ou combat. Mur neuf 19885 terminé à l’événement 75460, constaté 75476 ; issue 75566 exportée et rechargée exactement. | Chrome/WebGPU PASS 30,036 s ; body 10,709 s, overall 25,437 s, erreurs[]/lifecycle[], gel 2981 exact. |

Le premier refus n’établit pas un bug du jeu : `rescueReason` exige une personne à terre. Le visiteur est devenu mobile pendant le vrai travail de désinstallation. Au prochain mandat, `processMedicalGuestNeeds` lui fait réellement choisir le couchage disponible et s’allonger. La preuve exige need.sleep, phase sleep, état resting, immobilité, `currentMedicalBed` et l’événement nouveau de repos ; aucun portage ou dépôt n’est crédité.

Le second arrêt applique la garde conservatrice « ennemi relevé ». La revue de `raids.ts` et `raid-behavior.ts` constate ensuite un retrait réel : exiting/group2, route vers le bord nord et aucun engagement. Le nouveau mandat autorise seulement cette retraite observée, z≤110/goal.z0, sans melee/shooting/tactics. Un retour, un engagement, un nouveau dégât ou une disparition sans sortie physique restent des arrêts. L’assaillant n’est ni effacé ni rendu inoffensif par modification du moteur ; au 75566 il est encore vivant et en mouvement en 12598. Sa sortie effective n’est pas acquise.

## Soins, identité et alimentation

Iris conserve sans réordre son tend 28/852 et le cargo médical 19845 de deux doses au départ. Les gestes indépendants sont comparés au même tick. Les coupes 17/18 sont réellement traitées à qualités 923/1000 et tous les soins engagés finissent au 75216. Gaël conserve ses neuf blessures et un sang perdu de 16285924 au 75566 ; il repose au couchage médical 19797. Ce n’est pas un rétablissement complet.

Trois chaînes de nutrition sont qualifiées, avec source fraîche, portion physique, progression stationnaire, disparition, hausse de faim et événement. Le repas antérieur de Léonie est lié au ledger exact, sans nouvelle ingestion inventée :

| Consommateur | Chaîne réelle | Événement |
| --- | --- | --- |
| Léonie | Survie 19664/5 → portion 19875/1 | 75032, à table |
| Iris | Survie 19664/4 → portion 19879/1 | 75278, sans table |
| Gaël, aidé par Léonie | Simple 19689/4 → portion 19880/1, vrai contact au lit | 75347, alimentation assistée |

Les deux consommations propres et le nourrissage sont des décisions explicites du joueur, pas trois besoins spontanés nouvellement certifiés. Le repas simple conserve sa contamination connue de cuisinier incompétent, fraction 0,05 ; aucun aliment assaini pour le test. Aucune intoxication n’est présente dans l’issue, sans garantie pour un autre tirage. Toutes les fenêtres de ces trois témoins restent au plus à huit ticks ; la dernière observation avant fin de nourrissage a progress 73/75.

Au final, Iris dort réellement et Léonie est en loisir. Le second visiteur repose au nouveau couchage 19877, sans fiction de secours. Son infection 1 demeure active : severity 93433821, immunity 94665400, traitement sec qualité 385/expiration Core 785630 ; l’immunité légèrement en avance ne prouve pas une guérison. Douze anciennes plaies restent non traitées. Le premier visiteur conserve ses quinze plaies traitées et son repos médical.

Les médicaments coloniaux passent légitimement de vingt à dix-sept pendant la poursuite des soins ; les trois personnels 19776 restent au visiteur. Les doses nouvelles sont attestées par tâches, quantités et événements, pas par une nouvelle chaîne exhaustive de pickup pour chaque dose. Personnes, possessions, mémoires, ancienne infection et risque futur du torse de Gaël sont conservés. Aucune récupération de la branche blessée V344 n’est créditée ici.

## Espace et reconstruction payée

Le tabouret 19695 bloquait réellement l’emplacement 123111→124111. Léonie le désinstalle après sa ration : l’événement est au 75090, le paquet constaté au 75091. Même ID, matière bois et qualité awful restent au sol ; aucun meuble détruit/remboursé ou réinstallé magiquement. Le nouveau couchage gratuit n’est posé qu’après les vraies admissions, puis reçoit son rôle médical par UI.

Le mur détruit 18663 reste historique. Le nouveau job 19883 en 120113 reçoit cinq bois de la pile extérieure 19828 : 63→58, cargo 19884, puis propriétaire job. Le dernier mandat part du vrai frame approvisionné et réservé à Léonie. Le bâtiment neuf 19885, la disparition du job et la consommation du cargo sont observés ; sa présence, sa matière et ses dégâts nuls sont encore vérifiés à l’issue. Les 78 bois au sol restants ne sont pas un stock virtuel. Les dommages anciens de 18647/18632 ne sont pas effacés. Un nouveau mur ne qualifie pas, à lui seul, toutes les propriétés thermiques de l’abri.

## Contrôles, réparations de pilote et limites

ROOT seul exécute les contrôles lourds successifs sur sources/tests/publics/pilotes/inputs figés. Typages PASS 13,261 s, 14,784 s puis 12,640 s. Quatre recharges UI exactes au total : 74950, 75094, 75443 et 75566 ; six captures larges acquises et inspectées ROOT. Les conservations rouges restent non rechargées dans leurs propres mandats.

Six pilotes opt-in sont ajoutés. Avant leurs premiers contrôles : oracle de pickup entier corrigé pour accepter un nouvel ID avec disparition exacte de la source, skip au niveau module pour éviter une allocation navigateur ordinaire, et garde du mur neuf corrigée après revue statique indépendante. Aucun validateur, seuil médical, RNG, combat, worker ou rendu produit n’est modifié. Les deux politiques devenues inadaptées restent documentées par leurs rouges ; elles ne sont pas rejouées depuis leur ancienne entrée.

Ce lot QA n’ajoute aucune mécanique produit. Aucun build, corpus ou banc de combustible inchangé n’est rejoué, aucune nouvelle publication Cloudflare : [V365](manual-refuel-v365.md), produit 28a2e8a9/publication 2f42e85c, reste en production. Le schéma 238 est conservé. Ni journée entière, campagne complète, EA100 %, parité exhaustive ou 240 FPS ne sont certifiés.

## Preuves et suite autorisée

- 74950→75094 : `tmp/early-access-defense/recovery-74950/native-01/raid-recovery-Real-care-nu-24114-shelter-from-preserved74950/` ; conservation SHA `65845b9f48e899df96a688345a7a045fd6b47177e905fa8b873470a19620a9f2`, ledger `9b2d0b20bd2ac01039112fb01dfa8993bb41f052a62623343bc3179eb38f85f9`.
- 75094→75443 : `tmp/early-access-defense/recovery-75094/native-01/raid-recovery-continuation-4c8e8-shelter-from-preserved75094/` ; conservation SHA `f9f2f84931fc26c8b8396d4bb521e428459e5fd9e76c9f4773bcb1c2b65dea0c`, ledger `7aec8f5d6b1457bbdf21bcb5e92a5b91f7b8323acc73141f16e3def068f4f88f`.
- 75443→75566 : `tmp/early-access-defense/recovery-finish-75443/native-01/raid-recovery-finish-Real--3ac2a-ll-finishes-after-care75443/` ; **issue rechargée** SHA `537fd3b59953d8724513721044671338b71a5a93069b0bd2d19f11a4aca7b990`, ledger `1196c97de46e61ddfffbad91878fdeb611937c396e2420e8270862871354ff3b`, summary `ccd94bb75fa3d55c6b622c18029af446dc8cab5208ade3569b34a9faf79ac6fa`.

Le dernier ledger demeure resumeAllowed:false pour revue ROOT ; aucun ancien ledger n’est réactivé. Prochaine priorité : nouvelle autorisation explicite depuis ce vrai 75566, soins/repos et issue réelle de l’infection conservés, recherche Batteries payée et utile par une personne disponible. La préparation doit prendre en compte Gaël encore au repos, Léonie saine, le tabouret désormais emballé, le retrait ennemi réel et le manque de bois pour l’annexe. Le futur lot ne peut présenter sa préparation comme un résultat acquis. Ensuite essai des trois biomes et expansions déjà autorisées. Références humaines, branche UI papier, sauvegardes historiques et sessions restent intactes ; sous-métiers reportés.
