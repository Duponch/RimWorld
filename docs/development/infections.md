# Infection après plaie, immunité et soins renouvelés — V81, profil V82

20 septembre 2026. [Recherche et divergences](../research/infection-reference.md), [santé](health.md), [soins](tending.md), [médicaments](medicines.md), [santé animale](animal-combat.md). Corpus chapitres8/9/15/23/32, SYS/TEST-089 à094 et096. Validation ciblée locale ci-dessous ; les preuves de boucle complète et de performance relèvent de la validation de livraison.

## Boucle et limites de portée

Une nouvelle plaie admissible peut s'infecter après un délai. La gravité progresse, tandis que l'immunité se développe suivant les capacités, la faim, le repos et la posture réels. Le joueur organise les soins renouvelés, un lit accessible, les médicaments physiques et l'alimentation. L'immunité complète lance la convalescence ; elle ne fait pas disparaître instantanément la maladie. Une infection trop avancée peut rendre incapable puis tuer.

Le noyau s'applique aux humains et aux lièvres. Les lièvres sauvages ont le facteur 0,1 du code de référence sur le premier tirage d'exposition ; **aucun soin vétérinaire n'est livré**. La maladie locale ne se propage pas automatiquement entre voisins. Autres maladies, épidémies, parasites, scaria, chirurgie/amputation volontaire, prothèses, hôpital spécialisé et profils d'âge/gènes demeurent distincts.

## Risque d'une plaie et acquisition

Seule la création d'une nouvelle lésion lance la première décision : morsure30 %, coupure/balle/écrasement15 %, sous les exclusions anatomiques et de permanence. Une lésion fusionnée ne rejoue pas ce tirage. Les risques anciens absents restent absents, notamment après migration. Une candidature positive conserve un délai entier de15 000 à45 000 Core et un facteur de pièce initial1000.

À échéance, les règles relisent gravité actuelle, soin éventuel, qualité et facteur de pièce capturé. Les courbes datées et leurs divergences avec le wiki sont consignées dans la recherche. La difficulté reste neutre ×1 pour les profils historiques. **V82 : Récit d'aventure multiplie ce second tirage par 0,75 pour les personnes de la faction du joueur seulement.** Ennemis et lièvres sauvages restent à ×1. La lecture directe de `Verse.HediffComp_Infecter` dans l'assembly local 1.6.4871, le 20 septembre, a confirmé cette position du facteur : ni premier tirage d'exposition, ni délai, ni progression d'une maladie acquise ne sont réduits. Provenance et empreinte : [base Core](../research/core-reference-baseline.md).

Une candidature n'est évaluée qu'une fois, au premier tick local atteignant son échéance Core. Guérir complètement la plaie ou perdre sa partie retire ce risque. Une maladie déjà créée demeure après fermeture de la plaie ; perdre sa partie la retire.

Un deuxième cas sur la même partie est interdit. L'immunité partagée empêche également une nouvelle acquisition à partir de59,94 % selon la garde de la classe retenue. Les conditions distinctes conservent identité et ordre d'apparition.

## Progression et physiologie

La gravité et l'immunité sont persistées en milliardièmes. Les pas de gravité correspondent à200 Core, soit20 ticks locaux ; les besoins/postures sont fournis par le propriétaire réel du dossier. Le traitement des conséquences précède le gain d'immunité à la frontière létale. La mort est irréversible et utilise les interruptions physiques communes.

- Gravité initiale0,001 ; progression non immune+0,84/jour, diminuée de0,53×qualité pendant un soin actif ; décès à1.
- Immunité malade+0,6441/jour avant facteurs ; après immunité complète, gravité−0,70/jour, plus le bénéfice d'un traitement encore actif.
- Une immunité résiduelle commune décroît de0,40/jour après disparition de tous les cas. Le compteur d'identités reste conservé ; une nouvelle infection ne réutilise pas l'ancienne identité.
- Chance stable0,8–1,2 par condition, capturée par un hash déterministe privé ; la première infection encore active gouverne l'immunité commune. Retirer celle-ci peut changer le facteur, soigner ou recharger ne le relance pas.

