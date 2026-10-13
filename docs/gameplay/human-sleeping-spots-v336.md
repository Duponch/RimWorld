# V336 — couchages humains au sol et première nuit

13 octobre 2026. Schéma232. Un emplacement humain gratuit ferme un manque de préparation du camp : le sommeil libre au sol existait déjà, mais le joueur ne pouvait pas choisir et attribuer ces places dans son abri.

## Contrat joueur

Architecte > Meubles propose **Couchage au sol**, une place1×2 orientable. La pose et le retrait sont immédiats ; aucune ressource, aucun chantier, aucune qualité, aucun PV et aucun meuble emballé ne sont créés. La marque reste traversable. Le joueur affecte un colon et peut choisir le rôle médical ou prisonnier avec les mêmes contrôles que les lits simples. Le rôle prisonnier nécessite toujours une pièce réellement fermée pour la capture ; un emplacement ne crée ni abri, ni toit, ni chauffage.

Le colon rejoint la tête attribuée par son trajet ordinaire, réserve réellement la place, s’allonge au sol et récupère son repos. L’emplacement ne simule pas un matelas : taux de récupération80% du taux de référence, confort plafond40%, sans bonus de chevet/commode. Guérison additionnelle0/jour, multiplicateur d’immunité1 et facteur de chirurgie0,7 ; les soins, secours et repas servis restent physiques. Les lits historiques gardent leur arithmétique et les lits doubles leurs deux places.

La pose valide les deux cellules avant allocation : limites, sol praticable, rochers/arbres, ouvrages et plans incompatibles. Le retrait prévalide les restitutions portées avant d’interrompre les dormeurs et services concernés ; le travail sans rapport d’un propriétaire civil continue. Les IDs, possessions, réservations et propriétaires des autres objets restent ceux de la campagne.

Le repos médical attend aussi la fin de l’arête de déplacement. La mort libère l’affectation du nouvel emplacement et conserve la personne et sa dépouille originales. Une brèche de prison ne déplace pas un patient médical à terre déjà installé : son usage physique demeure sauvegardable, tandis qu’une nouvelle réservation ou un secours doit toujours vérifier l’enceinte.

## Référence et périmètre

Référence locale **Core1.6.4871 rev590** : `Buildings_Furniture.xml`, SleepingSpotBase/SleepingSpot (1×2, WorkToBuild0, Comfort0,4, SurgerySuccessChanceFactor0,7, FloorEmplacement, Standable, sans HP ou coût). `Stats_Building_Special.xml` donne le repli BedRestEffectiveness0,8 et ImmunityGainSpeedFactor1 ; BuildingProperties n’ajoute aucune guérison au spot. ROOT a relu les Defs et recontrôlé l’assembly, SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Sources/extractions privées dans `tmp/early-access-v336/` et références V313 ; aucun code ou asset propriétaire n’est publié.

