# Personnalité active — V69

Première tranche de l’étape 3 : six traits ont des effets dans le camp ordinaire. [Sources et incertitudes](../research/traits-reference.md), [preuves](../history/validation-traits-v69.md), [suite canonique](../ROADMAP.md). Cette tranche ne termine pas les personnes ni la vie sociale.

## Périmètre et critère d’arrêt

Décision du joueur : consulter le profil avant un accueil, choisir qui former et prévoir les loisirs d’une personne plus sensible. Invariants : un caractère ne crée ni XP, ni bonheur immédiat, ni ressources ; les facteurs sont communs à la simulation et à l’inspection, persistés seulement sous forme d’identifiants. Livrer leur effet sur les producteurs actuels, la reprise et la boucle de colonie ; arrêter ce lot avant d’étendre le catalogue. Les premières interactions/opinions sont ajoutées en [V70](social.md).

| Trait | Effet effectivement consommé |
|---|---|
| Optimiste / Pessimiste | +6 / −6 à la cible d’humeur, pensée de situation explicable ; jauge progressive, gel et expiration des autres causes inchangés. |
| Résolu / Nerveux | Seuil mineur 26 / 43 au lieu de 35 ; majeur ×4/7, extrême /7. Effet sur l’exposition aux crises, aucun changement direct d’humeur. |
| Apprentissage rapide / lent | Facteur général 1,75 / 0,25. Multiplie passion puis saturation des gains ordinaires ; oubli négatif inchangé, pas de bonus instantané de vitesse. |

Les quatre compétences actives sont concernées : Construction (finition, déconstruction, réparation), Médecine (soin réellement terminé), Tir (émission admissible) et Mêlée (attaque contre cible admissible). Transit, préparation, transport, pose de toit, désinstallation et taille de pierre n’inventent pas d’XP. L’apprentissage peut ensuite changer le niveau, donc ses consommateurs existants. Les huit autres compétences, qualité/échecs et effets d’humeur des passions ne sont pas ajoutés.

## Identité et génération

`traits.ts` possède six définitions gelées, trois familles exclusives, les facteurs purs et leur validation. `Pawn.traits` est facultatif : absence = neutre, liste présente = une à trois entrées connues, au plus une par famille ; inconnus, doublons, familles incompatibles et liste vide sont refusés. Aucun PRNG ni calcul de facteur par frame ; au plus trois entrées examinées par requête, pas de cache mutable par personne.

Nouveau **camp ordinaire** : Ada Optimiste/Apprentissage rapide ; Noé Résolu/Apprentissage lent ; Mina Pessimiste/Nerveux. Choix de scénario, pas biographies ni distribution Core. `initializeCampTraits` est appelé au démarrage worker et dans le pilote correspondant ; `createWorld` reste le générateur neutre utilisé par les fixtures. Le scénario Rencontre armée garde ses profils neutres. Les nouveaux voyageurs emploient les trois mêmes profils : leurs traits sont enregistrés dans l’offre et visibles avant la réponse, puis copiés à l’entrée. Assaillants actuels sans traits attribués ; cela ne représente pas leur futur générateur.

V68 est strictement validée **avant** migration V69 neutre : personnages et offres déjà ouverts restent sans trait. Rien n’est inventé à l’acceptation d’une offre ancienne. Reprise, ressources, RNG, XP, routes et exposition sont conservés. Les prochaines offres générées peuvent annoncer des traits. Les bornes de validation journalière d’XP couvrent le facteur maximal ×1,75 en V69 ; les bornes historiques ne sont pas assouplies pendant leur validation.

## Inspection et scénarios

Biographie/compétences présente traits, descriptions, facteur général et apprentissage effectif par compétence. Pensées expose la cause naturelle et les trois seuils personnels. Travail conserve les priorités et enrichit ses infobulles. Accueil annonce les traits sans nouvelle commande. Pas d’autre panneau, pas de contrôle direct de personnalité ni de changement GPU.

Le pilote de cinq jours garde le meilleur niveau Construction et départage une égalité par apprentissage. Il prévoit une heure de loisirs avant la nuit pour le profil Nerveux, par commande d’horaire ordinaire, sans écrire les besoins. Bilans : profils, apprentissage, seuils, construction, nourriture, arrivée et assaut. Cette politique n’est pas un optimum ni une garantie contre les crises.

Les tests regroupent seuils exacts/gel/crise réelle au-dessus de 35, gains/oubli/saturation/plafond/minuit, producteurs physiques, migrations corrompues, offre et snapshots ; UI native à 1×/6× et audit mixte via `TRAITS=1`. Les preuves distinguent le camp de cinq jours simulé, l’UI de transitions contrôlées et la mesure courte de charge.
