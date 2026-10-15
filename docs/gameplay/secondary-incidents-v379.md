# Incidents du second site et alertes hors carte — V379

16 octobre 2026 — schéma 242. Le second site Cassandra reçoit désormais les calendriers existants de raids et de visiteurs. Une alerte sur la carte affichée permet de rejoindre une menace ou une visite située sur l’autre carte, puis de centrer sa personne réelle. Les deux cartes continuent à vivre.

## Règles et sauvegardes

L’adoption intervient seulement au premier tick réellement joué du site, nouveau ou ancien. Elle ne rejoue ni introduction ni fenêtre déjà commencée. Les calendriers sont locaux et persistés ; les producteurs réutilisent les entrées physiques, effectifs, possessions et budgets locaux, avec l’horloge et les identifiants de campagne communs. Une occasion refusée est consommée. Les mécanoïdes conservent le seuil existant du jour 45 et des points strictement supérieurs à 300 ; leur apparition n’est pas garantie.

La migration valide strictement le schéma 241 sur les deux cartes et leur namespace commun avant de changer seulement le numéro. Charger en pause n’ajoute aucun calendrier, acteur, événement, objet ou tirage passé. Le nouveau format de transport est refusé sous 241. Les sauvegardes restent les autorités complètes, distinctes des vues graphiques.

Le résumé distant contient au plus trois lignes : humains hostiles, mécanoïdes et visiteurs. Il ne transmet ni terrain, tâches, possessions ni coordonnées inactives. Chaque alerte porte carte, catégorie et identifiant ; son clic change la carte par la commande existante et attend sa nouvelle époque avant de résoudre l’acteur et le centrage. Si l’ID a disparu ou si le snapshot est refusé, aucun ancien emplacement n’est utilisé. Le focus n’est actuellement pas réarmé après une resynchronisation refusant ce premier snapshot.

## Référence et adaptations

Les relevés privés Core 1.6.4871 rev590 déjà audités distinguent les cibles cartes/caravanes/monde et l’introduction de la première habitation. L’[annonce officielle Alpha 16](https://ludeon.com/blog/2016/12/rimworld-alpha-16-wanderlust-released/) confirme les cartes simultanées et la navigation par portraits groupés. L’[annonce officielle de la 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) présente « Jump to… » et les contours des cartes actives. Ces deux sources ont été relues pour ce lot ; la capture historique Alpha16 déjà inspectée reste datée. Trois recherches ciblées n’ont fourni aucun nouveau pixel qualifié montrant une lettre distante en 1.6.

Notre site persistant traité comme cible, le saut de toute fenêtre/année commencée et l’alerte avec centrage constituent des adaptations explicites. Équivalence IsPlayerHome, population-intent mondiale, distribution et fréquence exhaustives restent ouvertes. Les introductions locales Misc/Small antérieures ne sont pas corrigées ici. Un seul site secondaire, sans nouveau groupe, secours ou troisième carte.

## Validation proportionnée

- 32 cas dans six fichiers acquis par reprises, dont 11 nouveaux : adoption précoce/tardive, neutralité et refus de migration des deux cartes, admissions locales humaines/visiteurs/mécanoïdes, identités, échecs atomiques, carte vide, transport strict, changement d’époque et apparition au même tick. Première passe 31 PASS/1 RED en 14,721s : fixture historique135/150 conservant une permission de combinaison241. Préparation du seul registre historique corrigée avant les injections de refus, aucun validateur assoupli. Reprises ciblées 6,869s puis 10,293s ; autres fichiers verts réutilisés.
- Typage de toutes les sources et des tests changés PASS 23,600s après RED 16,018s sur trois erreurs de tests : discriminant checkpoint et propriété readonly. Aucun typage global de toute l’ancienne suite prétendu.
- Corpus historique 63 sauvegardes PASS 102,432s : migrations, validation, roundtrip et Decoder, sans avancer les campagnes ni modifier les originaux.
- Chrome matériel/WebGPU AMD RDNA1 PASS 40,134s : scène explicitement préparée32², alerte au foyer, bascule/inspection/centrage du vrai assaillant513 au tick308, mouvement réel13/0→11/2 au317, export des deux cartes et recharge exacte, retour de vue au foyer et alerte toujours disponible. Trois captures inspectées ROOT ; erreurs[], aucun arrêt simulation/graphique. Premier natif RED25,726s avant interaction du lot : attente initiale10s trop courte, remplacée par l’attente interactive60s déjà utilisée. Rouge conservé. Aucune défense gagnée ni occurrence naturelle revendiquée.

Les sorties sont sous tmp/secondary-incidents-v379/ et tmp/validation-runs/v379-*. La campagne historique98038 reste close partielle. Présentation commune sur250²/vitesses1×6×3× PASS139,327s avec Chrome : zéro saut et occupation solide, phases terminées. Le premier lancement RED75,644s utilisait par défaut Chromium embarqué et rencontre l’erreur Tint IR connue ; les observations de mouvement étaient sans saut mais cette erreur interdit le PASS. Reprise unique avec Chrome, aucun seuil détendu. Le lanceur choisit désormais Chrome sous Windows (surcharge explicite conservée), équivalent au lancement qualifié ; pas de nouveau banc FPS. Typage final PASS17,009s, build Pages PASS3,626s. Gel final05 de3298 fichiers exact après les contrôles ; seule la sélection du navigateur du lanceur a changé après sa reprise équivalente avec Chrome.

## Coût et limites

L’adoption saute directement à une fenêtre future, sans boucle sur les années écoulées. Le résumé borné est dérivé aux frontières tick/snapshot par une passe des acteurs de l’autre carte ; aucune recherche métier ni mesure DOM par image, aucun nouvel upload d’acteur inactif. Les acteurs déjà admis restent simulés physiquement. Aucun banc FPS n’a été rejoué et ce contrôle32² ne prouve pas le coût général250² ou 240FPS.

## Livraison

Sources qualifiées ; publication à regrouper avec le prochain correctif d’interface. Dernière production confirmée : V377–V378/e5ec566c. Aucune publication V379 revendiquée avant vérification.
