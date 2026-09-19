# Coton et tissu — V71

Première tranche de l’étape 4. **Livré : culture → récolte → transport → stockage. La confection est maintenant livrée en [V72](tailoring.md), recherche encore absente.** [Sources fraîches et choix de filière](../research/textile-reference.md), [agriculture partagée](farming.md).

Décision nouvelle : réserver une petite partie du camp à un matériau non alimentaire, sans sacrifier le potager. Invariant : changer la culture ne transforme aucun plant ni aucune pile ; le tissu n’apparaît qu’à la récolte physique. Critère d’arrêt du lot : semer du coton par l’interface, obtenir/ranger son produit, sauvegarder et reprendre ces transitions. Les autres espèces, maladies et toute la couture restent hors de cette tranche ; l’étape 4 globale reste ouverte.

## Règles et continuité

- La zone possède une espèce `rice` ou `cotton`. L’outil crée toujours un champ de riz ; son inspection permet de choisir le coton. Une commande de politique ancienne sans `plant` garde l’espèce actuelle. Un identifiant inconnu est refusé sans mutation.
- Changer l’espèce interrompt les travaux automatiques liés à la zone, y compris un semis engagé, avec dépôt conservatif. Les plantes existantes et ordres indépendants restent présents. Coupe désactivée protège les plantes de l’ancienne espèce ; Coupe activée permet dégagement puis nouveau semis. La case ne reçoit jamais deux plants.
- Coton : 17 ticks locaux de semis, 20 de récolte à taux neutre ; huit jours de croissance continue idéale, minimum fertilité 70 %, sensibilité 100 %, dix tissus à maturité. Lumière, nuit, toit et température réutilisent les checkpoints de croissance. Aucun balayage de tous les plants à chaque tick.
- Récolte automatique à maturité ; manuelle strictement au-dessus de 65 % avec rendement réduit/arrondi stochastique. Le dernier travail prévalide les dépôts avant de retirer le plant ou d’engager le PRNG. Sol saturé : rien n’est détruit. Une nouvelle plantation a une nouvelle identité.
- `cloth` appartient à `textile`, pile maximale 75, sans nutrition ni pourriture. Objet porté et pile au sol conservent type/quantité. Réserves : filtre Textiles, absent = refus ; les anciennes réserves ne changent pas silencieusement. Une pile de tissu ne fusionne pas avec bois, riz ou vêtement.

`plants.ts` porte définitions/croissance, `farming.ts` choisit l’espèce lors de la fin du semis, `gathering.ts` émet le bon ItemId et sa catégorie. Le producteur ne suppose plus que toute récolte fournit de la nourriture. Planificateur et transports conservent leurs budgets communs.

## Présentation

Coton blanc à maturité et jeune plant vert, forme distincte du riz. Deux lots instanciés résidents dans `CropLayer`, préchauffés même vides ; ni reconstruction des arbres ni création de pipeline lors d’une récolte. Chaque forme réserve au chargement la borne d’un plant par cellule : 65 536 emplacements à 250², environ **4,75 Mio par lot**, côté CPU et côté GPU. Deux formes représentent donc environ 9,5 Mio de chaque côté ; ce choix ne doit pas être multiplié aveuglément par toutes les futures espèces.

Les matrices/couleurs utilisent `StaticDrawUsage` et des plages marquées lors des mises à jour, pas des renvois implicites à chaque frame. Croissance actualisée à la cadence de présentation existante de 25 ticks. Piles de tissu dans les lots de boîtes, cargaison dans le lot GPU partagé des colons ; pas de squelette ou mesh par objet porté. Le compteur de tissu apparaît à gauche lorsqu’il existe.

## Schéma et limites

Schéma **71**, validation stricte de V70 avant migration neutre. Aucun plant, tissu, filtre ou passé de croissance ajouté au chargement. Les données V71 cachées sous V70 sont refusées, même un filtre Textiles à `false`. Le bridge conserve les instantanés précédents et les phases existantes de récolte/portage.

V72 complète ce lot par la tenue tribale, les inachevés et la qualité/XP Artisanat. Restent absents : compétences Artisanat/Plantes complètes, recherche, autres textiles/cuirs, PV/mortalité végétale, maladies, détérioration des piles exposées, climat saisonnier et coût de passage propre aux plants. Le profil de rendement demeure sain/neutre. La filière comprend un premier vêtement ; son catalogue et sa recherche restent incomplets.

[Preuves du lot](../history/validation-textile-v71.md). Les scénarios groupent culture naturelle sur dix-huit jours et plus, mutation des politiques, reprise de portage, saturation, migration et présentation. Le pilote de camp commun prévoit un second champ après nourriture et couchages ; sa durée de cinq à huit jours ne suffit pas à certifier la récolte de coton.
