# Déroulement observé de colonies Core

Relevé du **20 septembre 2026**, recherche uniquement. Aucune partie RimWorld, sauvegarde ou configuration n'a été modifiée. Cette note complète la [recherche de scénario](scenario-start-reference.md) et la [revue de première semaine](first-week-reference.md) ; elle ne fixe pas une cadence obligatoire pour le joueur.

## Ce que ces preuves permettent de dire

Les parties observables confirment une progression où abri, nourriture, travail, défense et développement se chevauchent. Elles ne permettent pas de définir une « semaine moyenne » chiffrée. Les compétences, le site, les choix du joueur et les événements reçus diffèrent fortement. Un atelier disponible n'est pas nécessairement employé ; une construction présente dans une sauvegarde n'en donne pas la date d'achèvement.

**Les réglages par défaut se vérifient dans le menu et le code de la version installée.** Les choix enregistrés dans une partie de l'utilisateur ne sont ni les valeurs par défaut ni ses préférences permanentes. Le tutoriel constitue également un scénario distinct : ce point change l'interprétation des données locales ci-dessous.

Corpus : chapitres 5–7 (monde), 11–12 (production/alimentation), 13 (personnes), 24 (scénario/narrateur), via [reference-adoption](reference-adoption.md). SYS-016/017, 084/085 et 132–135 restent des contrats à confronter. **Adopter** la distinction scénario, personnes, site et incidents ; **vérifier** les valeurs dans la bonne version ; **différer** toute cible statistique prétendument représentative.

## Niveau de preuve et limites de consultation

| Niveau | Consultation effective | Limite |
|---|---|---|
| Sauvegardes historiques | XML lu directement, métadonnées de 88 fichiers ; inspection détaillée de cinq états, archives, objets et courbes agrégées | Ce sont deux mondes seulement, dont une longue partie issue du tutoriel. Pas un échantillon de joueurs moyens. |
| Nouveau témoin utilisateur | `Reference-Core-4871`, métadonnées, objets et grilles, cinq captures réellement examinées | Troisième monde au tick 283 : mesure du départ, sans chronologie longue. |
| Journaux de parties ci-dessous | Textes de première main, dates de jeu et réglages déclarés, pages comportant des captures | Les images n'ont pas été examinées visuellement dans cette recherche. Les légendes et récits restent des déclarations de l'auteur. |
| Présentation officielle | Description directe de la fonction du narrateur et de la diversité des situations | Elle ne donne pas un calendrier de construction ou une difficulté moyenne. |
| Vidéo proposée antérieurement | Tentative d'ouverture de [SjLlqTnTRsc](https://www.youtube.com/watch?v=SjLlqTnTRsc) : échec de récupération | **Vidéo non visionnée**, aucune observation de mouvement, de combat ou d'interface n'en est déduite. |

Le navigateur visuel de cette session n'était pas disponible : création d'un onglet refusée et inventaire des navigateurs vide. Les liens d'images interrogés n'ont pas fourni de capture exploitable. Cette limite n'est pas remplacée par une affirmation de visionnage. Pour une preuve visuelle future : séquence accessible et réellement examinée, réglages visibles, repères temporels et captures décrites explicitement.

## Échantillon local anonymisé

L'installation présente est **1.6.4871 rev590**. Les sauvegardes ont leurs propres versions : ne pas appliquer rétrospectivement le binaire actuel à leurs résultats. Les 88 en-têtes enregistrent uniquement `ludeon.rimworld` ; cela atteste la liste de modules sauvegardée, sans prouver l'absence de toute modification externe passée.

| Ensemble | États conservés | Version enregistrée | Scénario et paramètres sauvegardés | Couverture |
|---|---:|---|---|---|
| A | 1 | 1.4.3641 rev639 | Atterrissage forcé, Cassandra, difficulté `Easy` | Tick 100 : tout début de partie, pas de progression mesurable. |
| B | 87 | 1.6.4633 rev1261 | **Tutoriel**, Phoebe, difficulté `Easy` | Du tick 302 294 au tick 12 605 756 : 5,0382 à 210,0959 jours écoulés. |

