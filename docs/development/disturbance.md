# Réveils défensifs — V62

Un projectile qui arrive réveille les dormeurs mobiles qui l'entendent, même s'il frappe le sol. Rayon strict de douze cellules à audition normale, réduit par la capacité réelle. Murs, roche pleine et portes fermées isolent ; les portes ouvertes connectent les espaces. Les meubles, personnes, eau et toits n'isolent pas ce signal. La [recherche](../research/disturbance-reference.md) distingue cette adaptation spatiale de la partition de régions Core.

Le dormeur libère son service de lit, sans changer son propriétaire ni gagner du repos. La réaction civile existante décide ensuite Fuir, Attaquer ou Ignorer selon visibilité et portée. Un réveil n'impose ni cible invisible ni mobilisation. Sortie du lit et fuite restent physiques. Le journal signale l'interruption ; l'UI et les poses GPU observent la même transition sauvegardée.

Un impact entendu interdit un **nouveau choix volontaire de sommeil** pendant 1 000 Core (100 ticks locaux). Une violence reçue en posture couchée interdit de se recoucher volontairement pendant 400 Core (40 locaux). Les deux échéances se renouvellent sans s'additionner. Le trajet vers un lit déjà accepté n'est pas une posture endormie ; le bruit seul ne le téléporte ni ne l'annule. L'effondrement involontaire n'est pas remplacé par une immunité magique à la fatigue.

Le patient couché éveillé conserve son service au bruit seul. S'il dormait, il se réveille ; s'il reçoit un dommage couché et reste capable, il quitte son repos. Le délai de 400 Core filtre le fournisseur médical, tandis que celui de 1 000 filtre seulement le sommeil ordinaire. À terre, décédé ou porté : aucun lever causé par un bruit. Un allié NPC endormi peut aussi être réveillé par les dommages d'un membre de sa faction, à rayon 18 réduit par l'audition. Besoins complets des NPC et groupes de raid restent absents.

## Propriété et horloges

`disturbance-state.ts` définit `Pawn.disturbance` : `sleepUntilCore` et `lieUntilCore`, absents avant le premier événement. Schéma V61 strictement validé avant migration V62 neutre : pas d'impact, d'histoire, de personnage ou d'échéance inventé. Forme exacte, entiers positifs ou nuls et bornes temporelles vérifiés. Les échéances expirées peuvent rester dans la sauvegarde ; leur comparaison utilise le temps simulé uniquement.

`disturbance.ts` libère uniquement le besoin de repos actuel, sans annuler une file joueur, une cargaison d'urgence, une arête ou une récupération. Il ancre la santé du patient avant de changer de posture. `schedule.ts`, `patient-rest.ts` et `rest.ts` consomment les critères appropriés ; aucun bonus hors du service physique.

Les producteurs projectile, mêlée réussie et toiture construite transmettent la notification de violence, distincte de l'ajout clinique d'une blessure. Le signal acoustique de projectile précède son dommage. Une cible mobile déjà réveillée par ce son conserve la preuve qu'elle était couchée avant l'impact. Les caches de posture/tir sont renouvelés après un réveil, **y compris après un raté au sol**. Récupération du tireur, état du projectile et PRNG anatomique ne sont pas réinitialisés.

`impact-sound.ts` capture les espaces une fois à la demande dans la transaction de combat. Le cache dérivé vérifie le masque complet lors d'une nouvelle lecture ; aucune confiance dans l'identité d'un tableau ou le seul tick. Les portes ouvertes sont recapturées. La fermeture locale ne survit pas à un changement de géométrie/porte ni au tick. Aucun parcours par frame et aucune recherche de route par dormeur. Si de futurs impacts détruisent les bâtiments, il faudra invalider cette capture avant le projectile suivant.

## Limites

La réaction aux dégâts **des autres emplois** n'est pas un système complet d'override Core. Ordres forcés, soins en cours, cargaisons, cooldowns et incapacités conservent leurs règles antérieures. Différés : surprises/interruptions particulières d'autres armes, cris/construction/pas, souvenirs, groupe de raid, objectifs cachés, besoins NPC complets, armures et audio. Ce lot ne clôt aucun jalon G0–G5.

Tests : arrivées réelles, bruit et audition, portes/contournement, patient éveillé, trois politiques civiles, conservation des cargaisons/files, mêlée réelle, incapacité, continuation et migration ; UI native à 1×/6× et charge mixte commune. [Preuves et limites](../history/validation-disturbance-v62.md).
