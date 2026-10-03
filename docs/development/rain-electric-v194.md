# Appareils électriques exposés aux précipitations — V194

Schéma 181. [Recherche Core](../research/rain-electric-core-v194.md), [preuve](../history/validation-rain-electric-v194.md). Ce lot ouvre la protection des appareils par toiture, arrêt physique ou diminution de la charge d'une batterie. Le court-circuit aléatoire d'un réseau, ses grandes explosions et les mécanoïdes restent différés.

## Référence et décision

Core 1.6.4871 distingue le danger des précipitations du ticket Misc ShortCircuit. Le premier examine les bâtiments marqués `shortCircuitInRain` toutes les 97 frontières Core : chance 0,02, puis chance `0,2 × nombre de bâtiments × RainRate`, puis un bâtiment uniforme. La liste comprend les appareils couverts, éteints et les batteries vides. On ne relance pas le choix après un refus. Le toit est testé sur l'ancre. Les traders doivent effectivement être allumés ; une batterie doit avoir strictement plus de 100 Wd. La neige partage RainRate. Les conduits, générateurs, lampes ordinaires, climatiseurs, interrupteurs et portes automatiques ne sont pas de nouveaux candidats.

Les neuf catégories présentes sont batterie, radiateur, cuisinière électrique, atelier de couture électrique, table d'usinage, établi de fabrication, bureau de recherche avancé, multi-analyseur et lampe solaire. Un candidat admis tire une cellule de son emprise et déclenche Flame de rayon 1,9. Aucun vidage du réseau ni prélèvement de 400 Wd n'est ajouté : ce dernier appartient à la mèche d'une batterie déjà en feu.

## Continuation et frontières

`World.rainElectrical` est facultatif : revision 1, `adoptedAt`, `lastCoreTick`, PRNG privé non nul, `discharges`, et dernier contact facultatif `{coreTick,structureId,kind,x,z}`. L'adoption se produit seulement à la reprise effective d'un monde doté de météo, avant son premier nouveau tick. Chargement, pause, migration et tick nul n'ajoutent aucun risque ni tirage rétroactif. La migration valide strictement 180 avant de changer uniquement le numéro en 181 ; les champs futurs sont refusés dans l'ancien schéma.

Chaque tick local balaie ses dix frontières Core et les multiples de 97. Les chances nulles ou certaines ne consomment pas de tirage. Un premier jet refusé ne construit pas de liste de bâtiments. La liste est éphémère et reconstruite seulement après admission du premier jet ; aucun index mutable n'est conservé entre commandes. Les appareils emballés et hors carte sont exclus. Le PRNG métier général, celui de la météo et celui du feu conservent leurs responsabilités ; le tirage d'exposition n'utilise pas leurs flux.

L'admission et le contact utilisent le réseau réconcilié du tick. Le petit effet Flame emprunte le résolveur V87 existant : dégâts Heat 10, emprises dédupliquées, ligne de vue, pertes physiques, chaleur et éventuels feux. C'est une résolution locale immédiate ; elle ne prétend pas reproduire la propagation temporelle générale d'une explosion Core. L'état thermique est réconcilié après destruction, avant les décisions des acteurs. Extinction, réparations et actionnement restent des tâches physiques existantes. Le dernier contact garde l'identité historique même si l'appareil est détruit ; il n'accorde aucun propriétaire ni ressource.

## Présentation et contrôles

L'inspection explique vulnérabilité, ancre protégée ou exposée et activité réelle ; aucun appareil ne s'éteint à distance pour supprimer le risque. Le journal signale seulement une décharge confirmée. Le feu et sa fumée réutilisent les lots GPU résidents, sans nouveau matériau ou traitement par image. Les snapshots valident strictement l'état avant adoption, y compris une modification au même tick.

« Pluie et appareils électriques » est la 44e colonie publique préparée : appareils exposés, sous toit et arrêtés, météo pluvieuse mais aucune décharge préalable. Le parcours observe le contact, les dégâts, les reprises exactes puis la protection, l'extinction et la réparation physiques. Les contrôles ciblés couvrent cadence, tirages, seuil, toit, sélection sans nouveau choix, emballage, propriétaires, migrations, commandes et UI/worker. La mesure isolée collecte/sélection/refus ne couvre pas l'impact Flame ni le tick complet ; la preuve sépare ces limites des résultats acquis.

L'atelier de couture électrique rejoint les connecteurs et les appareils actionnables : réseau et contact physique déterminent effectivement son activité. Les nouveaux champs d'arrêt et ordres correspondants restent refusés dans le schéma 180 avant migration ; une ancienne table sans raccordement ne reçoit pas de courant lors du chargement.

Le premier parcours a révélé une compilation tardive de l'aperçu de zone existant. `AreaPreviewLayer` remplace son allocation au premier glisser par un lot résident préparé dans les deux projections. La croissance conserve matériau, noms d'attributs TSL et identité du mesh ; `geometry.instanceCount` gouverne le compte. L'annulation restaure un aperçu vide sans soumettre un ordre tardif. La préparation temporaire conserve matrices, visibilité, limites et culling, et respecte une intention plus récente. Le parcours final exerce 81 cellules, croissance de capacité 16→128 et annulation, sans nouveau pipeline. Cela déplace une compilation au chargement ; ce n'est ni un gain GPU général ni un coût de rendu nul.
