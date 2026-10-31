# Reconstruction des ressources : croissance seule, schéma 297

**31 octobre 2026 — correctif intégré et qualifié sur son chemin ; résultat en jeu encore à compléter.**

Les mises à jour contenant uniquement des tuples de croissance utilisent une reconstruction plus directe : une copie paresseuse du tableau et les seuls objets modifiés. Elles évitent le Map temporaire et les parcours répétés des mêmes identifiants. Une insertion, suppression, permutation ou modification complète d'une ressource conserve le chemin générique.

Une seule source change : `src/bridge/resident-presentation-assembler.ts`, de `7a52127aede3539d4c23324bbebf77244fba7165274c4848bd266eccb071759b` à `46fed3805209619dba26f31be65acc5af36f4227fca95f68523da877080af6dd`. Aucun changement de schéma, de vitesse physique, de ticks ou de commande.

## Conservation et validation

La nouvelle voie conserve les gardes de type, prototype, longueur, identité, doublon, valeur, tick et facteur. Elle préserve les doubles, la présence des propriétés et le signe de zéro. Un facteur NaN retire la propriété comme auparavant. Un index de prédécesseur incohérent retourne au chemin générique.

Les anciennes versions restent intactes. Un refus tardif ne publie aucun journal. Le journal FULL conserve les ressources réellement mises à jour ; le journal BASE conserve ses mises à jour structurelles vides pour une croissance seule. Une colonne vide garde l'identité du tableau précédent.

- Trois contrats privés : **3 PASS**. Ils couvrent les valeurs exactes et l'ordre, quinze corruptions refusées sans consommer le prédécesseur, puis une croissance après modification réelle de la population et de son ordre, et un refus tardif sans publication.
- Contrôles intégrés : **28 PASS et un refus ancien de référence crop**. Ce refus a été reproduit sur le témoin avec le même nom et le même message ; seuls les numéros de ligne ont été normalisés pour la comparaison. La sélection n'est donc pas présentée comme entièrement verte.
- Typage : **PASS, 17,009 s**.
- Build Pages CODE : **PASS, 3,756 s**, assets publics résolus sans recopie. Un build ne constitue pas une publication.

## Coût mesuré de la fonction

Comparaison W/C/W déjà acquise : 300 appels par bras sur la même projection de ressources contenant 17 918 tuples de croissance. Les sorties finales ont les mêmes empreintes et les entrées sont restées inchangées.

| Mesure, millisecondes | Témoin1 | Candidat | Témoin2 |
| --- | ---: | ---: | ---: |
| Temps écoulé | 3002,398 | 1618,591 | 3060,768 |
| CPU processus | 3374 | 2062 | 3281 |
| CPU du fil | 3016 | 1609 | 3063 |

Un comptage distinct, hors mesure temporelle, observe un Map temporaire en moins. Les autres allocations ne sont pas intégralement comptées. Le cas générique mixte reste fonctionnellement identique ; sa mesure courte et variable ne prouve pas un gain causal.

Ces résultats portent uniquement sur `patchCollection`. Ils ne mesurent ni une Full complète, ni les FPS, ni la fluidité globale et ne suffisent pas à déclarer les saccades résolues.

## Observation Native des six étapes Full — à compléter

Une seule continuation à ×6 est prévue depuis l'ACTUAL exclusif `ea793a77`, gzip `d22c5edf`, Core 116100, RNG 700965858, nextId 30015. À cette rédaction, cet état reste la dernière autorité ; aucun résultat du futur essai n'est présumé.

Root complétera après l'essai :

- Source effectivement exécutée, carte et empreintes des deux overlays explicitement adaptés à la source intégrée.
- État du protocole, conservation et recharge propre ; dernier export réellement persisté, y compris en cas d'échec.
- Livraisons Full observées : préflight, préparation Resident, reconstruction, contrôles World, préparation Core et adoption Timeline. Les intervalles imbriqués doivent être traités par union, sans addition trompeuse.
- Intervalles entre présentations pendant la marche, portions attribuables aux handlers MAIN et limites restantes. Les durées de scopes ne sont pas des temps CPU exacts ni une preuve GPU.

La référence de reprise devra suivre le dernier état réellement joué. L'ancien parent ne doit pas être rechargé pour obtenir un résultat plus favorable.
