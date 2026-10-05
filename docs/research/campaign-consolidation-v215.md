# Référence V215 — contrôle du rendement et contact défensif

Revue du5octobre2026 sur V214 `c82c2040`, schéma195. Cette note réutilise les recherches déjà versionnées ; elle n'annonce ni nouvelle extraction Core ni parité exhaustive. Les sources et tests de la campagne initiale restent gelés pendant la file. [Contrat](../development/campaign-consolidation-v215.md).

## Bois

[Plantes V179](plants-skill-core-v179.md) et son [contrat](../development/plants-skill-v179.md) distinguent rendement physique, capacités/compétence finales et arrondis. La lecture du producteur courant confirme qu'un arbre n'applique pas l'échec humain réservé aux autres récoltes : il arrondit d'abord le rendement physique, puis applique un second arrondi au résultat si le facteur final dépasse1. L'XP est déjà avancée lorsque le producteur est appelé à la finition ; l'oracle capture donc les statistiques à cet appel, sans reconstruire un profil depuis le début du job.

Pour un rendement physiqueR, les bases possibles sont `floor(R)` et `ceil(R)`. Avec un facteurS supérieur à1, chaque baseB permet `floor(B*S)` et `ceil(B*S)` ; sinon, les bases sont conservées. L'ensemble contient au plus quatre entiers. Une sortie comprise dans cet ensemble ne suffit pas à prouver la conservation : elle doit correspondre exactement aux quantités réellement ajoutées et à une source réellement consommée. Le refus doit conserver source, piles, PRNG et identifiants.

Le potentiel nominal du bois encore sur arbre reste utile comme bilan. Les pertes et bonus nets correspondent à la différence entre nominal retiré et sortie observée, sans inventer l'arrondi intermédiaire. Pâture et repousses proviennent de leurs événements productifs réels. Les bilans de combustible, destruction et incendie existants sont additionnés selon leur propriétaire, une seule fois. Une égalité globale ne permet pas d'attribuer une perte ou un excédent à une récolte non observée.

## Contact

Les recherches [mêlée](melee-reference.md), [acquisition automatique](automatic-combat-reference.md) et [mêlée animale](animal-melee-reference.md) restent les références historiques. Le contrat local distingue contact diagonal admissible avec un flanc libre et déplacement diagonal exigeant les deux flancs. La rasterisation du tir est une autre primitive ; supprimer son contrôle global changerait aussi les projectiles et ne constitue pas le correctif recherché.

Le checkpoint Énergie au tick275640 capture Ada à128,127, un lièvre en rage à129,128, un mur à129,127 et l'autre flanc libre. La lecture de `automatic-combat` montre un contact accepté, puis rejeté par `clearShotSegment`. Le producteur animal utilise le contact admissible. C'est une contradiction entre producteurs locaux, indépendamment d'une affirmation d'identité géométrique avec tout le moteur Core.

Le candidat limite le contrôle de visibilité à l'approche hors contact. Il conserve hostilité, outils, incapacités, ordres du joueur, arêtes, récupération et budget. Le témoin doit distinguer un flanc libre, deux flancs fermés, menace distante masquée et animal paisible, puis laisser le vrai producteur tenter un coup et vérifier la continuation exacte. L'ordre volontaire du pilote fait l'objet d'un contrôle séparé : il ne prouve pas le fonctionnement de la défense automatique.

Les copies candidates et leur comparaison sont préparées sous `tmp/world-next/energy-pilot-patch/`. Aucun résultat d'exécution n'est déduit de cette préparation. Les journaux rouges et checkpoints d'origine sont conservés sous les dossiers temporaires datés ; les preuves de reprise seront consignées séparément.
