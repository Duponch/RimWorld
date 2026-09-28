# Validation du casque pare-balles V141 — 28 septembre 2026

Le périmètre est le casque pare-balles **en acier** de Core 1.6.4871, pas tous les couvre-chefs. Le [relevé de référence](../research/flak-helmet-core-v141.md) s'appuie sur les XML et la classe de valeur marchande de l'installation locale. Le [contrat livré](../development/flak-helmet-v141.md) décrit les conversions et restrictions propres à Lisière.

## Règles et reprise

Le moteur demande Armure pare-balles, un atelier d'usinage alimenté, Artisanat 5 et les piles réelles de 40 aciers, 2 composants et 10 plastaciers. La facture produit un ouvrage lié à son auteur et à la facture ; les parts et la progression restent identiques au chargement, et une continuation de 25 ticks donne le même état sérialisé avant/après reprise. Le casque terminé peut être porté et compte pour le quota « jusqu'à X ». Le refus d'une annulation sans place laisse le monde et le PRNG intacts ; une annulation admissible restitue les trois types de matière. Les tests vérifient aussi le rejet strict d'un casque, d'une politique autorisante, d'une facture et d'un ouvrage dans un fichier annoncé V139, y compris la facture d'un atelier emballé. La scène V139 historique conserve ses octets et son manifeste ; son chargement ne change que le numéro de schéma 139→141.

La protection acier normale vérifiée est 0,63 tranchant, 0,315 contondant, 0,42 chaleur, pour la tête haute seulement ; 120 PV et aucun malus de marche. Le prix de catalogue est 258,8 avant qualité/état, affiché à 260 par les règles d'arrondi Core. Le casque, le gilet et leur portrait restent distinguables, et les politiques historiques n'acquièrent pas le casque lors de la migration.

## Contrôles exécutés

- **Production, migrations et économie : 45/45 tests** dans 11 fichiers, comprenant le casque V141, le gilet V109, usinage V101, composants V123/V139, commerce et anciennes scènes V123/V139.
- **Rendu, tenue et armure : 31 contrôles réussis** dans le groupe de dix fichiers exécuté. Deux anciens oracles de `habitat-apparel-*` échouent indépendamment de ce lot : l'un attend encore le schéma 90 après une migration moderne ; l'autre fournit seulement deux filtres textiles à une facture dont le catalogue en connaît maintenant davantage. Ces fichiers n'ont pas été changés pour masquer ces écarts historiques.
- **Chromium/WebGPU :** parcours V141 réussi avec création de facture depuis l'interface, coût des trois matières visible, production réelle, port du casque et validation du monde ; parcours de la scène historique V139 réussi après migration, avec recherche, facture et ouvrage physique. Aucun message d'erreur navigateur dans le parcours V141.
- `npm run typecheck`, `npm run build` et `git diff --check` passent. Le build signale la taille déjà élevée de certains chunks ; ce n'est pas une erreur de compilation.

## Coût et limites

Le casque porté reprend le lot instancié des colons et le même attribut d'équipement ; le portrait est mis en cache par identité de tenue. Il ajoute **86 sommets** à la géométrie partagée (50 pour la coque, 36 pour le bord), donc ces sommets sont présents même lorsque le casque est masqué. La planification de facture reste au rythme des décisions de travail, sans recherche de casque par image. Ce constat structurel ne mesure pas le GPU ni les FPS ; les deux parcours WebGPU prouvent la fonctionnalité, pas une égalité de coût avec V140. Le [profil général V140](validation-performance-v140.md) reste la référence pour les ralentissements constatés le 27–28 septembre.

La variante en plastacier du départ Core, les autres métaux possibles et les autres casques ne sont pas présents. Ni la suite historique complète, ni 240 FPS constants, ni un débit ×6 en grande colonie ne sont validés par cette tranche.

## Suivi des deux oracles historiques

Après V141, les deux tests `habitat-apparel-*` ont été corrigés sans modifier les règles ni assouplir la validation : la migration V89 attend le schéma courant, et la facture conserve tous les filtres du catalogue avant de changer ceux du tissu et du cuir léger. Le contrôle dirigé attend maintenant le **port effectif de la chemise fabriquée par sa facture**, par ID : son ancienne assertion sur `replacement?.apparel?.forced` pouvait réussir si aucune chemise de remplacement n'était équipée. La livraison en réserve et la prochaine décision de politique vestimentaire demandent environ 650 ticks de plus que la limite initiale de deux jours dans cette fixture ; la continuation est bornée avant la prochaine occasion Cassandra valide. Le test écrit sa preuve courante sous `tmp/` et ne réécrit plus l'artefact V90 historique.

Les deux campagnes passent séparément : la campagne dirigée finit à 982 064 avec la nouvelle chemise effectivement portée, et la campagne naturelle finit à 1 008 700 avec un vêtement produit puis porté. Six fichiers voisins d'habillement, confection et casque passent également (**26/26 tests**). `npm run build` inclut le typage et passe ; `git diff --check` passe. Ces contrôles corrigent ces deux oracles historiques précis, sans prétendre que la suite entière d'anciens tests est verte.
