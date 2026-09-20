# Électricité, stockage et coupures

**V85 validée.** Le lot relie conduits, interrupteurs physiques, batteries et solaire aux appareils existants. Génération au bois et consommateurs sont déjà jouables depuis les versions antérieures ; G2 reste ouvert. [Référence réseau](../research/power-grid-reference.md), [référence batterie](../research/power-battery-reference.md), [référence solaire](../research/solar-power-reference.md), [recherche historique V42](../research/power-reference.md), [climatiseur](cold-store.md), [postes alimentaires](food-workstations.md), [preuves V85](../history/validation-energy-v85.md).

**V87 validée.** [Éolienne, radiateur et météo](wind-heater.md), [climat annuel](site-climate.md) et [incendies](fires.md) prolongent ce réseau. Les règles ajoutées ci-dessous décrivent l'implémentation livrée ; leur campagne commune, les vrais clics et les mesures sont suivis dans les [preuves V87](../history/validation-environment-v87.md), sans remplacer les preuves V85.

## Contenu et construction

| Appareil | Matériaux ; travail neutre local ; emprise | Fonction |
|---|---|---|
| Générateur à bois | 100 acier + 2 composants ; 250 ticks ; 2×2 | 1 000 W ; capacité 75 bois ; 22 bois/jour lorsqu'allumé |
| Lampe sur pied | 20 acier ; 30 ticks ; 1×1 | 30 W ; lumière ordinaire jusqu'à 50 % |
| Climatiseur | 90 acier + 3 composants ; 160 ticks ; 1×1 orientable | 20/200 W ; froid et rejet de chaleur |
| Cuisinière électrique | 80 acier + 2 composants ; 200 ticks ; 3×1 orientable | 350 W lorsqu'alimentée ; factures physiques |
| Conduit | 1 acier ; 3,5 ticks ; 1×1 | Transmission dans une couche compatible avec murs, portes et consommateurs |
| Interrupteur de réseau | 15 acier + 1 composant ; 20 ticks ; 1×1 | Ouvre ou ferme une composante |
| Batterie | 70 acier + 2 composants ; 80 ticks ; 1×2 orientable | 600 Wd ; rendement entrant 50 % ; fuite 5 Wd/jour |
| Panneau solaire | 100 acier + 3 composants ; 250 ticks ; 4×4 | Potentiel 0–1 700 W selon lumière naturelle et cases non couvertes |
| Éolienne — V87 | 100 acier + 2 composants ; 330 ticks ; 7×2 orientable | Potentiel 0–3 450 W ; vent partagé et dégagement de 112 cases |
| Radiateur — V87 | 50 acier + 1 composant ; 100 ticks ; 1×1 | 175 W en chauffe, 17,5 W en veille ; consigne initiale 21 °C |

Ces temps précèdent les compétences, capacités et conditions de travail. Construction 6 est requise pour finir le solaire, 5 pour le climatiseur et le radiateur, 4 pour la cuisinière électrique et l'éolienne ; aucun seuil n'est inventé pour la batterie. Les prérequis Core non encore imposés aux anciens générateur/lampe restent une adaptation historique connue.

Plans, cadres, livraison et dégagement restent physiques. Le générateur et la batterie commencent vides. Batterie, solaire et éolienne dégagent les piles, se traversent au coût local de 5 et ne sont pas des places d'arrêt ; le radiateur ajoute un coût de 3 et interdit aussi l'arrêt. Un conduit conserve les piles et zones admissibles ; il ne remplace pas silencieusement un autre transmetteur. Les réservations, coûts de surface et coins restent autoritaires.

Déconstruction et destruction emploient les restitutions/pertes matérielles existantes, prévalidation des dépôts et identités comprise. Batterie et radiateur sont minifiables : objet, identité et état sont conservés ; la connexion est retirée. L'orientation et la charge de la batterie sont conservées. Solaire, éolienne, générateur, conduit et interrupteur sont fixes. Démonter une batterie en matériaux ne restitue pas son énergie sous forme d'objet.

## Recherche et connaissances

`batteries` coûte 400 points, `solar-power` 600. Leurs progressions sont indépendantes ; le bureau, sa place de service, Intellect et le travail collectif sont partagés. Suspendre ou changer de projet conserve chaque progression. Aucun des deux projets ne nécessite l'autre.

Core demande Electricity au préalable, également pour l'éolienne et le radiateur sans projet supplémentaire. Lisière connaît déjà les bases électriques dans Atterrissage forcé et conserve l'accès global des camps historiques : l'arbre reste partiel. Aucun nouveau projet ni acquis n'est inventé à la migration. Batterie et solaire restent refusés sans leur recherche achevée, y compris dans un paquet chargé depuis une sauvegarde.

