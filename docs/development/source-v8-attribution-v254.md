# V254 — piles CPU du vrai Worker de simulation

Diagnostic du produit V242, schéma 198 inchangé. Aucun code produit, règle, contenu ou sauvegarde modifié ; aucun FPS ajouté. [Recherche](../research/source-v8-attribution-v254.md), [preuves et limites](../history/validation-source-v8-attribution-v254.md).

V253 mesurait un bloc acteurs important sans en connaître les fonctions intérieures. V254 échantillonne directement l'isolate V8 du Worker source, avec moteur, snapshots et Worker servis sans transformation. Le jeu complet conserve interface, audio, musique, qualité et vitesse demandée à 6×. MAIN garde seulement ses sondes grossières déjà qualifiées.

Une session CDP supplémentaire appartenant à la page dédiée identifie un unique DedicatedWorker, son URL source, son parent et son contexte. L'isolate diffère de MAIN ; la même URL apparaît exactement une fois dans les Workers Playwright. Aucun profil MAIN de substitution n'est admis. Les commandes CDP externes et leurs réponses internes sont corrélées séparément, avec bornes et refus monotones ; le transport non aplati, déprécié, reste explicitement une dépendance du diagnostic.

Le profil brut est persisté avant les assertions de résultat. Quatre témoins d'horloge source encadrent start/stop ; la fenêtre MAIN de huit secondes est traduite par l'origine réelle du Worker. Le profil dure 11,063 s et comprend les bords : ses poids ne sont pas des mesures exclusives limitées à la fenêtre GAME. Les deltas bruts ne sont ni corrigés ni normalisés.

## Ce que les piles montrent

Le profil contient 6 970 samples et 1 125 nœuds ; 4 585 samples ont `stepWorld` dans leur ascendance. Les observations ci-dessous portent sur les feuilles de ces samples, pas sur une somme de parents inclusifs.

| Feuille observée sous stepWorld | Samples | Poids approximatif des intervalles |
|---|---:|---:|
| RoomTopologyCache.read | 415 | 656,9 ms |
| footprintContains | 284 | 441,7 ms |
| stepWorld, résidu non attribué | 164 | 263,5 ms |
| LightEnvironmentCache.read | 165 | 262,3 ms |
| ThermalTopologyCache.read | 146 | 232,9 ms |
| footprintCells | 145 | 226,9 ms |
| blockedCells | 122 | 193,4 ms |
| navigationCosts | 108 | 169,0 ms |

Ces poids affectent l'intervalle précédant chaque sample à la pile observée. Ils peuvent inclure attente et ordonnancement ; ce ne sont pas des chronomètres CPU exacts. Les comptes accompagnent donc les poids. Le résidu de `stepWorld` n'est pas attribué intégralement aux acteurs. Les 96 samples GC ne permettent pas d'expliquer seuls la charge.

Les parents montrent plusieurs causes : déplacement, préparation de navigation, travail, prison, éclairage et énergie. `planWork` ne désigne pas son tri seul ; `moveToward` ne désigne pas le frontier seul. Le profil ne justifie ni un remplacement automatique de langage, ni une réécriture d'un algorithme de recherche déjà différent de celui supposé.

La lecture statique explique une partie du coût spatial : le cache des pièces vérifie les terrains courants et les barrières dans leur ordre. La prison y recourt deux fois par tick sur cette partie. Retirer ces lectures dans le lecteur public changerait ses observations sur un World mutable. Une prochaine refonte doit réduire les calculs après capture, ou construire et démontrer un domaine privé réellement fermé ; la localisation dans un Worker ne constitue pas cette preuve.

## Incident du banc

La cohorte native reste **FAIL** : sa dernière assertion héritée exige `workerRequest` ou `worker-bundle`, deux champs que le nouveau loader RAW ne produit pas. Elle intervient après profil, capture des scripts, arrêt du profiler, sauvegarde/rechargement et contrôles d'anciennes vues. Le rapport rouge est conservé intact. La qualification hors ligne distincte porte sur l'admissibilité de ces preuves diagnostiques ; elle ne réécrit pas le GAME en vert et ne constitue pas une nouvelle partie jouée.

L'audit hors ligne passe après une reprise distincte corrigeant un caractère manquant dans un pin SHA ; les deux rouges sont préservés. Il vérifie notamment les 168 scripts compilés, les trois maps RAW, l'arbre complet et les gardes finales, sans nouveau GAME. La suite examine les parcours spatiaux et les données déjà capturées, avant de choisir un candidat. Aucun second profil ou GAME inchangé n'est prévu. Prototypes, gain FPS, vrai 6× stable et objectif 240 FPS restent à établir.
