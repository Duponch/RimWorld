# Réserves par qualité et état — V188

Contrat fondé sur la [recherche Core datée](../research/storage-condition-core-v188.md), prolongeant les [filtres par objet](storage-item-filters.md), la [logistique physique](spatial-motion-storage.md) et les [meubles emballés](furniture-logistics.md).

## Décision du joueur

Architecte et inspection d'une réserve proposent deux plages indépendantes, activables explicitement : qualité minimale/maximale et points de vie minimaux/maximaux en pourcentage entier. La catégorie et la liste d'objets restent nécessaires. Un objet sans qualité ignore cette plage ; un objet sans PV ignore celle des PV. Le meuble emballé utilise le bâtiment intérieur, son matériau, sa qualité et ses dégâts. Les plages ne changent ni capacité, ni limite de pile, ni propriété.

Les paramètres sont optionnels : `quality: {min,max}` et `hitPoints: {min,max}`. Les sept qualités existantes sont ordonnées ; les PV sont des entiers inclusifs 0–100. Une plage inversée, partielle, mal typée ou contenant un champ supplémentaire est refusée. La désactivation explicite efface le critère, sans substituer une plage synthétique dans les mondes historiques. Les valeurs saisies sont validées avant émission de commande.

## Contacts, changement d'état et conservation

Le fournisseur automatique, le fournisseur forcé, les réservations actives/en file, la chasse, l'habillement et la sortie de production transmettent la pile réelle au prédicat. Une proposition basée sur un ItemId n'atteste que catégorie/liste, jamais qualité/PV. Les objets sans composant applicable ne reçoivent aucune valeur fictive.

L'admission aux PV emploie le ratio float32, l'arrondi Core au centième vers l'entier pair et les bornes inclusives ; la politique d'habillement garde son propre ratio brut. Les paquets prennent l'état du meuble. Une pile refusée sur sa case n'est pas supprimée : sa priorité de source devient zéro, ouvrant un transport vers une réserve admissible de priorité positive. Accès, capacité et réservation restent obligatoires.

Un changement de filtre pendant le portage relâche/replanifie selon les règles existantes, avec dépôt préparé avant mutation. Sans place sûre, la commande reste refusée atomiquement ; aucune cargaison perdue. La livraison revalide l'instance avant contact. Une sortie de production fixe sa qualité une seule fois et peut changer de destination ou utiliser le dépôt au sol de secours ; aucun reroll pour satisfaire le filtre.

La fusion conserve l'identité et les règles de dégâts pondérés existantes ; on filtre l'objet entrant. Une pile ensuite inadmissible reste physique et pourra être rangée ailleurs. Les dépôts d'interruption hors stockage ne deviennent pas des téléportations ou une conversion de meubles en matières.

## Responsabilités et charge

`storage-condition.ts` centralise validation, état et clé d'équivalence ; `storage-filters.ts` combine catégorie/liste/conditions. Les capacités géométriques restent typées par ItemId. Les caches qui incluent l'admission distinguent qualité et PV arrondis ; pas d'identité/quantité/propriétaire dans leur clé d'état. Ils expirent avec la décision. `idle-logistics.ts` garde la voie historique sans plages et partage les candidats géométriques par objet avant le contrôle des états. Les budgets de couples/routes restent en place.

Aucune lecture de filtre par image ni changement de géométrie/rendu ; aucun nouveau buffer GPU. Ce périmètre ne garantit pas un coût CPU nul. L'admission de plusieurs états doit être confrontée à un oracle indépendant sur carte 250² ; mesurer séparément le rejet rapide et la planification avant toute conclusion générale.

## Frontières et validation

**Schéma 176** : validation stricte de 175 avant migration neutre. Les champs futurs y sont refusés ; aucun état, plage, objet, tirage ou transport rétroactif. Le snapshot/delta est refusé avant adoption si les nouvelles plages sont invalides. Une pile déjà posée mais refusée par sa réserve n'est pas une sauvegarde corrompue ; une réservation de livraison interdite l'est.

La [preuve ciblée](../history/validation-storage-condition-v188.md) couvre prédicats/arrondis, deux objets de même ItemId et états différents, transport réel vers priorité inférieure, filtre changé après ramassage, reprise, sortie de confection sans reroll, paquet puis réinstallation, commandes atomiques, migration stricte et delta au même tick. Le parcours UI préparé règle les plages puis observe les vrais propriétaires. Validation ciblée et présentation concernent les contrats touchés ; régression complète et campagnes longues ne sont pas exercées dans ce lot.

Pas d'étagères, de fraîcheur, de contamination ni de règle de tenue sale dans ce lot.
