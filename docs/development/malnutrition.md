# Malnutrition et retour à l'alimentation — V84

[Recherche et divergences](../research/malnutrition-reference.md). La malnutrition concerne les humains et les lièvres ; les maladies, lésions, saignements et expositions thermiques conservent leurs états propres.

À nourriture nulle, une condition médicale apparaît et progresse toutes les 15 ticks locaux. Chaque individu conserve implicitement un taux déterministe lié à son identité, compris entre 36,24 et 54,36 % de sévérité par jour. Aucun tirage du PRNG général n'est consommé. Un repas réellement ingéré rend la nourriture positive et inverse cette progression ; il ne supprime pas instantanément les symptômes. L'appétit reste accru jusqu'à récupération complète.

Les cinq stades altèrent la conscience, puis les capacités qui en dépendent. À 80 %, un individu autrement sain perd connaissance ; à 100 %, il meurt. Les combinaisons avec d'autres atteintes peuvent être fatales plus tôt. Les transactions d'incapacité existantes interrompent le travail, libèrent les réservations et conservent les objets. Un colon à terre peut être secouru et nourri physiquement par un médecin selon son régime. Les lièvres peuvent récupérer en s'alimentant avant incapacité ; aucun soin vétérinaire à distance n'est ajouté.

La cicatrisation cesse seulement pendant la faim à zéro et reprend après alimentation, même si la malnutrition décroît encore. La pensée de famine s'aggrave avec le stade pendant la catégorie affamée ; les autres catégories gardent leurs pensées alimentaires. La malnutrition seule ne crée ni plaie à traiter ni dépense de médicament ni besoin automatique de repos médical.

## Persistance et migration

`MedicalRecord.malnutrition?` est une sévérité entière de 1 à 1 milliard, absente à zéro. Le tick médical, la phase liée à l'identité et le taux déterministe suffisent à poursuivre exactement. La cause de décès `malnutrition` est explicite. Humains, animaux et dépouilles animales utilisent la même validation.

V83 est validée strictement **avant** migration neutre vers 84. Aucun passé de famine ni maladie n'est inventé ; les jauges, ressources, calendriers et travaux sont conservés. Les nouvelles règles s'appliquent aux ticks joués après migration. Un fichier annoncé V83 contenant une condition V84 est refusé, pas « réparé ». Les nouvelles cultures et stations ont leurs propres frontières historiques.

L'inspection Santé affiche sévérité et progression/récupération. Les besoins, alertes et pensées utilisent le même état. Les contrôles regroupent acquisition réelle, phases, seuils/comorbidités, reprise, repas autonome/assisté, décès et migrations ; ils ne prétendent pas couvrir toute la médecine.