L'inspection indépendante des grilles identifie deux cartes **250×250 en forêt tempérée** : petites collines pour A (`Hilliness = 2`), terrain plat pour B (`Hilliness = 1`). Même biome et mêmes dimensions ne signifient donc pas même relief ni même implantation initiale. Les densités de terrain et de végétation appartiennent à l'audit de génération distinct.

Les identités ont été rapprochées par les informations du monde, la tuile initiale et le démarrage temporel, puis anonymisées. Les dates des fichiers se répartissent entre janvier 2024 pour A et janvier–février 2026 pour B ; elles ne remplacent pas l'horloge interne. Deux paires de fichiers successifs par date reviennent vers un tick antérieur : indice de reprises, branches ou copies, insuffisant pour reconstituer à lui seul chaque rechargement. Les 87 états ne sont donc ni 87 expériences indépendantes ni une succession garantie de commandes sans retour.

Dans B, le scénario ajoute **300 tissus** aux objets du départ. `tutorialState.endTick = 98 859` et `introDone = True`. L'archive comporte une attaque à 93 134 ticks, **avant cette fin de tutoriel**. Le XML établit cette chronologie ; identifier sa fonction génératrice exacte relève de la lecture du tutoriel. Il serait incorrect de transformer cette attaque en délai du premier raid d'un Crashlanded ordinaire avec Phoebe.

### Événements conservés au début de B

Les jours ci-dessous sont `ticksGame / 60 000`, donc des **jours écoulés depuis le début**, pas le numéro de date locale affiché. Le champ `arrivalTick` date une lettre reçue ; il ne mesure pas la durée du combat.

| Tick | Jours écoulés | Archive constatée |
|---:|---:|---|
| 93 134 | 1,5522 | Raid, sans quête associée, avant la fin enregistrée du tutoriel |
| 98 859 | 1,6477 | Fin du tutoriel, champ d'état distinct d'une lettre |
| 150 000 | 2,5000 | Visiteur |
| 204 000 | 3,4000 | Écureuil enragé |
| 264 000 | 4,4000 | Capsule de sauvetage |
| 301 000 | 5,0167 | Apprivoisement spontané d'un grizzly |
| 324 000 | 5,4000 | Autre raid, conservé dans l'état suivant |

Les visiteurs, l'animal enragé, la capsule et le raid à 324 000 sont compatibles avec la séquence d'introduction standard étudiée séparément. Ils ne sont pas quatre réalisations indépendantes de la cadence libre de Phoebe. Les vieilles lettres n'apparaissent plus dans l'état final ; **absence d'une lettre dans une archive tardive n'est pas preuve d'absence de l'événement**.

### Infrastructures constatées, sans dates de construction inventées

Objets filtrés par faction propriétaire pour éviter d'attribuer les ruines au joueur. À 5,0382 jours, par exemple, le monde contient 630 murs au total, mais seulement 100 attribués à la faction du joueur.

| État | Personnes et infrastructures présentes | Aliments présents directement sur les cartes |
|---|---|---|
| B à 5,0382 jours | 3 humains de la faction ; 5 lits, 100 murs, 10 portes, cuisinière à bois, bureau simple, 20 sacs de sable, table et 3 chaises | 20 rations de survie ; aucune pile de repas simple constatée à ce niveau du XML |
| B à 12,9689 jours | 4 humains ; 8 lits, 147 murs, table de boucherie, cuisinière et bureau ; éolienne, climatiseur et 38 conduits ; 6 refroidisseurs passifs | 15 repas simples ; aucune pile de ration constatée à ce niveau |
| B à 14,6321 jours | Même socle ; enclos, clôtures et portes supplémentaires | 8 repas simples à ce niveau |

Le relevé alimentaire est **un inventaire de piles directement posées sur les cartes**, pas un bilan global : inventaires, portage, conteneurs et capsules ne sont pas additionnés ici. Une pile absente ne prouve ni la consommation de toutes les unités ni une pénurie. Dès l'état A, les 50 rations des capsules ne se lisent pas comme 50 objets directement posés : une extraction naïve aurait annoncé à tort un départ à sept rations.

