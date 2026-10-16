# Fondations monde : contrat de fin

Ordre humain du16octobre2026 : terminer planète, génération, biomes et voyages/multicarte/persistance, y compris interactions et menus, avant tout autre ajout de contenu. Référence fonctionnelle : **RimWorld Vanilla Core1.6.4871 rev590 vérifié**, sans fonctions nécessitant un DLC. Aucun état ci-dessous n’est un certificat de parité ; le chantier reste ouvert. [Audit initial](multimap-audit-v406.md).

**Périmètre actualisé par l'utilisateur :** finir le lot engagé puis travailler avec **une colonie**, réglage maximal1 par défaut. Le réglage1–5 deV407 et ses sauvegardes sont conservés ; l'approfondissement multicolonie est différé, sans prétendre qu'il est exhaustivement terminé. Les camps, cartes temporaires et caravanes utiles à une seule colonie restent dans le chantier. Aucun nouveau banc5colonies comme condition de livraison.

## Critères de fin communs

Une exigence est fermée seulement avec règle primaire datée, implémentation réellement raccordée, interaction joueur, conservation/reprise et contrôle indépendant pertinent. Les écarts, adaptations de représentation3D et inconnus restent visibles. Les graines/bruits originaux ne deviennent pas identiques au Core par simple égalité de quelques constantes. Aucune source ou image propriétaire n’entre dans le produit.

| Ensemble requis | Résultat vérifiable attendu | État initial |
| --- | --- | --- |
| Création du monde | Graine, paramètres Vanilla, couverture, population/factions, progression, annulation/refus et confirmation réellement reliés au monde créé. | Partiel : planète162cases, plusieurs options inactives. |
| Géographie globale | Relief et obstacles distingués, climat cohérent, régions/biomes, océans/lacs, côtes, réseaux fluviaux et routes liés aux voisins ; métadonnées fiables au choix du site. | Partiel, rivières/côtes absentes. |
| Génération locale | Même provenance graine/tuile et caractéristiques au foyer et à toute nouvelle carte ; relief/roches, eau/profondeurs/rives/patchs, végétation et faune conformes aux biomes Core. Aucun terrain artificiellement séché pour réussir un départ. | Quatre biomes partiels, eau tempérée/franges/liaisons absentes. |
| Implantation prioritaire | Une colonie, persistante même vide, implantation valide, abandon explicite et réimplantation sans racine immortelle. Conserver l'option1–5 livrée ; son approfondissement est différé. | RegistreV407 qualifié ; défaut1. Pas de clôture exhaustive du multicolonie. |
| Cartes temporaires | Camp/rencontre/site distincts d’une colonie, conditions d’entrée/reformation/retrait/conversion et conséquences conservées. | Absents. |
| Caravanes | Plusieurs groupes, sélection personnes/animaux/biens, prise réelle, masses, route, besoins, changements de route, division/fusion, entrée et retour aux bonnes cartes. | Un groupe humain et catalogue de chargement bornés. |
| Autorités et persistance | Un propriétaire par personne/bien, identités et PRNG conservés, toutes cartes/groupes sauvegardés ; migrations strictes des anciens formats avant conversion neutre. Reprise à chaque transition risquée. | Deux cartes vérifiées, modèle non généralisé. |
| Interfaces | Parcours et commandes Vanilla correspondants : Monde, tuiles, formation, contexte de caravane, navigation entre cartes, implantation/camp/reformation/abandon, erreurs et confirmations. Aucun bouton actif sans fonction. | Panneaux propres partiels ; pixels actuels pas tous inspectés. |
| Continuité et performance | Cartes actives et voyageurs continuent hors vue ; alertes naviguent vers les bons IDs. Coûts génération/mémoire/worker/adoptionMAIN/image/GPU séparés, référence matérielle et limites déclarées. | Ralentissement navigateur ancien non clôturé par les gains Node. |

## Étape actuelle

[Registre V407](../gameplay/world-maps-v407.md) qualifié localement au schéma255 : plusieurs cartes/groupes, colonies1–5, camp200², abandon sans racine obligatoire et reprise complète avec les mêmes propriétaires. Publication255 différée. Le développement courant conserve1colonie comme référence. Cette étape ne ferme pas le tableau : géographie/local256, animaux/cadence voyage, WorldPawns évolutifs et UI Vanilla complète restent ouverts. Les lignes « état initial » ci-dessus décrivent volontairement le point de départ, pas les acquis récents.

## Exécution et responsabilités

V405table3×3 reste figée et non adoptée. Aucun nouveau catalogue, mise à jour décorative des Aulnes ou autre chantier avant ces fondations. Les ensembles peuvent être implémentés en parallèle sur copies privées, intégration centrale et contrôles lourds successifs ROOT. Pas de nouveau protocole pour chaque incident ou longue campagne gagnée exigée ; contrôles composés ciblés et parcours réels, élargis lorsque les frontières changent.

Premiers ensembles : registre de cartes et groupes avec cycle de vie/persistance ; géographie et provenance globale→locale ; menus reliés aux autorités confirmées. Un numéro de schéma est réservé avant intégration de chaque évolution persistante. Une livraison intermédiaire reste une étape, jamais la clôture du domaine.

Préserver Aulnes publiquesV394, toutes archives et parties personnelles, références_UI et branche UIpapier. La branche blesséeV397 reste au seul vrai21483 ; aucune reprise favorable ou guérison fabriquée. Les anciens mondes ne sont pas régénérés. Les premiers nouveaux mondes ne réécrivent pas les calendriers ou terrains historiques.

À l’achèvement réel : revue indépendante des critères ci-dessus et vérification du produit publié. La dernière demande humaine ajoute ensuite une **nouvelle colonie de démonstration**, créée sur le générateur final : aménagements, objets et activités aussi complets que cohérents, patrimoine préparé explicitement déclaré, vraies transitions d’usage vérifiées. Ne pas régénérer Les Aulnes ni remplacer leurs archives ou parties personnelles. Une préparation anticipée ne prouve ni la fin du générateur ni une acquisition naturelle des biens. Rendre alors le rapport distinguant règles, UI observée, reprises, performances et écarts résiduels, puis arrêter le travail autonome et son automatisation ; aucun enchaînement de contenu supplémentaire.
