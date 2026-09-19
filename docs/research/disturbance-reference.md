# Réveils et dommages — recherche V62

Consultation fraîche : **19 septembre 2026**. Corpus HTML chapitres 8/9/14/15/19/20 et XLSX SYS-035/044/079/089..091/094/096/110..112 relus. Adopter sommeil/posture/capacité distincts, conséquences anatomiques et interruptions conservatrices ; adapter acoustique et cadence ; différer la préemption générale des emplois. Aucun SYS global clos.

## Sources et portée

- [Rest, wiki](https://rimworldwiki.com/wiki/Rest) : besoin et effondrement, réveil par mobilisation ; ce résumé ne documente pas tous les signaux de combat.
- [Assign, wiki](https://rimworldwiki.com/wiki/Assign) : politiques civiles ; complément au chapitre d'interface, pas preuve des échéances internes.
- [Correctif officiel 1.6.4850, 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : corrections de cadence, obstacles, rayons et dormance. Il est postérieur au miroir ci-dessous ; pas de certification de la dernière révision exécutable.
- [Miroir tiers épinglé du 20 mai 2026](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f) : téléchargements frais de Pawn, Pawn_MindState, Pawn_HealthTracker, Pawn_JobTracker, RestUtility, Toils_LayDown, JobDriver_LayDown, JobGiver_GetRest, JobGiver_PatientGoToBed, JobDef, Projectile, Bullet et GenClamor. Sources consultées dans `tmp`, non distribuées ; code local indépendant. Ce miroir constitue une observation d'une révision, non une seconde confirmation officielle des nombres.

## Ce qui change notre compréhension

`Projectile.Impact` émet un signal **à l'arrivée**, de rayon 12. Ce n'est pas une alarme universelle à l'émission du tir. `Bullet.NotifyImpact` et ses neuf cases concernent une autre notification, notamment les vêtements : ne pas confondre ces deux rayons.

`GenClamor` filtre par distance strictement inférieure au rayon multiplié par l'audition plafonnée à un, et parcourt des régions connectées en excluant les portes fermées. Le son peut contourner un obstacle ; une ligne de vue directe n'est pas requise. Son plafond de quinze régions dépend du partitionnement interne Core. Notre connexion des espaces d'air et portes ouvertes conserve les barrières mais n'imite pas ce découpage propriétaire : c'est une **adaptation déclarée**, potentiellement différente dans les dédales, à revoir avec une observation comparative.

`HearClamor(Impact)` exclut morts/à-terre, repousse `canSleepTick` de 1 000 ticks Core et interrompt un dormeur. Un patient couché éveillé ne se lève pas simplement à ce signal. `Harm`, émis à rayon 18 par la santé, réveille certains NPC endormis de la faction de la victime ; il ne réveille pas automatiquement tous les colons alliés. Les branches prisonniers, animaux, capacités et DLC sont distinctes et différées.

La violence reçue alors que la posture est couchée renseigne `lastDisturbanceTick`. `RestUtility` empêche le retour volontaire couché pendant **400 Core** ; `CanFallAsleep` utilise aussi ce délai. En revanche les 1 000 Core du bruit filtrent le fournisseur de sommeil ordinaire, **pas** universellement le repos médical. Une personne peut donc reprendre un repos médical avant la fin du délai de bruit. Ni l'un ni l'autre ne soigne une blessure ou ne restaure le besoin de repos.

Le gestionnaire de jobs n'annule pas tous les travaux à chaque dégât : il appelle le driver, vérifie violence externe, permission d'interruption, absence d'ordre joueur forcé, cadence de 180 Core et mode du job. La relecture invalide toute proposition de « réinitialiser tous les jobs dès qu'un colon est touché ». V62 réveille au producteur d'impact les services de repos mobiles concernés ; les autres emplois gardent leurs contrôleurs et interruptions déjà livrés. Ce réveil direct est une adaptation temporelle explicite : nous ne prétendons pas reproduire toutes les branches d'override du gestionnaire Core ni son ordre exact par rapport à la notification mentale.

Les mouvements des voisins et les souvenirs de sommeil dérangé ne sont pas ces réveils défensifs. Pensées, bruit de construction, perception de présence seule, réveils collectifs de raids, animaux et DLC ne deviennent pas livrés par ce lot.

[Contrat courant](../development/disturbance.md), [preuves](../history/validation-disturbance-v62.md).
