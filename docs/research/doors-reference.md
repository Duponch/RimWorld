# Portes — préparation du prochain lot G2

Première lecture le 15 septembre 2026 pendant la validation V33. **Aucune porte livrée par V33.** Cette note prépare la recherche, pas un contrat validé ni un second calendrier. Avant implémentation, relire les entrées du corpus via [adoption](reference-adoption.md) et résoudre les inconnues ci-dessous.

## Constats sourcés

[Door](https://rimworldwiki.com/wiki/Door), révision observée 178671, Core PC 1.6 : une case, non réinstallable, 25 unités Metallic/Woody/Stony, base de construction 850 ticks Core. V33 fournit déjà les facteurs de ces matériaux. Vitesse d'ouverture : bois 120 %, acier 100 %, cinq pierres 45 %. Les portes soutiennent les toits et séparent les pièces ; une porte ouverte n'est pas thermiquement équivalente à un trou dans un mur. Ces effets attendent leurs systèmes.

« Maintenir ouverte » ne commande pas une ouverture à distance : cela empêche la fermeture après un passage. Interdire concerne le passage des colons même quand la porte est ouverte ; exceptions liées aux factions, animaux et crises, encore absents localement. La page comporte des remarques non vérifiées sur certaines permissions : ne pas extrapoler tous les personnages depuis les colons civils.

[Building_Door](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/Building_Door.cs), miroir relu : ouverture `45 / DoorOpenSpeed`, puis facteur de définition selon alimentation et arrondi. Fermeture fondée sur 110 ticks ajustés ; un occupant la repousse. Drapeau d'ouverture, maintien, dernier contact ami, compte à rebours et progression visuelle sont distincts. L'option de maintien change seulement le drapeau. Les caches d'accès sont invalidés selon le passage possible ; `openInt` seul ne décrit pas tous les coûts. La correspondance du miroir au binaire exact reste non certifiée.

## Points à résoudre avant livraison

- Lire les valeurs Core de définition non alimentée, les conditions d'approche et la gestion réelle d'un blocage par objet. Lire le pather et les règles de fermeture ; ne pas déduire une durée d'attente uniquement de l'animation.
- Vérifier coins diagonaux, interaction sur la case, coexistence objets/zones, orientation automatique et interdiction lorsqu'un acteur a déjà commencé son passage.
- Clarifier profils de navigation et coûts estimés sans modifier rétroactivement une arête engagée. Un franchissement avec attente exige une représentation explicite en simulation et dans la trajectoire, sinon le rendu traversera une porte visuellement fermée.
- Définir sauvegarde de l'état et des temporisations, accès concurrent, retrait/annulation et reprise. Test profond de couloir avec trafic, maintien/interdiction et obstacle retiré ; enrichir le camp par une vraie entrée, avant toits/pièces.

Les frontières actuelles sont `movement.ts`, `furniture-travel.ts`, `pathfinding.ts`, `occupancy.ts` et le rendu de mobilier conservé. Leur coût de meuble statique ne doit pas être recyclé sans décision pour un mécanisme temporel. La navigation GPU reste un laboratoire indépendant. Électricité/autodoors, permissions hostiles, feu et calcul thermique complet demeurent des dépendances ultérieures explicites.
