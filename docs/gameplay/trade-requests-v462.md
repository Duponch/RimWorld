# V462 — demandes commerciales mondiales

22 octobre 2026. **V462 publiée — schéma 284.** Le parcours commercial natif, la présentation générale par reprises, le typage final et le build Pages sont acquis. [Jouer](https://elsewhere-cq7.pages.dev/).

Une demande commerciale donne un débouché aux produits de la colonie : offre d’un établissement existant, choix de récompense, acceptation, puis remise complète par une vraie caravane. Les marchandises quittent ses inventaires et les récompenses originales rejoignent ses porteurs, une seule fois. Ce lot relève surtout de l’ensemble 4 et relie production, vêtements, habitants et animaux, voyages, diplomatie et conservation.

## Règles et parcours

La [référence primaire](../research/trade-requests-v462-reference.md) distingue les règles Core 1.6.4871 vérifiées et les adaptations. Les annonces officielles ont été revérifiées sur Internet ; les clauses détaillées viennent des définitions et méthodes actuelles de l’installation. Aucun code, texte de quête ou asset propriétaire n’est intégré.

- L’établissement doit être réellement visitable, non hostile, à moins de 32 tuiles mondiales approximatives du foyer. Une destination déjà sollicitée est exclue. Un trajet trop long refuse l’occasion, sans chercher une cible de secours.
- Les 57 familles admissibles regroupent les variantes de matière. Stock réel et potentiel indépendant sont évalués séparément ; un stock seul ne prouve pas la possibilité de produire. Le prédicteur ne crée ni ingrédient, réservation ou chaîne récursive de recettes.
- L’offre laisse 4–8 jours pour accepter. La durée de livraison, tirée entre 12 et 28 jours et bornée par le trajet, est fixée à l’offre ; son échéance part de l’acceptation. Les tickets des autres familles non représentées ne sont pas redistribués.
- Une notification ouvre la bonne demande dans **Quêtes**. Masquer l’offre conserve son délai. Le choix de récompense reste un brouillon jusqu’à **Accepter la demande**.
- La caravane doit être immobile à la destination réelle. Seuls ses inventaires humains et animaux comptent : produits frais, qualité normale ou meilleure si applicable, vêtements dont la provenance est connue sans port par un cadavre. Aucun seuil de PV n’est ajouté.
- Depuis la caravane, **Préparer la remise** attend la vraie confirmation de pause. L’aperçu peut être annulé sans mutation. **Confirmer la remise** consomme la quantité exacte, applique le bonus diplomatique demandé de +12 puis la récompense choisie. Aucun négociateur, vente ou argent marchand n’est requis.

Les options conservent leurs objets originaux dès l’offre. Le choix nettoie les options écartées ; expiration ou hostilité nettoient les gains non remis. Les reçus sont descriptifs, sans deuxième propriétaire. Une cible détruite reste indisponible avec son histoire conservée, sans retargeting ou résurrection. La remise peut surcharger les vrais porteurs ; l’interface l’annonce et les règles ordinaires de marche continuent de s’appliquer.

## Conservation et limites

Schéma **284** : validation stricte de 283 avant changement de numéro seul. La migration ne donne aucune offre, ressource, personne, date, histoire ou provenance propre. Un vêtement neuf est documenté propre ; le vrai décès marque ses vêtements portés avant leur retrait. Retrait et transfert ne nettoient pas. Une provenance historique absente reste inconnue. Aucune résurrection locale, pénalité d’humeur ou révision générale du prix des habits souillés n’est ajoutée.

Le détenteur exclusif de récompense, les sauvegardes entières, les projections publiques et résidentes et le résumé de campagne sans carte ont leurs gardes. **Quêtes** reste accessible sans carte locale ; aucun faux monde local n’est fabriqué pour l’afficher. Le fret en inventaire des anciens gilet pare-balles, casque pare-balles et casque de reconnaissance est admis en 284 ; les frontières historiques restent strictes.

Adaptations déclarées : richesse matérielle connue entière avec inconnus conservés, 23 types existants de récompenses principales de qualité normale, compléments et réputation, RNG local sauvegardé et tirage temporaire de quantité original. Le calcul n’est pas WealthTotal natif et ne rééquilibre pas les raids. Humains récompensés, livres et distribution standard exhaustive restent ouverts. Le métier Crafting regroupé, les rendements locaux et l’arrondi pur du cuir potentiel sont précisés dans la référence. Si les gains ne peuvent être représentés chez leurs porteurs, la transaction entière est refusée sans perte.

## Contrôles acquis par reprises

**104 cas distincts : 66 nouveaux dans 7 fichiers et 38 voisins V461.** Ce total cumule les cas devenus verts ; il ne désigne pas une seule exécution finale de 104 cas.

| Nouveaux contrôles | Cas |
|---|---:|
| Accessibilité, familles et potentiels indépendants | 10 |
| Détenteurs, reçus et sauvegardes | 11 |
| Quantité, richesse, délais, calendrier et vrai producteur | 10 |
| Offres, notification et vrai résumé sans carte | 6 |
| Provenance des habits et admission du fret d’armures | 12 |
| Remises sur les vrais propriétaires géographiques | 8 |
| Consentement et réponses tardives dans le DOM | 9 |

Les 9 derniers cas utilisent un devis doublé et ne prouvent pas un échange physique. Les 8 remises emploient une vraie campagne et des préparations déclarées. La dernière reprise génération/provenance donne 22 PASS ; celle des offres avec notification, 6 PASS. Les résultats et chemins de toutes les reprises sont conservés dans `tmp/trade-request-v462/progress.md`.

Les échecs ne sont pas effacés : plafonds historiques oubliés, ateliers de test sans matière, narrowing de commande, oracles de version devenus datés et hypothèse de décès simultanés ont été diagnostiqués avant reprise. L’oracle de décès suit désormais chaque original parmi tous ses détenteurs terminaux ; aucune simultanéité artificielle n’a été imposée au produit.

## Offre réelle et parcours Chrome/WebGPU muet

La source géographique acquise est la campagne 259 au tick 2905, SHA256 `5ff387667bb3933d4b3957c65dd9516c4c3470e13d3c888b2a917878f9778525`. Le premier essai refuse correctement : le civil neutre le plus proche est à 36,477169, les deux voisins proches étant hostiles. La règle de distance n’a pas été relâchée.

Préparation déclarée : 4 000 tissus et un coton mûr sur la carte originale ; puis gain diplomatique demandé de 80 sur la vraie faction 2 via son opérateur existant, hostile −80 → neutre 0. Foyer, établissements, chefs, identités et RNG restent conservés par cette préparation diplomatique. Ce n’est ni un don payé ni un succès diplomatique joué.

Un appel au vrai producteur sur cet état crée **240 tissus pour Argile-Rive**, établissement 45. L’option 2 contient **un gilet pare-balles normal original 28462 et 59 plastaciers originaux 28463**. La même caravane est placée explicitement à destination ; ses 60 tissus et 180 transférés depuis la réserve préparée couvrent la demande. Aucun incident naturellement sélectionné, voyage, fabrication ou chargement par travail n’est prétendu par cette préparation.

Le premier témoin de remise a révélé le refus RAW du gilet en inventaire. Après correction, l’offre acquise a été rechargée exactement : aucun nouvel appel producteur, stock, délai ou RNG favorable. La contre-référence Node entière passe, puis le vrai parcours Chrome **155.0.8059.85 / WebGPU** passe en 126,392 s : notification et focus, brouillon sans mutation, acceptation, pause acquittée, aperçu annulé, nouvelle pause et confirmation distincte, mêmes récompenses, export entier et recharge de sa propre sauvegarde. Zéro erreur applicative et zéro notification de mise en page. Effets et musique désactivés, volumes à zéro avant chaque document, navigateur lancé muet ; les réglages par défaut du jeu publié sont conservés.

Le brouillon conserve l’entrée entière SHA `df27f2431f54efce5a6db0913c0a04addcc54179d2d8ede4223876dd4560e4c6`. Annuler conserve exactement l’état accepté. La remise, sa recharge et 60 images en pause conservent le même état entier, tick 2905, SHA `3dea79ff894f76755c1be2b79b9eb3c63551e8d245c8161a091465167fdf8975`. [Rapport natif](../../tmp/trade-request-v462/native-ui/2026-10-22T20-47-57-663Z/report.json). Les sources servies de ce parcours ont été recontrôlées égales. Seul l’en-tête ancien « Quêtes locales » est ensuite raccourci en « Quêtes » ; le contrôle général de présentation est effectué sur ces sources finales, dont les empreintes restent égales.

### Présentation générale acquise par reprises

Le pilote commun `test:presentation` atteint sa borne de 180 s après avoir terminé le minage. Sa phase conservée passe aussi l’oracle indépendant : 186 → 162 ordres, tick 2893, aucun saut invalide, occupation solide ou famine de présentation. L’abattage seul est repris ; une première reprise est interrompue lors d’un changement de session, sans phase acquise, puis ses processus sont vérifiés absents avant relance.

La seconde reprise d’abattage passe en 113,530 s, avec 45 s de collecte et les mêmes changements de vitesse : 262 → 238 ordres, tick 2887, zéro erreur, saut invalide, occupation solide ou famine de présentation. Un candidat brut est classé continu par le témoin de segment confirmé ; il reste compté dans le rapport. Les deux phases utilisent Chrome/WebGPU AMD RDNA 1, seed 42, carte 250² et trois colons, avec son et musique coupés. Ce sont des contrôles de cohérence, sans nouvelle mesure de la colonie de stress ni FPS global revendiqué.

[Minage conservé et oracle](../../tmp/trade-request-v462/presentation-mine-acquired.json), [abattage repris](../../tmp/test-runs/v462-presentation-chop-reprise02-2026-10-22T20-59-30.975Z-20100/artifacts/harvest-sync-v462-chop-reprise02.json). Le rouge de limite et l’interruption restent dans les journaux ; aucune suite interrompue n’est annoncée verte.

## Performances et livraison

Sur la même géométrie de 119 904 tuiles, 100 lectures par voie donnent la même valeur scalaire. Le scan géométrique redondant est remplacé par le propriétaire déjà préparé au chargement : médiane **148,9058 → 0,0031 ms**, p95 **215,5942 → 0,0071 ms**, maximum **267,125 → 0,0893 ms**. [Rapport ciblé Node](../../tmp/trade-request-v462/geometry-cost.json). Cette mesure ne couvre ni le coût total d’une offre, ni les FPS, le GPU ou la vitesse physique générale. La préparation froide reste nécessaire.

Typage final acquis en **49,714 s**, journal `tmp/validation-runs/v462-types-delivery-2026-10-22T21-01-57.489Z-25688/output.log`. Build Pages acquis en **9,021 s** sur le commit produit `6f63d2f68eba6ed673baa918b70b3fa9ef0b3807`, poussé sur `origin/main`. Paquet vérifié : 552 fichiers, 71 chemins de sauvegardes publiques identiques, assets statiques conservés, aucun outil privé de QA. [Rapport du paquet](../../tmp/elsewhere-pages/v462-package-8owdJ0/report.json).

Déploiement **`2a66a836`**, [adresse propre](https://2a66a836.elsewhere-cq7.pages.dev/) et [site stable](https://elsewhere-cq7.pages.dev/). Les **20 réponses HTTPS ciblées** ont les octets et types attendus sur les deux adresses ; [rapport](../../tmp/elsewhere-pages/v462-http-XBjwn9/report.json). La disponibilité du paquet ne vaut pas une deuxième campagne navigateur. L’avertissement Wrangler de dossier sale vient du dossier humain non suivi `references_UI/`, laissé hors commit et hors paquet ; les fichiers produit suivis étaient propres.

Les sauvegardes publiques et historiques sont conservées. Les autres bases de tous les domaines, les six ensembles, la campagne durable, la victoire et la cible 200–230 FPS restent ouverts. Les exemples donnés par l’utilisateur ne ferment jamais ce périmètre.