Les courbes sauvegardées confirment trois colons libres sur les onze échantillons enregistrés au premier état B, puis un quatrième dans l'état à 12,9689 jours. Elles ne donnent pas ici le moment exact d'une première récolte ou ingestion. Les dossiers de fin de partie ne servent pas à étalonner la première semaine.

### Provenance reproductible

Lecture des chemins XML `meta/gameVersion`, `meta/modIds`, `game/scenario`, `game/tickManager`, `game/storyteller`, `game/tutor`, `game/history/archive`, `game/history/autoRecorderGroups` et `game/maps`. Courbes : base64, décompression DEFLATE si `recordsDeflate`, flottants 32 bits little-endian ; seuls leurs agrégats utiles sont retenus. Les objets comptés sont des choses directement sur carte, pas tous leurs contenus récursifs.

Empreintes SHA-256 des fichiers examinés, sans noms de colons, factions, monde ou fichiers privés :

| État | SHA-256 |
|---|---|
| A, tick 100 | `fec6cc275e22bba748c2a1e64edbfaec10d5ef5762206f4076bcf71ac05d2d2e` |
| B, tick 302 294 | `7c1d7c784f7edd9c550181a114dff341611e86230a9d6596a6692f1bd24c06c3` |
| B, tick 778 135 | `45f38a4f81482e7f7b33d449c21d0b8d15aea14609f083a9b9e69f38ef43f7d8` |
| B, tick 877 924 | `5118a00887383e31bfddf73ad935ed9e7770c1b61da0ede6d56eea85cd197f59` |
| B, tick 12 605 756 | `e602b04914b5f9829106c9d4d9c6179860e82bd7794435224a842132cfdb1671` |

Scripts de lecture et résultats agrégés dans `tmp/colony-observation-reference`, ignoré par Git. Aucune sauvegarde brute ni XML du jeu n'est ajouté au dépôt. Les quantités et identités anonymisées de cette note sont les preuves conservées, pas une redistribution des sources du jeu.

## Nouveau départ contrôlé par sa sauvegarde

Le 20 septembre, l'utilisateur fournit `Reference-Core-4871` : **1.6.4871 rev591**, Core seul, scénario Atterrissage forcé, narrateur Cassandra, difficulté `Medium` (Récit d'aventure), une carte 250² au tick **283**. Le scénario sérialisé possède les parts ordinaires du Crashlanded ; l'état du tutoriel n'enregistre pas de progression. Le fichier `Version.txt` de l'installation indique rev590, différence de révision conservée. L'empreinte du témoin est `cb5fcd3513ab2d0ee5f4c2c711121d9f832ab320da004edcce3b20dc2a723ef1`.

