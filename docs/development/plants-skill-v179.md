# Compétence Plantes et colonie de test — V179

2 octobre 2026, schéma **168**. [Recherche Core](../research/plants-skill-core-v179.md), [compétences communes](skills.md), [agriculture](farming.md), [cueillette V178](healroot-wild-v178.md), [preuve](../history/validation-plants-v179.md). Cette tranche branche le savoir-faire agricole sur les travaux existants ; la racine domestique n'est pas encore semable.

## Ce que le joueur constate

Bio affiche Plantes, sa progression, la vitesse avant lumière, les chances de récolte et le bonus de rendement. Travail affiche niveau et passion sous Culture et Récolte. Un colon apprend pendant les ticks de semis, récolte et abattage productif exécutés au contact. Désignation, réservation, trajet et transport ne donnent aucune XP Plantes ; le dégagement d'un arbre enseigne Plantes, pas Construction. Une annulation conserve seulement l'expérience effectivement acquise.

**Charger une partie → Colonies de test → Racines et soins · 3 colons** ouvre une carte boréale 250² en pause. Ada, Plantes 8, rejoint la racine naturelle mûre (127,143), déjà désignée ; la réserve filtrée est en (127,126). Son problème de dos naturellement généré conserve 90 % de vitesse et 97 % de réussite, sans soin ou capacité précrédité ; la dose de cette graine est vérifiée par l'exécution réelle. Transport et Médecin sont initialement désactivés pour observer séparément les étapes. La fiche explique comment activer Transport, ordonner le dépôt puis activer l'auto-soin et Médecin de Noé. Sa contusion est préparée ; la récolte, la dose et le soin ne sont pas précrédités. [Bibliothèque et conservation des anciennes références](test-colonies.md), [générateur explicite](../../scripts/generate-healroot-demo-v179.ts). Aucun constructeur de scène n'entre dans le bundle du jeu.

## Profil, vitesse et apprentissage

`Pawn.skills.plants` est facultatif. Son absence historique se lit **niveau 8, sans passion, zéro XP**, sans allouer ni persister une biographie fictive. Le premier tick productif crée ce profil et applique l'apprentissage commun. Les nouvelles personnes ont le niveau 8 ; les trois profils de départ ont passions 1/0/1, choix local sans tirage de biographie Core. Le module [plant-skills.ts](../../src/sim/plant-skills.ts) centralise les règles ; niveaux, milli-XP, traits, saturation, oubli et remise quotidienne restent ceux des compétences communes.

Vitesse avant lumière : `(0,08 + 0,115 × niveau) × Manipulation × (0,7 + 0,3 × min(Vue,1))`, minimum 0,1. L'incapacité de manipuler conserve zéro travail et zéro apprentissage. Les capacités ne sont appliquées qu'une fois. Le gain de **850 milli-XP de base par tick local** adapte 0,085 XP par tick Core avec l'horloge ×10 ; il précède la lecture du niveau et de la vitesse du même tick. Passion, traits et saturation s'appliquent au gain, sans accélérer directement l'action.

Les durées neutres historiques sont conservées : semis 17, cultures 20 à la récolte, healroot sauvage 40, autres récoltes/coupes 60, abattage générique 100 ticks. Le semis du pot conserve son propre travail de 54 ticks. Le facteur Core de progression 3,3→1 selon croissance, `WorkSpeedGlobal` complet et les bonus d'équipement ne sont pas livrés. Un niveau 8 sain reste à vitesse neutre ; le minimum 0,1 modifie prospectivement le cas de capacités très diminuées. Ni la migration ni la présentation ne réécrivent une progression entamée.

## Récolte et conservation

La courbe Plantes donne 60/70/75/80/85/90/95/97,5/100 % aux niveaux 0–8, puis 101/102/103/104/105/106/107/108/110/112/113/113 % aux niveaux 9–20. Manipulation poids 0,3 et Vue poids 0,2 (Vue plafonnée à 1) modifient la statistique, bornée entre 0 et 1,5. Le niveau du tick final est utilisé.

Pour une récolte humaine de plante non arborée : tirer l'échec, puis en cas de succès arrondir le rendement physique de croissance/PV ; si la statistique dépasse 1, multiplier cet **entier** par elle et arrondir une seconde fois. Sous 1, la statistique réduit les chances de réussite, pas la quantité après réussite. Les arbres ne subissent pas le tirage d'échec ; ils peuvent recevoir le bonus au-dessus de 1. Chaque arrondi humain lit un tirage, même pour un entier. Les anciens helpers sans acteur conservent leur comportement explicite pour les fixtures et producteurs indépendants ; l'exécution humaine passe toujours l'acteur.

Les tirages sont prévisualisés dans un flux privé. Si le produit positif n'a pas de dépôt admissible, ni plante, ni stock, ni identité, ni PRNG ne sont engagés. Le moteur libère le travail selon son contrat antérieur. Un échec ou zéro rendement validé consomme la plante non persistante sans dose ; un buisson persistant reprend sa croissance. L'XP du travail passé reste acquise, même après échec ou refus de dépôt. Les sauvegardes conservent le PRNG exact, sans chercher à reproduire les tirages du moteur Core.

## Adaptations explicitement conservées

La coupe stérile des espèces V91, dont le healroot, reste sans produit et sans XP ; les anciens buissons coupés gardent leur sortie historique, sans nouvelle XP ni nouvelle statistique de récolte. L'abattage apprend seulement si l'arbre est actuellement récoltable et a un rendement potentiel positif. L'admissibilité est relue pendant le travail : Core capture son taux à la création des toils, avant le trajet. Le franchissement d'un seuil pendant un déblaiement constitue donc un écart de bord documenté ; la reprise locale reste exacte.

Le modificateur de PV déjà livré pour le healroot V178 est conservé ; son extension à tous les végétaux, le facteur de difficulté des cultures, maladies végétales et familles absentes demandent des lots distincts. Cette tranche ne livre pas une parité agricole exhaustive.

## Sauvegarde, bridge et coût

V167 est validée strictement avant migration neutre 167→168. Un champ Plantes futur y est refusé ; migration sans insertion de profil, XP, plante, médicament, progression ou tirage. V168 valide bornes du profil et champs inconnus. Le décodeur de snapshots refuse aussi un profil futur/corrompu avant adoption, sans consommer la révision du paquet refusé. Les records sont copiés par les snapshots existants, y compris lors d'un changement au même tick.

Lectures O(1) aux ticks réellement travaillés ; le contact et le cache spatial existants fournissent les cibles. Aucun scan agricole supplémentaire par frame, nouveau lot GPU, animation ou téléchargement permanent. La nouvelle scène d'environ 3,27 Mio est chargée à la demande et soumise aux bornes et à l'empreinte du catalogue. [Banc CPU séparé](../../scripts/plant-skills-bench-v179.ts), résultats et limites dans la preuve ; l'absence de nouveau lot graphique n'est pas une preuve de coût GPU nul.
