# Horaires et sommeil — contrat V12

V65 : pendant l’errance triste, plafond volontaire de repos à 15 %, mais Travail empêche encore le coucher ; l’effondrement reste involontaire. Le sommeil termine cette crise et conserve le lit. [Contrat](mental-break.md).

V62 complète ce contrat par les [réveils après impacts et dommages](disturbance.md). Sommeil, repos médical, incapacité et deux échéances sont distincts ; les interruptions générales des autres emplois restent partielles. Les absences mentionnées dans les bilans anciens ci-dessous sont historiques.
Les [sources et décisions](../research/schedules-reference.md) distinguent règles adoptées, cadence adaptée et inconnues. Cette tranche ajoute des intentions horaires aux besoins existants ; V15 la complète par des [loisirs physiques](recreation.md).

## Règles présentes

Chaque colon dispose de 24 plages : Libre, Travail, Sommeil ou Loisirs. À la création, sommeil de 22 h à 6 h, libre autrement. Libre cherche le sommeil sous 30 de repos ; Sommeil sous 75 ; Travail ne déclenche aucun sommeil volontaire. Un adulte à zéro de nourriture ne s'endort pas volontairement. Un travail déjà engagé se termine avant le départ volontaire au lit. Hors ordre direct déjà accepté, un repas accessible reste prioritaire dans les quatre modes. Les [ordres directs V17](player-orders.md) reportent les pauses ordinaires mais pas l’effondrement. Loisirs garde le seuil de repos de Libre ; le sommeil peut donc le remplacer en cas de fatigue.

Un dormeur continue en Libre jusqu'à 100. Travail le réveille dès qu'il a au moins 20 de repos. Une faim critique peut le faire sortir du lit uniquement si une portion est accessible et réservable ; le profil adulte supprime l'ancien verrou arbitraire de cinq points de repos. Le trajet utilise toujours la même navigation et les mêmes réservations de lit. Aucune commande horaire ne téléporte, ne consomme et ne donne du repos.

La [chasse civile V79](hunting.md) est une exception explicite à la finition du travail avant coucher : sa poursuite peut être libérée pour un repas accessible ou le sommeil volontaire. La désignation reste en attente pour une reprise ultérieure ; les projectiles émis et la récupération après tir restent indépendants. Un loisir ne s'ajoute pas à une chasse en cours. Cette cadence réutilise les besoins civils de Lisière et ne prétend pas reproduire tout le ThinkTree de la référence.

Le repos adulte baisse de 95/6 000 points par tick éveillé, pondérés par catégorie. À très faible repos, le compteur d'épuisement et un tirage déterministe permettent un effondrement différé. V44 : l’effondrement interrompt le travail même sans dépôt disponible ; le colon dort en conservant sa cargaison, puis la dépose lorsqu’une case proche se libère. Le réveil reste possible avant ce dépôt. Voir le [contrat des interruptions](interrupted-cargo.md). La récupération exige réellement la position du lit ou celle du repli au sol. Qualité, santé et traits ne modifient pas encore ces taux.

Les interruptions alimentaires conservent la cadence locale des besoins et peuvent préempter le travail ; reproduire les conditions d'expiration de chaque job Core reste ouvert. V14 permet le passage entre colons civils ; rejoindre un lit nécessite toujours son attribution et sa réservation, jamais un simple passage dans sa cellule.

## Frontières et persistance

`schedule.ts` définit les plages et commandes, `rest.ts` la calibration et l'épuisement, `sleeping.ts` la sélection/occupation du couchage ; `needs.ts` orchestre les besoins. Les jauges ne dépendent pas de l'UI. L'état de tirage utilise `World.rng`, jamais une horloge réelle.

V12 persiste `World.restRules`, `Pawn.schedule`, `restZeroTicks` et `collapsePending`. Les versions antérieures sont validées avant migration. V11 reçoit le profil `legacy` et 24 plages libres : ancienne vitesse de fatigue, effondrement et garde de réveil conservés. Positions, jauges, RNG, piles, tâches et chemins sont inchangés au chargement. Les nouvelles parties sont `adult`. Cette compatibilité historique ne vaut pas calibration Core.

Les commandes `schedule-paint` et `schedule-replace` valident tous leurs champs avant mutation : colon existant, 24 heures valides pour un remplacement, heures distinctes entre 0 et 23 pour un tracé, activité reconnue. Le tableau fourni est copié. Un refus ne modifie rien. Les gestes s'appliquent via le worker ; une sauvegarde malformée ne remplace jamais l'état actuel.

## Présentation et contrôles

Horaires reste dans la barre inférieure, accessible par F2. Peinture par clic/glissement sur une ligne, sans traversée automatique de minuit ; copie/collage d'une journée indépendante. Tab, Entrée et Espace gardent leur comportement de bouton dans le panneau ; Échap annule le tracé. Loisirs est actif depuis V15 ; sa jauge et ses règles ont leur [contrat](recreation.md).

Les boutons sont conservés entre snapshots afin de préserver le focus et le glissement. Les cellules ne sont mises à jour que lorsque l'horaire change ; le surlignage d'heure change une fois par heure simulée. Aucun objet de rendu ni calcul osseux CPU n'est ajouté. Les [preuves courantes](validation.md) séparent tests métier, parcours UI et audits 3/30/100.