Filtration sanguine, faim, repos et usage réel du lit modifient le gain d'immunité. La pénalité de faim urgente commence sous12 % chez l'humain, sous18 % chez le lièvre herbivore ; la faim nulle a sa propre pénalité. Un trajet vers un lit, un meuble voisin, un colon porté ou un corps simplement à terre ne reçoivent pas de bonus de lit fictif. La posture de contemplation allongée et le repos physique utilisent le contexte commun. Le profil d'âge est adulte neutre ; aucun âge biologique n'est inventé. La température n'est pas un multiplicateur direct de la maladie.

Les stades ajoutent douleur, puis déficit/plafond de conscience et de respiration aux autres causes corporelles. Ils ne retirent pas de PV artificiels aux membres. Présentation, travail, incapacité et alimentation assistée observent les capacités communes. Les symptômes ne prouvent pas à eux seuls la possibilité de recevoir un nouveau soin.

## Sélection médicale et renouvellement

`care-rules.ts` distingue `injuryId`, `part` fraîchement manquante et `infectionId`. Les maladies admissibles entrent dans le même classement que les lésions : bénéfice0,025 avant gravité0,78, menace vitale1 à partir de0,78 ; comparaison avec saignement×1,5, puis gravité. La gravité d'infection est normalisée seulement pour ce classement, jamais convertie en PV anatomiques.

**Une infection est une opération indépendante.** Elle ne peut ni rejoindre le groupe de vingt PV de plaies ni partager gratuitement son médicament. `medicineCount` réserve donc une dose par infection admissible, en plus des groupes de lésions existants. Chaque opération exige approche, éventuel prélèvement, portage, travail au chevet ou auto-soin physique. Les politiques du patient, la réservation du service, la qualité, la variation additive et l'XP au résultat restent celles du système médical commun. Aucun médicament ou gain d'XP n'est consommé pendant le trajet ou une interruption.

Un premier soin donne37 500 Core de bénéfice. Le suivant est admissible lorsque le restant devient **strictement inférieur à7 500 Core** : l'égalité reste trop tôt. Le renouvellement ajoute37 500 au restant positif ; la nouvelle qualité remplace l'ancienne. L'expiration du bénéfice et la possibilité de renouveler sont deux échéances différentes. Après immunité complète, le patient n'est plus une cible soignable pour cette maladie, mais le bénéfice déjà actif continue jusqu'à expiration.

Le repos au lit reste possible entre les soins tant que la maladie n'est pas immune. À la fin d'une opération, l'intention Patient devient Repos au lit si cette affectation est activée et qu'une récupération le justifie : **le service physique du même lit est conservé**. Désactiver les soins ne supprime pas une maladie ou le droit au repos. Les besoins de nourriture conservent leurs trajets/ingestions, et l'alimentation assistée garde ses règles d'accès. Après immunité, une infection résiduelle ne force plus seule le repos volontaire ; incapacité et blessures continuent d'appliquer leurs propres conditions.

Le fournisseur de soins urgents conserve son seuil d'hémorragie et ses priorités. Cette maladie n'ajoute pas une interruption universelle de tous les travaux. La santé peut néanmoins arrêter réellement un acteur devenu incapable ou décédé.

## Capture du lieu de soin

`infection-room.ts` dérive la propreté de base des terrains de la composante du **patient**, au moment où le soin de la plaie réussit. Terre/herbe valent−1 ; sol rocheux découvert et eau ordinaire0. La moyenne suit la courbe d'infection retenue : une pièce entièrement en terre donne0,6 et une pièce rocheuse0,5. Une zone reliée au bord, une cellule de porte ou une absence de pièce donne1. Un toit n'ajoute pas de stérilité : une cour fermée et découverte reste une pièce pour cette statistique.