Le site réellement choisi est **forêt boréale, grandes collines et grottes**, et non forêt tempérée/petites collines ; [mesures détaillées](map-calibration-reference.md#témoin-actuel-fourni-par-lutilisateur). Les cinq captures de cette partie sont examinées directement : monde à graine `Test`, site, trois personnes sélectionnées sur huit, arrivée à 6 h puis vue dézoomée. Ce contexte est une observation déclarée, pas un nouveau défaut imposé au projet.

À cet instant, les piles directement au sol totalisent **57 rations, 1 170 acier, 300 bois, 800 argent, 30 médicaments et 30 composants**, et trois débris de vaisseau sont présents. Les quantités correspondent aux parts proches et dispersées du scénario ; ce n'est pas une déduction depuis le seul panneau des ressources. Trois humains de la colonie et un cheval domestique sont sur carte. Les sept recherches `ClassicStart` ont leur coût complet enregistré. Des objets supplémentaires de ruines ou de génération des personnes ne deviennent pas une dotation garantie parce qu'ils figurent sur cette carte.

Ces 4,72 secondes nominales de simulation ne renseignent ni la première récolte, ni la consommation journalière, ni la date réelle d'un raid dans cette partie. Elles donnent enfin un état d'arrivée contemporain sous le profil retenu, distinct des deux mondes historiques. La poursuite d'une longue partie par l'utilisateur n'est pas nécessaire pour corriger les divergences certaines relevées dans les Defs/classes.

## Parties publiées : triangulation qualitative

### Démonstration pour débutants, version 1.3.3080

L'auteur déclare Crashlanded, Cassandra, Adventure Story, rechargement libre, sans mods, biome qu'il appelle savane. Il est expérimenté et explique simplifier son plan pour les débutants : ce n'est pas un joueur débutant observé. Son récit place les lits le premier jour, la pièce achevée et les cultures au deuxième, la recherche et la pâte nutritive au troisième. Au sixième, batterie, congélateur et raid d'un adversaire de mêlée ; le huitième, récolte de riz et commerce. Les compétences et l'organisation expliquent une partie du rythme ; aucune moyenne ne peut en être déduite. Version précise, date de publication non établie. [Journal de première main](https://rimworld.shiyo.info/example28.html).

### Crashlanded en désert extrême, version 1.6.4491

Même auteur, donc **pas une deuxième source indépendante de comportement**. Core seul, sans mods, Cassandra, Losing Is Fun, site choisi pour accéder à d'autres biomes. Il rapporte recherche dans le dortoir au deuxième jour, cultures et expédition pour du bois au cinquième, apprivoisement spontané d'un thrumbo puis raid au sixième, viande rapportée et pâte nutritive au huitième. L'événement favorable et les caravanes rendent ce cas impropre à calibrer notre forêt tempérée ou une progression moyenne. La page distingue ensuite des changements après mise à jour stable : ne pas traiter tous ses commentaires comme une description du correctif installé. [Partie et réglages déclarés](https://rimworld.shiyo.info/example49.html).

### Témoignage indépendant ancien, octobre 2017

Un joueur rapporte, sous **Alpha 18 unstable**, Crashlanded trois personnes, Phoebe, Base Builder, forêt tempérée et grandes collines. Il décrit une pièce initiale facilitée par deux murs à ajouter au relief, puis bois, baies, production alimentaire et champ de 10×10 aux jours 2–4. Il annonce environ 2 400 heures d'expérience : autre biais expert. Ce témoignage illustre l'effet du terrain et de la sélection des compétences, mais sa version ancienne et l'absence de liste de mods vérifiée interdisent de l'utiliser comme oracle numérique 1.6. [Compte rendu daté du 26 octobre 2017, message 103](https://ludeon.com/forums/index.php?topic=36208.90).

La [présentation officielle](https://rimworldgame.com/) décrit justement des survivants aux compétences disparates, des biomes aux contraintes différentes et un narrateur qui compose les événements. C'est un fondement qualitatif ; ce texte ne prescrit ni un congélateur au sixième jour ni une première semaine identique pour toutes les colonies.

## Conséquences pour la calibration de Lisière

1. **Séparer trois choses** : disponibilité initiale du catalogue, progression décidée par le joueur, événements produits par le scénario/narrateur. Un raid garanti artificiellement pour terminer un test ne prouve pas une cadence Core.
2. **Mesurer des possibilités et leurs causes**, pas imposer une liste d'ouvrages à une date unique : couchage utilisable, réserve protégée, premiers aliments renouvelables, récupération après une menace et travail repris. La rapidité dépend des aptitudes, chemins et ressources réellement disponibles.
3. **Comparer à conditions déclarées** : version, scénario normal ou tutoriel, difficulté choisie, narrateur, biome, relief, saison, personnes et politique du joueur. Nos trois graines actuelles restent trois essais d'un même pilote, pas trois joueurs moyens.
4. **Conserver les variations** : une pièce peut utiliser une ruine, une ration peut préserver du temps pour construire, une chasse peut compenser une récolte lente. Les variantes raisonnables doivent fonctionner sans recette unique cachée dans le moteur.
5. **Ne pas confondre test et équilibre** : les bilans et continuations détectent les pertes, blocages et incohérences ; ils ne démontrent pas seuls le plaisir, la difficulté ou la ressemblance du rythme. Ces derniers demandent aussi une observation jouée et visuelle réellement effectuée.

Ces observations justifient une comparaison mieux contrôlée. Elles ne justifient ni un multiplicateur global de vitesse, ni une densité de ressources, ni un calendrier nouveau inventé pour faire ressembler une capture isolée.
