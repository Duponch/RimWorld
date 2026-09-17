# Socle anatomique sous V43

**Actif en V45.** Le socle initial V43 décrivait anatomie et capacités sans gameplay médical. Le [module des lésions](injuries.md) et la [santé intégrée V45](health.md) possèdent désormais les dossiers de Pawn, leurs transitions et consommateurs. [Recherche anatomique](../research/body-reference.md).

## Frontière du modèle

`body-definition.ts` décrit 64 entrées d'humain adulte, racine/parents, côtés, organes, doigts/orteils, PV, profondeur, hauteur, couverture et groupes vestimentaires. L'emplacement utilitaire de couverture nulle est conceptuel. Ces objets et index sont créés une fois et gelés. Leur identité ne dépend ni des noms traduits, ni du squelette GPU ; le catalogue des corps animaux, enfants et implants reste ouvert.

`body-capacities.ts` reçoit une **projection courante** de pertes locales, parties absentes et douleur déjà calculée. Ce n'est ni le format des blessures ni une barre de vie sauvegardée. Le [module des lésions](injuries.md) fournit désormais cette projection après leurs mutations ; son rattachement à Pawn est livré en V45. Il lui incombe de résoudre l'amputation et les cas de blessures ne détruisant pas les parties avant l'évaluation ; il ne faut pas déduire une amputation définitive d'un simple appel au calcul d'efficacité.

La projection admet aussi l’offset et le plafond de conscience d’une affection ; ils s’appliquent après la formule physiologique, avant arrondi et consommateurs dépendants. Le profil d’hémorragie extrême garde son offset négatif en plus du plafond.

Onze capacités naturelles sont évaluées : conscience, mobilité, manipulation, vue, ouïe, parole, ingestion, respiration, circulation, filtration et digestion. Les sorties séparent capacité d'éveil, capacité de mobilité, choc douloureux et échec physiologique vital. `movingCapable` signifie capacité de mobilité supérieure à son seuil : **le choc douloureux doit aussi être examiné pour autoriser l'action**. Une sortie physiologique n'est pas une transition autoritaire de mort, ne crée pas un cadavre et ne libère pas une réservation.

Résultats gelés ; corps sain renvoie une référence constante sans allocation. Une évaluation lésée parcourt le petit arbre et les pertes locales. Aucun cache par ID/tick ni tableau partagé mutable : deux modifications dans le même tick sont visibles, un ancien résultat reste intact. Le calcul est à déclencher après changement médical, jamais par frame ni par étape de navigation. Les mesures isolées ne sont pas des temps de tick du jeu.

## Validation et prochaine intégration

Sept scénarios couvrent arbre complet et exposition conservée, côtés, arrondis locaux/capacités, os protégés, membres lésés du même côté ou de côtés opposés, organes vitaux, seuils d'éveil/mobilité/douleur, indépendance des acteurs et recomposition JSON. Un scénario parcourt toutes les paires de retraits et toutes les pertes entières de chaque partie : valeurs finies, monotonie et ordre des retraits. Ces combinaisons anatomiques ne prouvent pas toutes les interactions médicales futures.

L’activation au monde, les migrations, les consommateurs et les contrôles de partie sont maintenant livrés par le [contrat V45](health.md). Les mesures et scénarios isolés restent des preuves du calcul anatomique, pas de toutes les interactions médicales. Secours et soins sont livrés en V46–V51. V54 ajoute [les impacts anatomiques Bullet](bullet-impact.md) ; le combat joueur reste à intégrer.