La topologie existante vérifie les obstacles réels, y compris les mutations en place. Le calcul n'est effectué qu'à l'achèvement d'un soin de plaie portant un risque, et une seule fois pour son groupe. Aucun balayage de carte par image ou par tick de maladie. Le facteur capturé est persisté en millièmes sur cette plaie ; déplacer le patient, changer le sol ou ouvrir un mur après le soin ne réécrit pas son passé.

Ce calcul reste **limité aux terrains**. Les contributions de fragments, ateliers et autres objets ne sont pas encore branchées ; saletés, nettoyage et planchers spécialisés restent absents. Le seuil Core de soixante régions ne peut pas être traduit fidèlement sans ses régions propriétaires ; aucune limite arbitraire en cellules ne lui est substituée. Ce score ne remplace pas silencieusement les approximations déclarées des autres systèmes de pièces.

## Frontières et sauvegarde

- `infection-types/rules/state/evolution/save` : conditions et risque, courbes, sélection, cadence, immunité et validation du noyau partagé.
- `injury-*` : origine des plaies, fusion, disparition, conséquences anatomiques et décès.
- Adaptateurs `health.ts` et `wildlife-health.ts` : besoins/postures réels, monde, journal, PRNG de santé et interruptions communes.
- `care-rules`, `tending`, `patient-rest`, `infection-room` : décision du soin, transaction de dose/XP, repos et capture de pièce. `TendTask` n'ajoute pas une seconde cible persistante contradictoire : le travail choisit le prochain traitement admissible au résultat.

V80 est strictement validée avant migration V81, sans maladie, immunité, délai, dose ou passé inventé. Les nouveaux champs sont rejetés dans une sauvegarde V80. Identités, parties, dates, intervalles, qualité, bornes et règles d'exclusivité doivent être cohérents avec leur dossier/propriétaire. Recharger ne relance ni candidat, ni délai, ni chance de maladie.

V81 est à son tour validée avant migration V82, sans ajout de profil de difficulté. Les anciens dossiers continuent donc avec leur coefficient historique et leurs échéances intactes. Le débit nominal global devient six ticks locaux par seconde réelle ; les unités médicales demeurent dix ticks Core par tick local. L'arrivée civile à 6 h du nouveau profil ne fait pas vieillir une plaie de six heures : soins et infections utilisent toujours le temps écoulé.

## Contrôles ciblés

`tests/infection-care.test.ts` regroupe quatre scénarios profonds :

1. Moyenne de terrain, murs/portes exclus, cour sans toit, sol rocheux mixte, mutation en place d'un mur et invalidation du cache.
2. Classement maladie mineure/menaçante et saignement, unités de gravité cohérentes, doses séparées, repos entre soins, politique et immunité distinctes.
3. Prélèvement/cargaison/XP/dose réels, reprise exacte pendant le travail, même lit entre deux soins, égalité stricte à7 500 Core et cumul du prochain traitement. Le saut d'horloge de cette fixture isole la frontière d'éligibilité ; ce n'est pas une preuve de survie sur plusieurs jours.
4. Facteur du patient capturé seulement à l'achèvement, conservé après sauvegarde/modification de pièce ; annulation par politique ou immunité complète pendant le travail, sans perte de dose ni XP fictive.

Campagne courte regroupée du20 septembre : **15/15** dans `infection-care`, `care` et `medicine`,7,27s ; typage réussi. La première tentative a révélé un matériau de porte manquant dans une nouvelle fixture, corrigé ; aucune assertion métier n'a été retirée. Après précision du terrain eau et ajout du cas immunité pendant travail, **4/4** ciblés passent en2,17s (`tmp/infection-care-final-v81.log`). Le noyau infectieux, les tirs réels, migrations, parcours de guérison/mort, UI et mesures de charge ont leurs validations complémentaires dans les preuves du lot ; ne pas déduire leur réussite de cette seule campagne.
