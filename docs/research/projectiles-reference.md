# Émission et vol du revolver — sous V54

18 septembre 2026. Chapitres 17–19 du corpus, **SYS/TEST-099..107, 111..112**, puis UI-009/010 pour l'intégration future. Adopter les branches et leurs probabilités distinctes ; adapter horloge, représentation et PRNG ; différer leur pilotage par les commandes et l'adversaire. [Contrat et état réel](../development/projectiles.md). Ce lot est un noyau isolé, pas un combat jouable.

## Sources et confiance

Relecture fraîche du miroir **`2d508035082e7cb0c8e29e230d26bda6e546928f`**, daté du 20 mai 2026. Les fichiers ont été consultés depuis les URL brutes lorsque l'outil de navigation ne chargeait pas GitHub. Le miroir n'identifie pas avec certitude son exécutable. L'[annonce officielle 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) est postérieure ; ses corrections de collision imposent une vérification intégrée ultérieure. Confiance bonne sur les chemins lus, parité numérique avec le binaire récent non certifiée. Aucune source Combat Extended retenue, aucun code décompilé incorporé.

Le [changelog Alpha 15](https://rimworldwiki.com/wiki/Version/0.15.1279) recoupe historiquement une distinction essentielle : la réduction de 60 % des tirs amis concerne les interceptions en vol, sans modifier les chances de la cellule finale. Ce n'est pas une preuve indépendante de toutes les constantes actuelles. Les explications générales des [armes](https://rimworldwiki.com/wiki/Weapons) ne suffisent pas à trancher les cas de cible mobile ; le chemin exact ci-dessous prévaut comme cible provisoire.

## Branches d'émission

[Verb_LaunchProjectile](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Verb_LaunchProjectile.cs) distingue raté dispersé, couvert choisi et cible visée. Le couvert potentiel est choisi avant le jet de précision, même s'il ne recevra pas la balle. La posture n'est pas appliquée une seconde fois au jet d'émission. Un tir normal sur une personne ne reçoit pas automatiquement la permission d'intercepter tous les objets ; les ratés et les cibles pleines/cellules ont d'autres masques. Ne pas rendre tout mur nouvellement fermé interceptable sur toutes les branches par intuition de physique 3D.

[GenCollection](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/GenCollection.cs) permet la sélection pondérée sans tirage quand un seul couvert positif existe. [Rand](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Rand.cs) évite aussi les tirages pour les probabilités certaines/impossibles. Ce comportement a été recontrôlé pendant la revue, puis les scénarios de consommation aléatoire ont été renforcés.

[ShootTuning](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/ShootTuning.cs) donne un rayon de raté entre 1 et une borne interpolée : 10/8/6/4/2/1 pour les précisions 0,02/0,04/0,07/0,11/0,22/1. [ShootLine](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/ShootLine.cs) refuse les destinations derrière le tireur ; [ShootLeanUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/ShootLeanUtility.cs) autorise le penchement aux deux extrémités avant le raccourcissement sur obstacle. Un simple rayon central ne suffit donc pas. [Gen](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Gen.cs) génère le petit décalage final indépendamment sur chaque axe : carré de ±0,3, pas disque ni point touché sur un mesh.

## Trajet et arrivée

[Projectile](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Projectile.cs) sépare durée nominale et compte à rebours arrondi. Même cellule : aucune interception ordinaire ; voisine cardinale : seulement la nouvelle cellule ; autre franchissement : échantillonnage à 0,2 case. La revue a corrigé notre première version qui appliquait ce dernier parcours à tous les franchissements.

La cible effectivement utilisée conserve son identité après déplacement. Si elle est encore admissible, elle peut recevoir l'impact hors de son ancienne cellule ; une cible allongée lointaine ratée ne déclenche pas une seconde chance sur les autres objets. Sinon, les candidats admissibles de destination sont mélangés et examinés. Sortir de la carte termine le projectile à sa dernière position intérieure. La permission d'interception, le couvert probabiliste voisin et le recouvrement de l'objet par un volume plein sont trois conditions distinctes.

[VerbUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/VerbUtility.cs) confirme le facteur de distance d'interception basé sur les distances **au carré**, et les catégories admissibles au sol. La proximité du tireur n'accorde pas une immunité universelle : branches en vol, cible utilisée et candidats finaux restent séparés.

## Adaptations et limites assumées

Le masque local `all=7` remplace le `All=-1` du miroir, pour les trois bits connus seulement. Notre PRNG, le mélange des candidats et l'ordre stable des scènes ne promettent pas la même partie à graine égale que Core. Le rejet des directions est borné à 128 essais : dépassement explicite, sans fabriquer un impact de remplacement. Les dix sous-pas Core par tick local conservent les contacts ; l'accélération de partie ne changera pas ce découpage.

Le noyau ne couvre pas explosions, tirs paraboliques, boucliers, armures, traits d'arme, dégâts au décor ou ralentissement d'impact. L'adaptateur réel de tous les candidats, les phases sauvegardées, l'XP, les réactions civiles et l'affichage restent à intégrer. La grille du meilleur couvert par cellule ne doit pas être détournée en liste exhaustive des cibles.