## Réseau et commande physique

`power-grid.ts` distingue transmetteurs, connecteurs et couches de construction. `power-topology.ts` dérive les composantes cardinales des vraies emprises : générateurs, panneaux solaires, éoliennes, batteries, conduits et interrupteurs fermés transmettent. Un contact diagonal ne raccorde pas. Lampes, climatiseurs, radiateurs et cuisinières consomment sans transmettre.

Le consommateur cherche dans un carré de six cases pouvant toucher une case secondaire d'un transmetteur, puis classe par distance entre ancres. Une connexion valide est conservée malgré un voisin plus proche ou une source vide. Les murs ne bloquent pas les fils. L'interrupteur ne sert pas d'attache directe : ouvert, sa cellule ne transmet plus. Batterie vide et générateur arrêté restent transmetteurs.

La commande marche/arrêt crée un travail `flick`, assigné selon **Tâches élémentaires**. Le colon rejoint une face accessible, puis effectue quinze ticks Core de service, terminés au deuxième tick local. Aucun bonus de Construction, lumière ou XP ne raccourcit ce geste. Le bouton produit une intention visible, pas une coupure à distance. Une demande opposée retire le travail devenu inutile ; le retrait de l'objet invalide les tâches liées. Une interruption reprend l'attente depuis zéro. À priorité égale, le geste précède les travaux ordinaires et le repos au lit, tout en laissant passer la prise en charge médicale. L'ordre sous mobilisation proposé par Core reste absent : le colon doit être démobilisé dans Lisière.

`switchOn` est le vrai interrupteur, absent signifie activé ; `on` est l'alimentation effective. Une pénurie ne change pas l'interrupteur. Lampe, générateur à bois, cuisinière électrique, climatiseur et radiateur possèdent une extinction individuelle. Batterie, solaire et éolienne n'en possèdent pas : leur isolation passe par le réseau.

## Combustible, puissance et réserve

Le générateur conserve 600 unités par bois et un reste de cinquième : 11/5 unités par tick, soit 22 bois/jour. L'extinction physique suspend cette combustion sans perdre le reste. Désactiver le seul ravitaillement automatique ne coupe pas le générateur. L'automatisme commence à 30 % de capacité ; prélèvement, trajet, face de l'emprise et service de 24 ticks restent réels.

Une demande de commutation bloque le ravitaillement automatique et préplanifie le dépôt des cargaisons interrompues. Le ravitaillement forcé reste distinct. Réglage de ravitaillement, interrupteur physique, manque de combustible, absence de connexion et pénurie énergétique sont des causes séparées.

`power.ts` traite dix frontières Core par tick local. Le démarrage progressif garde les périodes de 30 à 200 Core selon les candidats ; le délestage avance aux frontières de 20 Core. Sans stockage, 1 000 W permettent de maintenir 33 lampes de 30 W ; la 34e attend. Alimentation et PRNG persistent, topologie dérivée.

Le surplus charge à 50 % de rendement. Le déficit prélève sans deuxième perte d'efficacité. Parts égales entre batteries admissibles, redistribution lorsqu'une se remplit ou se vide ; aucune égalisation spontanée des niveaux. Surplus perdu lorsque tout est plein. Pas de plafond de débit additionnel à la capacité et à l'énergie disponible.

La réserve s'exprime en watt-jours, le bilan de puissance en watts. Une batterie perd 5 Wd/jour, placée, emballée au sol ou portée ; la pause ne consomme rien. Avec au moins 0,1 Wd dans un réseau équipé de batteries, la décision de redémarrage réserve 5 Wd : une lampe déjà allumée peut donc rester alimentée avec un stock ne permettant pas son redémarrage.

La réserve de 5 Wd décide si le groupe peut tenter des redémarrages ; chaque candidat est ensuite comparé au stock réel, sans soustraire une seconde fois cette réserve. Une batterie seule entre 0,1 et 5 Wd peut aussi retarder un générateur qui vient d'être rallumé : cette conséquence des classes locales est conservée, sans réamorçage gratuit. Isoler la batterie ou attendre sa décharge fait sortir de cette condition. Il s'agit d'une règle dérivée de l'exécutable, pas d'une observation de la sauvegarde témoin.

