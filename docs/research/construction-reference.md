# Plans, cadres et dégagement — relecture Core

14 septembre 2026, livraison locale V16. Corpus utilisateur : **chapitre 10**, SYS-056/TEST-056 ; propriété et transferts SYS-005/020..022/051/053/054, emprises chapitres 5/8/21. Le rapport décrit plan → conteneur de matériaux → travail → bâtiment, avec dégagement préalable réel. Les identifiants orientent nos scénarios, sans constituer des validations exécutées. [Contrat local](../development/construction.md).

## Sources confrontées

- [Correctif officiel 1.6.4850 du 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : problèmes de livraison, cache de construction et ordres forcés, annulation de remplacement et charge avec beaucoup de plans impossibles. Ces corrections imposent de vérifier interruptions et performance ; elles ne donnent pas les constantes complètes.
- [Annonce officielle de la 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) : remplacement des constructions, à distinguer du chantier neuf livré ici.
- [Structure](https://rimworldwiki.com/wiki/Structure) et [historique 1.3.3066](https://rimworldwiki.com/wiki/Version/1.3.3066), wiki communautaire : mur achevé infranchissable, matériaux, historique des dégagements selon surface/franchissement. La page Construction redirige vers la compétence et ne suffit pas à expliquer la logistique.
- Miroir de code épinglé **2d508035082e7cb0c8e29e230d26bda6e546928f**, daté du 20 mai 2026 : [Blueprint](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Blueprint.cs), [GenConstruct](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/GenConstruct.cs), [génération des définitions](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/ThingDefGenerator_Buildings.cs), [livraison aux plans](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WorkGiver_ConstructDeliverResourcesToBlueprints.cs), [aux cadres](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WorkGiver_ConstructDeliverResourcesToFrames.cs), [finition](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WorkGiver_ConstructFinishFrames.cs), [toils de construction](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/Toils_Construct.cs). Consultation des méthodes et des dépendances HaulToContainer/HaulAIUtility, sans recopier leur implémentation.

Le miroir est non officiel, antérieur au correctif de juin ; son assembly n'est pas certifié comme la version PC actuelle. Confiance élevée sur la succession des phases et l'existence d'un travail de dégagement ; moyenne sur l'ensemble des exceptions et départages. Les sources ne sont pas une preuve de conformité totale.

## Décisions

| Règle observée | Décision locale |
|---|---|
| Le plan ne constitue pas immédiatement le volume solide du bâtiment. Livraison et finition sont distinctes. | **Adopter** : plan libre de passage ; première livraison réelle crée un cadre ; tous les matériaux sont nécessaires avant finition. |
| `BlocksConstruction` distingue plantes, objets, personnes et définitions de bâtiments ; les sous-travaux dégagent ce qui bloque. | **Adopter** coupe physique et portage local des piles. Aucun retrait gratuit. **Différer** minage, déconstruction, réinstallation et remplacement. |
| Les livraisons peuvent relever du travail de Construction ; transporter seul ne confère pas le droit de finir. | **Adopter** Construction ou Transport pour approvisionnement/dégagement des piles ; Construction pour coupe du chantier et finition. Priorité 0 interrompt la famille qui avait engagé la tâche. |
| Le cadre généré a `pathCost = 14` et une passabilité bornée à `PassThroughOnly`. | **Adapter** : +1,4 tick local par entrée, recherche entière +467. Nos 10 Hz correspondent à un dixième des ticks Core pour cette constante ; vitesse de marche, durées et capacités locales ne sont pas une parité numérique globale. |
| Un blocage peut survenir entre sélection et exécution. | **Adopter** revalidation à la livraison et à la finition. **Adapter en 3D** : protéger toute arête engagée, ses coins et les places de service réservées ; ne pas créer un mur au travers d'un corps en interpolation. |
| Certaines définitions admettent des objets sous/sur le bâtiment selon surface et passabilité. | **Écart maintenu et explicite** : tous nos meubles dégagent les piles. La table achevée reste infranchissable dans notre moteur. Ces deux limites doivent évoluer ensemble avec les profils de mobilier ; ne pas présenter ce choix conservateur comme la règle universelle Core. |

## Limites restant ouvertes

Le chantier ne pousse pas un civil immobile : il attend sa libération naturelle. Pas de plan sur réserve, roche, bâtiment ou autre ordre existant ; pas encore de coordination avec un ordre de coupe déjà présent. Un champ accepte le plan, mais ne ressème pas sous son empreinte. Les sous-travaux interrompus de coupe recommencent leur durée ; la plante reste réelle et n'est pas dupliquée.

Coûts et durées du petit catalogue restent ceux documentés auparavant. Ni qualité, échec, compétence, support riche du sol, réparation, remplacement ni récupération commerciale après destruction ne sont implicitement livrés. SYS-057..061 restent partiels/absents suivant leur domaine. La relecture de cette tranche corrige le blocage immédiat des plans, sans clore Construction ni G0.
