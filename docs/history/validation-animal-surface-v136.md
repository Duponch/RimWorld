# Validation de la silhouette animale V136

Les six profils vivants ont un contrôle de topologie dédié : les triangles de la peau ont chacun leurs arêtes appariées, aucune section interne n'est bouchée, et seule la première et la dernière section ont une face d'extrémité. Le cou possède bien des poids intermédiaires entre le tronc immobile et la tête animée. Les détails conservent leurs os et le maillage reste instancié. `tests/animal-surface.test.ts` passe pour les six espèces.

Les contrôles ciblés `tests/animal-surface.test.ts`, `tests/actor-model-v135.test.ts`, `tests/actor-surface.test.ts` et `tests/gait-presentation-v133.test.ts` passent ensemble : **14 tests dans 4 fichiers**. `npm run typecheck` passe. Sur cet hôte, Vitest doit être lancé hors du sandbox de processus : Vite y obtient `spawn EPERM` lors de la résolution Windows de son fichier de configuration, avant de charger les tests. Cela n'est pas un échec des tests.

Le parcours natif `tests/integration/animal-surface-v136.spec.ts` passe en Chromium/WebGPU. Une archive préparée et validée place séparément un lièvre, un mufalo et un dromadaire ; elle est rechargée en pause, puis chaque lot est cadré de près de profil et de face dans la vue orthographique. Le rendu confirme un exemplaire dans chaque lot, les attributs GPU conservés et aucune erreur WebGPU. Les six captures montrent le dos, le cou et la tête en un volume facetté continu, les yeux/oreilles/cornes attachés, les pattes au sol et la bosse du dromadaire intégrée au dos. Le creux sombre entre sa bosse et son cou est une facette ombrée, sans découpe visible. Ce contrôle observe des animaux au repos ; il ne prouve pas toutes les poses de combat ou de sommeil.

| Espèce | Profil | Face |
| --- | --- | --- |
| Lièvre | [Capture](images/animal-surface-v136-hare-side.png) | [Capture](images/animal-surface-v136-hare-front.png) |
| Mufalo | [Capture](images/animal-surface-v136-muffalo-side.png) | [Capture](images/animal-surface-v136-muffalo-front.png) |
| Dromadaire | [Capture](images/animal-surface-v136-dromedary-side.png) | [Capture](images/animal-surface-v136-dromedary-front.png) |

La peau centrale de six espèces ajoute de **12 à 84 sommets partagés par espèce** selon les boîtes centrales remplacées. Chaque animal visible parcourt ces sommets dans son lot existant, et le calcul de rotation pondérée coûte des instructions de sommet. Cette preuve ne mesure pas le temps GPU ou le débit ×6. Les corps morts transportés et déposés restent représentés par leur proxy cubique existant.
