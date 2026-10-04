# V207 — Couvert bas construit en tissu

Lot en mode jour, schéma **189** après validation stricte de **188** et migration neutre. Aucun ouvrage, tissu, progrès ou bilan textile rétroactif. Cette tranche équilibre préparation défensive et habitat après V206 ; elle ne livre pas le catalogue de sécurité exhaustif.

## Référence et portée

La [recherche Core 1.6.4871](../research/defensive-cover-core-v207.md) distingue les définitions locales primaires, l'assembly identifié et la contre-lecture Internet. Le sac local reprend **cinq tissus**, **180 unités Core soit 18 ticks neutres**, **300 PV**, **0,55 de remplissage**, **beauté −10** et **inflammabilité zéro**. Aucun prérequis de recherche ou de Construction ; vitesse, capacité et lumière ordinaires restent actives. Tissu seul, empreinte 1×1, orientation zéro, sans qualité ni désinstallation/réinstallation. Autres textiles/cuirs et barricades sont différés.

Le remplissage agit dans les requêtes balistiques existantes : couvert voisin directionnel, décision à l'émission et interception en vol restent distincts. 55 % n'est ni une protection universelle ni une réduction de dégâts. Le sac ne bloque pas la ligne de vue comme un mur, ne ferme pas une pièce ou un enclos, ne soutient pas un toit et ne protège pas de la mêlée. Il peut subir les impacts réels et être réparé dans le foyer au contact, sans consommation supplémentaire de tissu.

## Construction, passage et restitution

Architecte → Structure expose coût, couvert et traversée. Les cinq tissus doivent être acquis, pris et livrés réellement avant le travail. Annulation conserve les propriétaires et restitutions du pipeline existant. Le volume demande le dégagement ordinaire : pas de stockage ni de pile dans le sac. L'accès physique et les reservations sont revalidés aux transitions.

Le sac est franchissable au niveau du sol avec supplément **4,2 ticks** d'entrée. La non-répétition est commune aux ouvrages qualifiés, y compris une table suivie d'un sac ; une arête engagée garde sa durée capturée. Les destinations ordinaires locales refusent l'arrêt sur cette case. **Adaptation tactique : Core 1.6 peut choisir une position de tir PassThroughOnly, moins préférée ; ce lot conserve la sélection locale de positions et ne prétend pas reproduire cette exception entière.** Les raids distinguent couvert endommageable et obstacle à briser pour passer.

La destruction restitue **25 %** avec arrondi stochastique : un ou deux tissus sur cinq. La déconstruction conserve la règle existante **50 %** : deux ou trois tissus. Placement, identités, pertes et PRNG sont prévalidés avant retrait ; un refus ne perd ni ouvrage ni ressource ni état aléatoire. La destruction conserve son registre distinct. `deconstructed.lostTextiles?` ajoute prospectivement les pertes de tissu/cuir des déconstructions futures, sans reconstituer les anciennes pertes ; ce bilan n'est jamais du stock. Les gravats spécifiques SandbagRubble Core sont différés.

## Persistance et présentation

Sauvegarde et bridge partagent la garde du sac et du bilan textile. Sous 188, sac construit, plan, déconstruction, paquet ou bilan futur sont refusés avant migration. Sous 189, matière, orientation, empreinte, dégâts et champs propres sont stricts ; aucun paquet, qualité, combustible, état électrique ou médical n'est admis. Les validations ordinaires conservent les références et réservations complètes. Le decoder refuse atomiquement un delta invalide et conserve le World précédent, y compris au même tick.

Les sacs pastel utilisent les boîtes et pigments du mobilier résident ; aucun mesh ou shader par ouvrage, ni recherche balistique au rendu. Plans, retrait, sélection et deux caméras présentent l'état confirmé. Textures désactivées garde la règle d'absence de prélèvement du pigment. Le modèle 3D original n'importe aucun asset RimWorld et ne définit pas la collision logique.

La scène préparée « Sacs de sable · construction et couvert » fournit cinq tissus au sol, une bâtisseuse et deux alliés armés pour un exercice de tir volontaire. Aucun sac, livraison, impact, foyer ou réparation n'est fourni. Les tirs sont dangereux pour les alliés et probabilistes ; ne pas promettre un premier impact sur le couvert. La [preuve V207](../history/validation-sandbags-v207.md) doit distinguer contrôles ciblés, parcours natif, présentation, coût CPU isolé et contrôles non exercés. Mesures lourdes successives, sources gelées ; aucune stabilité de pipeline ne prouve un coût GPU nul ou un gain général. Après commit local, attendre la relance.