Le stock entier vaut 1/120 000 Wd par unité, capacité 72 000 000. V87 ajoute le reste sparse `half:true`, une demi-unité soit 1/240 000 Wd, pour représenter exactement la veille de 17,5 W et le rendement entrant. Il disparaît lorsqu'il est nul ; la capacité de 600 Wd inclut ce reste. Sans demi-unité, l'ancienne répartition entière est conservée. Charge, décharge, autodécharge et pertes d'énergie utilisent la même quantité réelle. Les potentiels solaire et éolien sont arrondis au watt entier. Les parts indivisibles tournent dans un ordre stable sans nouveau tirage de PRNG. Conservation au quantum choisi, pas identité des flottants/mélanges Unity.

## Environnement et présentation

Le solaire utilise le jour local commun à la lumière, notamment l'arrivée à 06 h du nouveau profil, et les cases non couvertes de son emprise 4×4. Avec le climat V87, latitude, date annuelle et heure pilotent cette lumière ; une partie historique sans adoption garde son jour fixe. Les huit météos de surface retenues ont un plafond lumineux Core de 1 : aucun malus arbitraire de nuages n'est ajouté au solaire. Ni lampes ni ombres décoratives 3D ne créent de puissance solaire. Les toits naturels restent absents.

Le générateur actif éclaire et chauffe selon le modèle historique ; la lampe éclaire sans chauffer. Climatiseur et cuisinière dépendent de leur vraie alimentation. Une coupure respecte leurs contrats de travail et conservation : ingrédients, ouvrages, réservations réconciliées et âges ne sont pas effacés. La lumière et le réseau doivent être observables après une commutation autoritaire.

Le radiateur chauffe le vrai volume d'air jusqu'à sa consigne, avec baisse d'efficacité lorsque la pièce est déjà chaude ; il ne retient pas de chaleur dans le réservoir extérieur. La coupe automatique de l'éolienne demande des travaux ordinaires et n'efface pas ses obstacles au clic. Vent, contrôle périodique de puissance et météo persistent séparément de la présentation. Les [incendies V87](fires.md) peuvent endommager les appareils et amorcer la mèche d'une batterie suffisamment chargée ; la destruction retire connexion, charge et combustible avec leurs pertes explicites.

Le rendu conserve lots résidents et champ lumineux partagé, sans lumière Three propre à chaque appareil. L'inspection distingue intention et interrupteur réel, réserve Wd et puissance W, absence de raccordement et manque d'énergie. Appareils dans Architecte, priorités dans Travail.

## Persistance et validation

V84 est strictement validée avant migration V85. La priorité Tâches élémentaires est ajoutée à 3, sans autre changement de priorités, cartes, calendriers, connaissances, charges ou tâches. Un ancien état électrique sans `switchOn` conserve son sens. Nouveaux appareils, charge, travaux de commutation et recherches sont refusés dans une version source antérieure. Charge entière bornée sur une vraie batterie seulement ; paquet déconnecté, non alimenté.

V87 valide strictement V86 avant migration. Aucun vent, épisode météo, chauffage, charge ou reste fractionnaire n'est reconstitué rétroactivement. Les nouveaux champs et appareils sont refusés dans les versions antérieures. L'adoption du climat et de la météo est explicite dans une ancienne colonie ; les états déjà adoptés continuent depuis leurs horloges et PRNG persistés.

La clé du cache comprend dimensions, identités, types, emprises, orientations et état réel des interrupteurs, pas combustible/charge. Aucun objet d'un ancien snapshot n'est retenu. Les réseaux équilibrés sans stockage ni appareil en attente gardent les dix scans sautés sans modifier les tirages historiques.

Les scénarios V85 regroupent construction, superpositions, commutation au contact, charge/décharge, frontières vide/plein, redémarrage, minification, reprises et versions invalides. La campagne centrale, les vrais clics, la reprise naturelle jusqu'à J42,21 et les mesures 3/30/100 ont réussi dans les limites des preuves V85. Cette reprise n'est ni une nouvelle passe monolithique ni une garantie d'autonomie universelle ; à cent personnes, le débit 6× demandé n'est pas tenu. La validation V87 reste distincte, avec ses résultats et limites dans les preuves associées.

G2 reste partiel : pas de réseau entre cartes, caravane électrique, arbre complet, toits naturels ni catalogue complet de producteurs. V87 implémente météo de surface, saisons du profil, éolienne, radiateur, incendies et réparations des appareils du catalogue ; cela ne livre pas les courts-circuits sous la pluie, pannes aléatoires, EMP, fusibles ni toutes les explosions Core. Accumulation de neige et diversité des climats restent absentes.
