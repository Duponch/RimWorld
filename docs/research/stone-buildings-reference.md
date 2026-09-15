# Constructions en pierre — vérification du 15 septembre 2026

RimWorld PC Core 1.6, sans pierre d'extension. [Contrat local V33](../development/construction-materials.md). Corpus HTML chapitre 10 et classeur relus : **SYS/TEST-056, 058, 059 ; UI-019, 024**. Adopter livraison physique et choix de matière, récupération et identité du meuble ; adapter horloge et apparence 3D. Réparation, remplacement direct, qualité, capacités et support de terrain détaillé restent différés.

## Sources et décisions

- Pages de [mur](https://rimworldwiki.com/wiki/Wall), [lit](https://rimworldwiki.com/wiki/Bed), [table 1×2](https://rimworldwiki.com/wiki/Table_(1x2)), [tabouret](https://rimworldwiki.com/wiki/Stool), [piquet](https://rimworldwiki.com/wiki/Horseshoes_pin) : ces cinq familles acceptent Metallic, Woody et Stony. Les quantités restent respectivement 5, 45, 28, 25 et 10. La [table de taille](https://rimworldwiki.com/wiki/Stonecutter%27s_table) accepte **Metallic/Woody seulement** : ne pas étendre mécaniquement tous les ateliers. Le feu garde son coût fixe en bois.
- [Blocs de pierre](https://rimworldwiki.com/wiki/Stone_blocks), révision observée 168233 : **WorkToBuild** ×6 pour granite/calcaire/ardoise, ×5,5 marbre, ×5 grès ; supplément commun **140 ticks Core**. Ne pas utiliser les facteurs WorkToMake ×1,1..1,3, qui concernent d'autres recettes. Vacstone est exclue.
- [StatWorker](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/StatWorker.cs), miroir inspecté ce jour : facteur du matériau appliqué avant son offset. Le tableau du lit recoupe le résultat : granite 4 940, marbre 4 540, grès 4 140 ticks Core. Un miroir non certifié du binaire ne remplace pas une acquisition de Defs résolues.
- Même page du [lit](https://rimworldwiki.com/wiki/Bed) : qualité normale, confort 0,75 inchangé, repos **0,9 avec les cinq pierres** contre 1 bois/acier. Le nouveau choix doit donc changer le sommeil réel, pas seulement la couleur. Le confort du [tabouret](https://rimworldwiki.com/wiki/Stool) dépend de la qualité, pas de la matière ; le piquet n'a pas de qualité. Les systèmes de confort/qualité complets restent absents localement.
- [JobDriver_Deconstruct](https://github.com/Chillu1/RimWorldDecompiled/blob/master/RimWorld/JobDriver_Deconstruct.cs), relu : travail de l'ouvrage borné à 20..3 000 avant vitesse de retrait. Le plafond devient pertinent pour les lits et tables en pierre ; conservation de la moitié avec arrondi aléatoire selon le [contrat déjà vérifié](deconstruction-reference.md).

La lecture du fichier historique `Items_Resource_Stuff.xml` ne contenait pas les blocs : ne pas lui attribuer les facteurs de pierre. Les pages wiki partagent une même provenance communautaire ; le miroir de code corrobore formule et retrait, pas à lui seul tous les coefficients. Confiance élevée sur recettes/catégories et repos, moyenne sur la parité numérique complète sans export résolu d'une installation précise.

## Travail adopté

Base × facteur + 140, puis conversion au dixième et plafond du tick local. Les valeurs ci-dessous sont des ticks locaux de travail neutre, hors trajets, livraisons et modificateurs encore absents.

| Ouvrage | Granite / calcaire / ardoise | Marbre | Grès |
|---|---:|---:|---:|
| Mur, 5 blocs | 95 | 89 | 82 |
| Lit, 45 blocs | 494 | 454 | 414 |
| Table, 28 blocs | 464 | 427 | 389 |
| Tabouret, 25 blocs | 284 | 262 | 239 |
| Piquet, 10 blocs | 74 | 69 | 64 |

## Limites qui ne doivent pas devenir des règles implicites

Les blocs Core influencent aussi résistance, inflammabilité, beauté, valeur, poids et ouverture des portes. Ces propriétés doivent arriver avec dégâts, incendies, pièces/économie, portage et portes ; V33 n'annonce aucune résistance supérieure du granite ni protection contre le feu simulée. Le matériau reste conservé pour appliquer ces effets ultérieurement. Les sols actuels autorisés sont génériques ; marais, supports Light/Medium/Heavy, ponts et poids de fondation restent ouverts. La recherche préalable demeure contournée explicitement dans le camp local. Un lit en pierre est disponible mais son repos inférieur est affiché et effectivement calculé.

La géométrie constructive reste celle des ouvrages existants, teintée par leur pierre dans les mêmes lots instanciés. L'emballage demeure une caisse, avec bande de matière quand posé ; sa cargaison garde le modèle générique. Cette représentation provisoire ne modifie ni l'empreinte ni l'identité du meuble.
