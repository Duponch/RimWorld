# Matériaux de construction — vérification du 15 septembre 2026

Périmètre RimWorld Core, référence éditoriale PC 1.6. Relecture du corpus : chapitre 10, **SYS/TEST-056, 058, 059**, **UI-019, 020, 024**. Adopter plans, livraisons quantitatives, choix du matériau et conservation de l’objet réinstallé. Adapter représentation 3D et pas de temps. Réparation (057), remplacement (060), qualité, compétences et recherches restent différés. UI-020 ne signifie pas que tous nos bâtiments possèdent déjà un outil de tracé.

## Sources recoupées et limites

Pages communautaires relues : [lit](https://rimworldwiki.com/wiki/Bed), [mur](https://rimworldwiki.com/wiki/Wall), [table 1×2](https://rimworldwiki.com/wiki/Table_(1x2)), [tabouret](https://rimworldwiki.com/wiki/Stool), [piquet de fers à cheval](https://rimworldwiki.com/wiki/Horseshoes_pin), [feu de camp](https://rimworldwiki.com/wiki/Campfire), [bois](https://rimworldwiki.com/wiki/Wood), [acier](https://rimworldwiki.com/wiki/Steel). Le matériau modifie le travail de construction : facteur bois 0,7 ; acier 1. Le feu a un coût fixe en bois et ne reçoit pas ce facteur de matériau substituable.

| Bâtiment | Quantité de matériau | Travail Core de base | Travail local bois / acier |
|---|---:|---:|---:|
| Mur | 5 | 135 | 10 / 14 |
| Lit simple | 45 | 800 | 56 / 80 |
| Table 1×2 | 28 | 750 | 53 / 75 |
| Tabouret | 25 | 450 | 32 / 45 |
| Piquet | 10 | 100 | 7 / 10 |
| Feu de camp | 20 bois fixes | 200 | 20 / interdit |

Le lit en bois ou acier de qualité normale possède le même repos de base (1) et confort (0,75). Cela ne dispense pas de futurs modificateurs de qualité. Les lits en pierre, hors jade, ont une efficacité de repos différente : **ne pas activer ces variantes par simple changement de couleur**. La recherche Complex furniture est normalement requise pour le lit. Le camp local conserve provisoirement ces constructions disponibles ; aucune recherche accomplie fictivement n’est ajoutée à la sauvegarde.

Le miroir inspectable [ThingDef](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/ThingDef.cs), commit du 20 mai 2026, distingue `costList`, `costStuffCount` et catégories de matériaux admissibles. Il corrobore la séparation des ingrédients fixes et du matériau substituable ; il ne certifie pas les chiffres du tableau. L’assembly exact reste inconnu. Les originaux HTML/PDF sont un même rapport, pas deux sources indépendantes. Confiance élevée sur les quantités courantes et le choix bois/acier, moyenne sur la parité numérique complète sans export de définitions 1.6 résolues.

L’[atelier de taille](https://rimworldwiki.com/wiki/Stonecutter%27s_table) exige **75 unités de matériau admissible + 30 acier**. Le matériau et un ingrédient fixe peuvent donc être identiques ; le prochain lot devra agréger leurs quantités et tester cette limite. Les recettes actuelles V30 restent à un seul ingrédient chacune : la liste d’exigences prépare cette dépendance, sans prétendre qu’un atelier mixte est déjà livré.

## Corrections et adaptations retenues

- Les **nouveaux lits coûtent 45 unités**, contre 8 dans la calibration historique locale. Les nouveaux murs adoptent également leur durée de référence. Le pilote doit collecter davantage, sans ajout gratuit au stock initial.
- Le temps est ramené aux ticks locaux : travail Core arrondi après facteur, puis plafond de la division par dix. Compétence et vitesse de construction restent neutres ; échecs, XP et qualité ne sont pas simulés.
- Les anciens objets/chantiers sans matériau gardent leur recette historique pour ne créer ni perdre de matière. C’est une compatibilité locale explicite, pas une règle de RimWorld. Un nouvel ordre dans une ancienne partie utilise les règles actuelles.
- La récupération conserve le type et l’arrondi probabiliste de moitié déjà vérifié dans [déconstruction](deconstruction-reference.md). Un lit actuel rend donc 22 ou 23 unités de son matériau. L’absence de place ou d’ID diffère le retrait, sans consommer le tirage.
- Les pièces en acier ont une teinte distincte dans les lots graphiques existants ; l’emballage reste une caisse, avec bande indiquant le matériau. Pas de nouveaux draw calls imposés par une variante. Santé, inflammabilité, beauté et valeur restent absentes : l’acier de référence n’est notamment **pas ignifuge**.
