# V273 — lanceur EMP

Le schéma 208 ajoute une boucle tactique : fabriquer le lanceur à l’usinage, le transporter et l’équiper, viser une cible avec les commandes de combat existantes, puis exploiter une interruption mécanique temporaire. L’EMP ne remplace pas les armes létales : les mécanoïdes reprennent leur activité et s’adaptent aux impacts rapprochés.

## Référence primaire et fabrication

Core local **1.6.4871 rev590**, `Assembly-CSharp.dll` SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Sources : `Weapons/RangedIndustrial.xml`, parents d’armes, `Damages_Stun.xml`, `Stats_Weapons_Ranged.xml`, bâtiments électriques et de défense ; classes `VerbUtility`, `Projectile_Explosive`, `StunHandler`, `CompStunnable` et réseau électrique. Références et décompilations privées : `tmp/emp-v273-reference/SUMMARY.md`. Aucune source propriétaire intégrée au produit.

- **75 acier + 8 composants**, **Artisanat 4**, recherche **Microélectronique** ; Armurerie ne conditionne pas cette recette.
- Usinage alimenté, travail **30 000 Core**, adapté en **3 000 ticks locaux neutres** avant vitesse et environnement. Facture, collecte, ouvrage inachevé lié à son auteur, progression, qualité, interruption et dépôt utilisent le pipeline d’armes existant.
- **100 PV**, **3,4 kg**, inflammabilité **0,5**. Valeur normale avant qualité/état/arrondi : **506,5**, dérivée des ingrédients et du travail (`75×1,9 + 8×32 + 30 000×0,0036`), selon la formule primaire déjà documentée dans [V207](../research/defensive-cover-core-v207.md). Le XML ne donne aucun prix fixe explicite. Les prix de transaction suivent le commerce existant ; aucune apparition supplémentaire dans les stocks historiques n’est ajoutée.
- L’arme garde les sept qualités usuelles pendant transport, équipement et dépôt. Sa forme tubulaire et ses anneaux bleus sont propres au lanceur, avec une pose d’arme longue ; le modèle commun sert au sol, à la cargaison et au personnage.

## Tir et conséquences

Portée **23,9**, préparation et récupération **210 ticks Core** chacune ; projectile physique de vitesse **0,4 case/Core**, dispersion forcée de rayon **1,9**, réduite à courte distance. L’onde de rayon **1,1** apparaît à l’impact réel, y compris contre un obstacle. Aucun dégât balistique préalable, incendie ou munition consommable n’est inventé.

L’EMP ne cause pas directement de blessure ni de saignement. Les humains et animaux ordinaires ne sont pas étourdis par cet effet. Sur les mécanoïdes mobiles, qualité normale : **1 500 Core** d’étourdissement, avec **2 200 Core** d’adaptation ouverte dès le premier impact. Un impact pendant cette adaptation ne prolonge aucun des deux compteurs. Les durées selon qualité sont **1 350 / 1 500 / 1 500 / 1 500 / 1 500 / 1 860 / 2 250 Core** ; la qualité légendaire peut donc dépasser la fenêtre d’adaptation.

Les mini-tourelles, générateurs bois/solaire/éolien et batteries livrés sont sensibles à l’EMP sans adaptation mécanique. Leurs interruptions peuvent être prolongées par un nouvel impact. Une batterie conserve son énergie ; l’EMP suspend sa contribution utile et sa recharge, sans la vidanger. Les autres consommateurs ne deviennent pas tous sensibles par simple appartenance au réseau.

Lisière conserve **10 Core par tick local**, les arêtes physiques déjà engagées et les reprises sauvegardées. Le domaine porte sur les mécanoïdes et équipements existants ; boucliers, implants cérébraux et systèmes Biotech restent absents. Le ciblage conserve les commandes réellement livrées, sans prétendre couvrir toutes les variantes de `Verb_Shoot` Core.

La dispersion suit les seuils de distance² **9 / 25 / 49** et les facteurs **0 / 0,5 / 0,8 / 1**. Le centre tiré reprend la précision et le couvert ordinaires ; sinon le tir utilise la cellule dispersée et les drapeaux d’interception Core. La distribution radiale est identique, avec un ordre local stable des cellules à distance égale : aucune parité des tirages C#/Lisière n’est revendiquée. Le projectile conserve la présentation droite existante ; l’arche graphique Core n’est pas reproduite. Les sons de tir et d’explosion sont partagés, sans nouvel enregistrement spécifique EMP.

La neutralisation suspend aussi la récupération d’un coup mécanique déjà engagé ; un compteur Core sauvegardé empêche un second paiement au même passage. Le stun de mêlée historique de 45 Core reste inchangé. Une batterie désinstallée garde sa charge et son horloge EMP jusqu’à expiration. Nuance du réseau Core : la réserve apparente et la charge excluent les batteries EMP, mais si une autre réserve rend le prélèvement possible, la redistribution effective peut encore les prélever. L’inspection signale la neutralisation sans inventer une immunité absolue à cette redistribution.

Le ciblage manuel conserve les cibles vivantes existantes ; le tir sur une cellule vide et l’attaque manuelle d’un appareil ne sont pas encore des commandes livrées. Les appareils peuvent être atteints par interception ou par l’onde. La chasse automatique exclut cette arme inoffensive contre les animaux.

## Validation

**179 cas uniques dans 25 fichiers passent par reprises ciblées, dont 42 nouveaux cas EMP dans cinq fichiers.** Ils couvrent fabrication physique, consommation exacte, équipement/dépôt, dispersion/impact, neutralisation/adaptation, reprise d’arête et de préparation/récupération mécanique, décès, horloges strictes, resynchronisation, batteries/générateurs/tourelles et les anciennes armes. Les **62 sauvegardes publiques** restent chargeables et inchangées ; aucun payload ou fichier de métadonnées public n’est modifié.

Le groupe initial passe 174 cas sur 179 en **66,198 s**. Les cinq rouges viennent des fixtures : phase d’assaut forcée avant le délai, surplus d’acier initial oublié, corruption rejetée plus tôt par la forme, et habitat vide pour la proie. Reprise des quatre fichiers : 31/32 passent en **10,470 s** ; ajout de la plante nécessaire à l’habitat, puis le fichier restant passe ses cinq cas en **4,695 s**. Aucun changement produit n’a été nécessaire après ce groupe. Le premier typage échoue sur le type d’un schéma historique de fixture (**6,555 s**), corrigé par assertion de type ; reprise **4,462 s**, puis **build/typage final 6,857 s**, passent.

Chromium matériel **WebGPU**, parcours préparé de trois colons et une cible mécanique sans mandat de raid : visée par l’interface, sauvegarde/rechargement au tick **3000**, tirs ordinaires réellement joués à 6× jusqu’à une EMP admise, inspection de la neutralisation, seconde sauvegarde/reprise exacte au tick **3235**, puis expiration et continuation au tick **3455**. Santé mécanique intacte et erreurs navigateur vides ; scénario réussi en **27,075 s**. Captures et rapport privés : `tmp/emp-v273-native-reprise-pIw1qA`. Le premier parcours reste rouge (**50,725 s**) après l’impact réel : le script tentait de démobiliser un tireur sans le resélectionner après chargement. Sa reprise distincte corrige uniquement cette interaction du banc ; anciennes captures et rapport restent conservés.

ROOT seul a exécuté les contrôles séquentiels via `validate:logged` ; journaux sous `tmp/validation-runs/v273-*`. Navigateurs et serveurs possédés 5304/5305 fermés. Pas de campagne longue, de nouveau test de perte GPU ou de gain FPS déduit de ce parcours ciblé.
