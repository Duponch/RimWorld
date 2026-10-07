# V252 — attribuer l'application actuelle avant une nouvelle refonte

Diagnostic privé du produit V242, schéma 198 inchangé. Aucun candidat optimisé ni FPS supplémentaire livré. [Contrat](../development/scene-apply-current-v252.md), [preuves](../history/validation-apply-current-v252.md).

V251 a déplacé un lecteur strict et le Core vers un Worker sans retirer leurs calculs ; son discriminant a régressé. V240 ne décrit plus littéralement le produit actuel : V241 a rendu le mobilier résident et V242 a supprimé la liste naturelle intermédiaire sur le succès ID. V252 mesure donc le vrai chemin actuel avant de retenir une nouvelle architecture, sans rejouer ces pistes inchangées.

Deux références primaires, relues le 7 octobre 2026, bornent l'interprétation :

- [Chrome DevTools, référence Performance](https://developer.chrome.com/docs/devtools/performance/reference) distingue temps total, descendants et activité directement attribuée dans la trace. Un parent instrumenté n'est pas un budget exclusif. Le résidu V252, parent moins enfants directement enveloppés, conserve du travail non enveloppé et la taxe de la sonde ; ce n'est pas le self time exhaustif de V8. Un retour du renderer ou un RAF n'établit pas non plus la présentation physique d'une image.
- [Three.js r186, InstancedMesh](https://raw.githubusercontent.com/mrdoob/three.js/r186/src/objects/InstancedMesh.js), correspondant à Three 0.186.0 installé, calcule la sphère d'un lot en relisant les matrices jusqu'à count et en unissant leurs sphères dans l'ordre. Les matrices, counts et bornes conditionnent culling et raycast. Supprimer ce fold ou choisir une enveloppe différente n'est pas une optimisation exacte présumée ; un compteur CPU ne certifie pas un upload GPU.

Le GAME diagnostique trouve 178 applications, 10,717 ms moyens pour `applyWorld`. Les durées ci-dessous incluent leurs descendants et la surcharge d'instrumentation ; elles ne s'additionnent pas aux parents qui les contiennent.

| Chemin courant | Appels | Durée moyenne par appel | Lecture utile |
|---|---:|---:|---|
| Nature `readScene` | 178 | 2,096 ms | Inclut l'agenda ID et sa préparation. |
| Agenda ID `read` | 178 | 1,500 ms | Descendant de Nature, aucune suppression de prévision démontrée. |
| Resource `update` | 145 | 0,821 ms | 0,669 ms rapporté aux 178 applications. |
| Overview `update` | 145 | 0,137 ms | 0,112 ms rapporté aux 178 applications. |
| Cultures `update` | 178 | 1,250 ms | Croissance continue et buffers agricoles conservés. |
| Partition agricole | 178 | 0,202 ms | Déjà comprise dans les cultures. |

Les quatre folds de bornes agricoles totalisent environ 0,261 ms par application, déjà compris dans les cultures. Ce coût mesuré ne suffit pas à prouver que leur suppression serait correcte ou bénéfique sur le circuit complet.

La lecture statique confirme que le succès chaud végétal est déjà organisé autour des changements confirmés, échéances, membres de chunks touchés et cultures. Resource et Overview recalculent encore certaines tailles/feuilles, mais PlantCluster utilise déjà `change.size` ; la matérialisation naturelle N supprimée en V242 ne peut pas être comptée une deuxième fois comme économie future.

**Décision : pas de prototype immédiat de projection végétale commune.** Resource et Overview représentent ensemble environ 0,780 ms inclusif par application sur cette fenêtre. Seule une fraction correspond aux calculs dupliqués réellement retirables. Le nouveau contrat, ses gardes et les coûts froids seraient supplémentaires ; ce plafond est inférieur au seuil d'investigation proposé d'environ 1 ms ou 10 % d'`applyWorld`. Cela n'écarte pas toute refonte végétale future, mais cette cause ne justifie pas actuellement son risque de propriété et sa dette.

L'autre piste étudiée regroupe les préparations structurelles réellement répétées : axes de portes, signatures, index de travail et projections VFX/feedback. Le diagnostic mesure notamment feedback 0,542 ms, VFX structurels 0,482 ms et signature des structures 0,638 ms par appel. Les portes font 180 appels, dont deux depuis `buildStructures` : leur moyenne de 0,618 ms ne doit pas être additionnée naïvement aux autres parents. Ces mesures orientent l'étude ; elles n'établissent ni le coût exclusif des parcours communs ni un gain futur.

Cette piste doit conserver les dépendances complètes : voisins terrain et plans pour les axes, alimentation et durées des segments de portes, travail des colons, flashes au tick confirmé, ordre des doublons, buffers de poses et leurs versions. Un patch wire de bâtiments ne constitue pas encore un journal confirmé après gardes ; le journal structural existant porte sur Resource. Une préparation commune doit partir du World C réellement présenté, conserver les replis publics mutables et ne pas emprunter les slots du décodeur déjà avancé à D.

La dose source atteint seulement 5,080× sur cette fenêtre, pour 6× demandé. Les snapshots extrêmes utilisés par ce calcul portent des `stepMs` de 31,3 puis 20,1 ms ; il ne s'agit pas d'une distribution exhaustive. Ce champ chronomètre déjà `stepWorld` et exclut les captures/encode qui suivent. V249 avait mesuré son parent sans l'attribuer intérieurement. Le moteur comporte des blocs environnement, faune, décisions des acteurs et réconciliations qualitativement profilables ; une attribution source distincte peut donc être plus informative qu'une succession de petits censuses optimisés à l'aveugle. Ni cette vitesse ni les durées écoulées ne prouvent toutefois que la source cause les FPS observés.

Avant adoption, une ablation devra retirer du travail démontré, payer sa préparation et ses gardes, puis réduire le coût complet et produire un gain GAME comparable. Horloge, cadence, qualité, population, règles et échéances restent identiques. Ce diagnostic unique ne compare pas deux produits optimisés et ne certifie ni 240 FPS, ni toutes les caméras ou parties, ni un plafond de JavaScript.
