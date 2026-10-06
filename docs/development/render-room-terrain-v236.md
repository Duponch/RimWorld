# V236 — terrain des pièces : expérience écartée

6 octobre 2026. [Recherche](../research/render-room-terrain-v236.md),
[preuves](../history/validation-render-room-terrain-v236.md).
Produit V233 et schéma 198 conservés ; aucun code produit de ce lot.
Les 62 sauvegardes et leurs métadonnées restent inchangées.

Le prototype retirait le recensement des 62 500 terrains du renderer lorsque
le journal confirmé certifiait le suffixe depuis sa dernière lecture réussie A
jusqu'au World C réellement présenté. Il utilisait les indices terrain bruts
V225, puis le journal structurel V233 si nécessaire ; jamais les surfaces seules
ou les slots d'un décodeur déjà avancé à D.

Le cache public de simulation restait inchangé. Les barrières étaient recapturées
dans l'ordre historique, avec le dernier objet gagnant ; masque combiné, flood,
labels, RoomSpace et identité des topologies égales demeuraient exacts. Le reset
invalidait le reçu sparse, sans forcer une nouvelle topologie à masque égal.
Le cache possédait les mêmes buffers historiques et retenait au plus un World
examiné supplémentaire, sans copie de son graphe.

Les appels default-false, mutable, copied, same-World, unknown, checkpoint,
epoch, chaîne perdue et dimensions différentes conservaient le parcours dense.
Les effets partiels avant exception et la reprise valide restaient ceux du
corps historique. Le mandat readonly venait uniquement du canal natif existant
du Core ; un booléen et un stamp ne prouvent pas la forme ni l'immuabilité future
d'un raw arbitraire. Le domaine raw/getter/Proxy artificiellement passé true
n'était pas déclaré admissible.

Deux cycles CPU complets du sous-ensemble scène donnent un bénéfice sur Aulnes
et mixed ; les oracles natifs passent. Le vrai GAME ordinaire ne montre ensuite
aucun gain FPS utile : 143,85→144,04 RAF/s, +0,13 %, plages chevauchées et p95 CPU
non amélioré. Le candidat reste privé. Aucun second banc lourd, contrôle GPU de
recovery ou intégration produit ne se justifie sur cette piste inchangée.

La suite vise le travail O(N) du résultat naturel : la voie indexée pourrait
consommer le signal et les changements exacts sans reconstruire toute la liste
de ressources. Cette proposition reste une expérience distincte à qualifier,
sans nouvelle règle, qualité réduite ou gain présumé. La cible proche de 240 FPS
à 6× reste ouverte ; les mesures cumulées nocturnes restent séparées.
