# Socle anatomique sous V43

**Implémenté et testé, pas encore actif dans la partie.** Ce lot ajoute les définitions et le calcul physiologique ; il n'ajoute aucun champ à `Pawn`, aucune blessure de gameplay, aucun état à terre et aucune statistique fictive à l'interface. Ce lot seul conservait le schéma 43 ; le schéma courant V44 ajoute séparément les [interruptions de fatigue](interrupted-cargo.md). [Vérification des références](../research/body-reference.md), [préparation des transitions et blessures](../research/health-preparation.md).

## Frontière du modèle

`body-definition.ts` décrit 64 entrées d'humain adulte, racine/parents, côtés, organes, doigts/orteils, PV, profondeur, hauteur, couverture et groupes vestimentaires. L'emplacement utilitaire de couverture nulle est conceptuel. Ces objets et index sont créés une fois et gelés. Leur identité ne dépend ni des noms traduits, ni du squelette GPU ; le catalogue des corps animaux, enfants et implants reste ouvert.

`body-capacities.ts` reçoit une **projection courante** de pertes locales, parties absentes et douleur déjà calculée. Ce n'est ni le format des blessures ni une barre de vie sauvegardée. Le futur propriétaire des lésions fournit cette projection après leurs mutations. Il lui incombe de résoudre l'amputation et les cas de blessures ne détruisant pas les parties avant l'évaluation ; il ne faut pas déduire une amputation définitive d'un simple appel au calcul d'efficacité.

Onze capacités naturelles sont évaluées : conscience, mobilité, manipulation, vue, ouïe, parole, ingestion, respiration, circulation, filtration et digestion. Les sorties séparent capacité d'éveil, capacité de mobilité, choc douloureux et échec physiologique vital. `movingCapable` signifie capacité de mobilité supérieure à son seuil : **le choc douloureux doit aussi être examiné pour autoriser l'action**. Une sortie physiologique n'est pas une transition autoritaire de mort, ne crée pas un cadavre et ne libère pas une réservation.

Résultats gelés ; corps sain renvoie une référence constante sans allocation. Une évaluation lésée parcourt le petit arbre et les pertes locales. Aucun cache par ID/tick ni tableau partagé mutable : deux modifications dans le même tick sont visibles, un ancien résultat reste intact. Le calcul est à déclencher après changement médical, jamais par frame ni par étape de navigation. Les mesures isolées ne sont pas des temps de tick du jeu.

## Validation et prochaine intégration

Sept scénarios couvrent arbre complet et exposition conservée, côtés, arrondis locaux/capacités, os protégés, membres lésés du même côté ou de côtés opposés, organes vitaux, seuils d'éveil/mobilité/douleur, indépendance des acteurs et recomposition JSON. Un scénario parcourt toutes les paires de retraits et toutes les pertes entières de chaque partie : valeurs finies, monotonie et ordre des retraits. Ces combinaisons anatomiques ne prouvent pas toutes les interactions médicales futures.

Avant activation : état persistant des lésions et migration validée ; interruption médicale immédiate (fatigue et cargaison sécurisées en V44) ; transitions chronologiques corps/travail/cargaison ; consommateurs par statistique ; première cause réelle de blessure, puis secours/soins. Enrichir alors le pilote de colonie, les sauvegardes, l'observateur de présentation et un scénario UI. Les tests graphiques et la longue partie n'ont pas été relancés pour ce module encore non branché.