L’[annonce officielle1.5](https://ludeon.com/blog/2024/03/anomaly-expansion-and-update-1-5-announced/) mentionne les emplacements comme lieux de récupération. L’[annonce Beta19](https://ludeon.com/blog/2018/08/rimworld-beta-19-released/) situe le double couchage au sol ; ce modèle double reste hors de ce lot. Ces annonces ne définissent pas les coefficients ci-dessus.

Bedrolls, double emplacement, préceptes DLC et pensées météorologiques ne sont pas ajoutés. Le Core possède une mémoire SleptOnGround−4/un jour après un sommeil observé, même dans un emplacement gratuit. Cette mémoire n’existait pas non plus pour le sol libre d’Elsewhere : l’écart reste explicite pour un lot d’humeur distinct ; aucun bonus de lit ne la remplace. Les souvenirs existants de chambre/dortoir restent déclenchés après un usage réel.

## Sauvegarde, adoption et rendu

Migration231→232 : validation stricte de l’état ancien, changement de numéro seulement. Aucun emplacement n’est ajouté aux anciennes campagnes. Un futur sleeping-spot dissimulé dans un chantier, un emballage, un stock ou une possession hors carte est refusé. La Structure conserve uniquement identité, tête, orientation, empreinte et rôles autorisés. Save et Decoder vérifient géométrie, affectation exclusive, véritables phases de sommeil et services avant adoption.

La marque, le fantôme et le portrait partagent neuf pièces originales fines, onze pour le symbole médical. Les corps couchés gardent leur empreinte/orientation mais une hauteur0. Le lot mobilier, les matériaux, le LOD et les horloges existants sont réemployés ; aucun nouveau shader, layer ou mise à jour autonome par image. Ce constat architectural n’est pas une mesure d’absence de coût ni une preuve de gainFPS.

## Contrôles ROOT et premières nuits

ROOT seul contrôle sur sources/tests/publics/pilotes gelés. Les tests de services préparés ne remplacent pas les trois nuits naturelles qualifiées ci-dessous.

- Groupe unitaire **194cas/15fichiers**, dont **95nouveaux/4fichiers**, acquis par reprises. Premier groupe189/194 en30,224s ; delta sparse et ancienne migration223 repris, puis ancien186 acquis en5,760s. Domaine final95/95 en10,136s. Aucun assouplissement des gardes : fixtures pré-Fodder/Predator sans permissions futures, attendu explicite de la permission du régime « Repas uniquement » adoptée enV282 et activation explicite du format sparse dans le test. Les rouges et leurs rapports restent conservés dans `tmp/early-access-v336/`.
- Typage complet **PASS11,468s**, après un rouge12,264s d’unions/annotations et de libellé exhaustif. Les statistiques et migrations restent celles contrôlées.
- Corpus **63références/66fichiers PASS60,352s** : migration, export/recharge exacte, vrai tick, snapshot RAW et instantané précédent immuable. Les octets publics restent exacts. L’omission connue de gatherId=undefined reste la seule différence de représentation JSON admise, sur ses chemins historiques précis.
- Entrées gelées : **2853** sources/tests/publics/pilotes. Les changements de préparation du pilote entre contrôles restent identifiés ; aucune mutation d’entrée pendant un contrôle.

Premier parcours natif des trois biomes **482,997s : deux acquis, un rouge**. Tempéré : arrivée30, construction150, sommeil3908 et aube6145 ; personnes18530/18532/18534, couchages18575–18577. Aride : arrivée30, construction87, sommeil observé puis aube6118 ; personnes7809/7811/7813. Quatre recharges exactes par parcours, trois personnes vivantes effectivement endormies puis réveillées, gain de repos observé, dix-neuf murs payés, porte, toit réel et objets transportés dans la réserve ; erreurs navigateur vides. Les deux captures de nuit ont été inspectées. Ce sont des premières nuits, pas des campagnes durables.

Le rouge boréal initial venait du pilote, qui exigeait36cellules sans aucun végétal. Le terrain contient sept emprises compatibles avec les vraies règles en autorisant les plantes basses ; les reprises conservent le même site, climat et graine de carte. Le menu propose une nouvelle équipe à chaque contexte neuf : ses trois personnes sont ensuite conservées pendant leur propre parcours, sans identité commune fictive entre reprises. La reprise suivante révèle un écart de précision au contrôle Node de l’export : longitude Chrome71,34926369396949 contre recalcul Node71,34926369396948, un bit de mantisse. Le contrôle s’arrête avant la recharge : aucune panne de recharge dans le même Chrome n’est démontrée. Rapports et traces des deux rouges sont conservés, sans retirer le contrôle exact de continuation.

Correction ciblée : latitude, longitude et amplitude dérivées admettent seulement `2*Number.EPSILON*max(1,|a|,|b|)`, avec valeurs finies et bornes géographiques conservées. Température moyenne, pluie, dates d’adoption, origine du calendrier, clés et révisions restent exactes. Aucune valeur n’est réécrite ou arrondie dans les sauvegardes. Groupe de précision et départs **45cas/3fichiers PASS9,075s**, dont25nouveaux avec les valeurs natives boréales littérales, un export/rechargement32² complet, refus des données mesurées altérées d’un bit et des coordonnées altérées de2e−11. Le total unitaire acquis devient **239cas/18fichiers**, dont120nouveaux/5fichiers ; gel final2854. Le chemin historique révision1 n’est pas modifié par cette correction.

Reprise boréale **PASS224,691s** après correction du pilote fermant l’inspection avant le clic suivant. Son précédent rouge52,823s avait acquis l’export/recharge d’arrivée mais tenté de cliquer à travers le panneau visible ; aucune suppression de l’assertion de clic réel. Le rouge de précision43,248s et celui du sélecteur de globe35,025s restent aussi archivés. Aucun terrain, besoin, objet, incident ou horloge n’est altéré pour le test.

| Biome et tuile | Graine locale | Arrivée / chantier / sommeil / aube rechargés | Personnes originales | Couchages |
| --- | --- | --- | --- | --- |
| Tempéré0 | 3398550437 | 30 / 150 / 3908 / 6145 | 18530,18532,18534 | 18575–18577 |
| Boréal81 | 562907305 | 29 / 247 / 3959 / 6149 | 9333,9335,9337 | 9372–9374 |
| Aride119 | 663467759 | 30 / 87 / 3950 / 6118 | 7809,7811,7813 | 7848–7850 |

Les **douze recharges** passent exactement. Chaque colon a atteint physiquement sa tête, dormi, gagné plus de60points de repos observés puis repris une activité après l’aube ; les arêtes sont terminées avant le témoin de sommeil. Les abris ont dix-neuf murs, une porte,32cases de toit effectives et du stock réellement occupé. Feu boréal9455 :6501ticks de combustible restants/5499brûlés à l’aube ; refroidisseur aride7938 :24552/5448. Le bois consommé reste physique. Les trois captures de nuit sont inspectées, erreurs navigateur vides. Les parcours tempéré/aride sont acquis avant la seule correction de précision, qui préserve intégralement leurs nombres et le moteur ; le boréal est acquis après. Ce n’est ni une campagne multi-saison, ni une mesure de performance, ni une preuve sur tous les navigateurs.

Clôture de contrôles : présentation commune **Chrome natif PASS129,537s**, minage et abattage sans saut, excès de trajet ni occupation solide détectés. Build Pages avec typage final **PASS15,757s**. Les navigateurs de test et serveurs possédés sont fermés ; aucune session humaine n’est fermée. Le gel final2854 est recontrôlé avant commit. Les publics historiques et les références humaines restent intacts ; seul le portrait original du nouveau couchage est ajouté.

Le pilote naturel utilise le vrai parcours de nouvelle partie250², graine de monde42 et tuiles0(tempérée),81(boréale),119(aride), accessibles dans le globe réel. Les climats et graines locales sont dérivés des tuiles, pas remplacés par les références historiques. Il conserve l’équipe proposée par le menu public, l’arrivée, les besoins, fournitures, règles et incidents. Trois places attribuées, un petit abri payé, vrai toit et stockage ; feu en boréal/refroidissement passif en aride. L’horloge avance normalement jusqu’au coucher puis à l’aube, avec observations de trajet, gain de repos et reprise exacte à plusieurs moments.

## Livraison et suite

Lot destiné au commit/push après ces contrôles, publication Cloudflare regroupée avec la suite ; la production reste V334–V335 jusqu’à cette publication. Prochain lot : expliquer l’absence de colon contrôlable sans mettre fin à une campagne dont les personnes vivent hors carte. Ensuite, qualification plus longue avec renouvellement des ressources, incidents, saisons et recharges. La version reste en développement : ni early access entière, parité exhaustive, compatibilité matérielle universelle ni240FPS certifiés. Relance ACTIVE, poursuite autonome autorisée.
