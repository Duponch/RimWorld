# Compétences — premier consommateur Construction V43

[Recherche et décisions](../research/skills-reference.md). Corpus chapitre 13, SYS-085 / TEST-085 ; chapitre 9 pour affectations et chapitre 10 pour travail physique. Le système est **partiel**, pas une livraison des douze compétences Core.

## État et temps

`Pawn.skills` contient Construction : niveau 0–20, expérience et bilan quotidien en milli-XP, passion 0/1/2, plus la dernière remise à zéro. Aucune horloge réelle, tirage aléatoire ou cache dérivé n'affecte l'apprentissage. Trois profils de scénario : Ada 8/passion, Noé 10/passion brûlante, Mina 4/sans passion. Ces choix ne reproduisent pas la génération de biographies Core ; les onze autres compétences ne reçoivent pas de nombres fictifs.

Seuil vers le niveau suivant : 1 000–10 000 XP entre niveaux 0–9, puis 12 000–30 000 entre 10–19. Au niveau 20, réserve plafonnée à 29 999 XP. L'oubli permet une dette jusqu'à −1 000 XP avant la perte d'un niveau. Il se produit tous les vingt ticks locaux, déphasé par ID, pour les niveaux 10–20 : 0,1 / 0,2 / 0,4 / 0,6 / 1 / 1,8 / 2,8 / 4 / 6 / 8 / 12 XP par intervalle. Aucun oubli aux niveaux inférieurs.

Une passion multiplie les gains par 0,35 / 1 / 1,5. Au-delà de **4 000 XP nets**, les gains suivants sont multipliés par 0,2 ; l'appel qui franchit le seuil n'est pas scindé. L'oubli diminue aussi le bilan quotidien et ne subit pas ces multiplicateurs. Le premier intervalle de la première heure du jour remet le bilan à zéro, au plus une fois par demi-journée ; la date de dernière remise est sauvegardée. Le déphasage local adapte celui de Core (200 ticks Core = 20 locaux).

## Actions réellement branchées

Vitesse Construction = `0,30 + 0,0875 × niveau`, multipliée séparément par la lumière. Le niveau atteint lors d'un gain s'applique immédiatement au travail suivant de ce tick. Bâtir un cadre approvisionné et déconstruire un bâtiment à recette non vide donnent 2,5 XP de base par tick local physiquement travaillé. Trajet, livraison, défrichage, attente, transport, cuisine et taille ne donnent aucune XP Construction. Toiture et désinstallation utilisent la vitesse mais n'enseignent pas la compétence. Une réinstallation depuis un paquet conserve sa pose instantanée après portage.

Les quantités, réservations, propriétaires et trajets restent ceux des contrats existants. Le compte d'XP ne dépend pas du travail produit : un débutant lent travaille plus longtemps pour un ouvrage, et peut donc en retirer davantage d'expérience. L'annulation n'efface pas l'apprentissage réellement effectué.

**Durées encore calibrées** : les recettes locales conservent leurs unités documentées, y compris les anciens ouvrages ; le facteur d'exécution Core ×1,7 est déjà absorbé dans certains travaux (toiture, déconstruction et désinstallation), mais pas uniformément dans le catalogue historique. La vitesse relative est livrée, pas une parité des durées absolues. Échecs de construction, niveaux requis, qualité, traits, autres compétences et humeur liée à la passion restent à intégrer. Ne pas les déduire de l'affichage d'un niveau. Les facteurs physiques de Construction sont intégrés en [V45](health.md).

## Sauvegarde et interface

V42 est entièrement validée avant migration. Ajout d'un profil 8/sans passion/0 XP par personne, dernière remise à zéro inconnue (`-1`) : vitesse antérieure conservée, aucun apprentissage rétroactif, aucune carte/route/ressource/PRNG réécrite. Les autres migrations atteignent V42 avant cette étape. V43 exige le profil, des entiers bornés, une passion valide et une date non future ou la sentinelle `-1` ; un état invalide ne remplace pas la partie.

L'inspection en bas à gauche présente Biographie/compétences avec niveau, barre d'XP, dette éventuelle et facteurs. Travail conserve les priorités et affiche niveau/flammes sous Construction. Le HUD suit sa cadence habituelle ; aucun calcul de compétence par image ni changement des poses GPU.

## Vérification

Scénarios `skills.test.ts` : seuils tabulés indépendamment, saturation stricte, dette, niveau 20, minuit, effets sur chantier réel, trajets et défrichage sans XP, annulation, reprise, migration corrompue et snapshots. Les anciennes fixtures doivent retirer les champs V43 avant de prétendre représenter une sauvegarde ancienne. Le pilote de colonie choisit son bâtisseur d'après le niveau et conserve les apprentissages dans son bilan. Voir [validation](validation.md) pour les exécutions et mesures effectivement réalisées.

Reproduire la charge : `node --experimental-strip-types scripts/skills-bench.ts`, rapport courant ignoré `artifacts/skills-cpu-latest.json`. Un chemin de sortie explicite permet de conserver une nouvelle preuve sans écraser celles de V43.
