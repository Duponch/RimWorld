# Cassandra : première canicule naturelle — V180

Cette tranche ouvre un incident environnemental dans **Atterrissage forcé / Cassandra partielle / Récit d’aventure**, au schéma **169**. Elle relie le narrateur aux refuges, vêtements, températures et soins existants ; elle n’ajoute ni une nouvelle recette ni un système thermique parallèle. La [recherche Core datée](../research/cassandra-misc-core-v180.md) distingue les règles vérifiées de notre sous-catalogue. La [preuve](../history/validation-cassandra-misc-v180.md) borne la livraison.

## Décision du joueur et périmètre

Une canicule peut survenir naturellement, sans être garantie la première semaine. La lettre explique les réponses : local fermé et couvert, refroidissement approvisionné, habillement et secours physiques. Les températures, capacités, refuges et morts suivent les [règles thermiques](heatwave.md) existantes. Le nouveau flux ne remplace pas les calendriers indépendants des raids, visiteurs et maladies.

La tranche livre HeatWave seulement parmi les incidents divers. Les autres incidents, la petite menace introductive, les facteurs de population/récence et les autres narrateurs restent absents ou partiels. Elle ne revendique pas une distribution contextuelle identique à RimWorld. Les voyages et systèmes sociaux conservent leur priorité distincte dans la [roadmap](../ROADMAP.md).

## Horloge et tirages

- Occasion introductive à 26 400 ticks locaux (J4,4), uniquement si encore future à l’adoption. Pas de rattrapage d’une ancienne introduction.
- Contrôles de catégorie tous les 100 ticks, **strictement après J5** : premier contrôle au tick 30 100. Probabilité de tentative `100 / (4,8 × 6 000) = 1/288`, linéaire comme le Core inspecté.
- **Adaptation explicite** : un ticket HeatWave sur une masse fixe de 16,9, inventaire brut des 21 définitions Misc de carte Core. Les 15,9 autres tickets restent silencieux. Aucun poids absent n’est transféré à la canicule. Cette enveloppe n’est pas le dénominateur dynamique du Core.
- Un ticket chaleur exige un climat adopté et une température **saisonnière** ≥20 °C, aucune canicule active et trente jours révolus depuis le dernier déclenchement. Une journée chaude dans une saison fraîche ne suffit pas. Une ancienne partie sans climat consomme le ticket sans canicule : aucun climat ni saison de substitution n’est créé. Un refus consomme l’occasion ; aucune relance immédiate.
- Durée 1,5–3,5 jours, montée/descente sur 1 200 ticks, maximum +17 °C. Une seule notification au début et à la fin. ColdSnap et VolcanicWinter sont exclusifs dans le Core ; ces conditions ne sont pas encore jouables ici.

Le PRNG de `World.miscIncidents` est privé et persisté. La sélection ne consomme pas le RNG du monde, des raids, visiteurs, maladies ou du camp historique. Les effets physiques ultérieurs continuent de suivre leurs propres règles et flux.

## Adoption, sauvegarde et frontières

`World.miscIncidents` est optionnel. Une nouvelle partie sélectionnée l’initialise au tick zéro. Une ancienne partie de ce profil l’adopte **prospectivement à la reprise de la simulation**, avant le premier tick ; charger, sauvegarder ou appeler un pas de zéro tick ne crée ni calendrier, incident, exposition ni tirage. Les camps sans profil gardent `World.heatwaves` et leur ancien comportement.

Le schéma **168 est validé strictement avant migration neutre vers 169**. Un calendrier futur caché dans un ancien schéma est rejeté. La migration change uniquement la version ; aucune histoire ou ressource rétroactive. Validation des champs exacts, du profil, des dates quantifiées, compteurs, intervalle actif et cooldown ; sauvegarde/reprise conserve le calendrier et le PRNG. Le décodeur du bridge refuse aussi un calendrier incohérent avant adoption.

La chaleur extérieure et la lettre consultent une projection commune `activeHeatwave`, sans additionner les deux calendriers. Le profil sélectionné conserve l’interdiction du calendrier historique. Le rendu ne modifie pas le World ; aucun nouveau mesh, texture, shader ou upload par image.

## Validation attendue

Contrôles courts : frontières temporelles, ticket absent, saison contre cycle quotidien, cooldown depuis le début, durée/rampe, flux privés, migration/refus atomique et continuation exacte. La colonie **« Canicule et refuge · 3 colons »** est un scénario préparé accessible par les vrais menus ; elle exerce le vrai déclenchement puis les températures et la reprise, sans prouver une fréquence naturelle Core.

Régression hors campagnes longues, build, présentation et navigateur natif se déroulent successivement sur sources gelées. Le calendrier est O(1) par tick, sans recherche métier entre occasions ; un banc isolé borne son coût CPU sans promettre de gain général, de coût GPU nul ou de fréquence d’images. Les campagnes longues et la parité exhaustive du narrateur restent hors preuve.
