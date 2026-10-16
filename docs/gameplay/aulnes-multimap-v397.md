# Les Aulnes : aller-retour et revisite — V397

Qualification partielle du16octobre2026, schéma252 inchangé. Le voyage et la persistance sont observés ; le natif reste ROUGE sur le bien-être de trois résidents. Aucun changement produit, nouvelle matière, personne, soin, progression ou trajet offert. V395–V396 restent publiés en a02aa932/produit59780d4f/clôture612b4200 ; pas de publication pour cette QA seule. Les Aulnes publiques V394/tick10733 ne sont pas remplacées par la branche blessée.

## Parcours effectivement joué

Entrée immuable `public/test-saves/v394/les-aulnes-integrees.json`, RAW19bd59c90dfbae4983d04cb6eae95a2eb728cd61b59b19172c37366e7704be47, schéma250/tick10733, quinze personnes/neuf domestiques. Migration252 ordinaire. Le patrimoine préparé V381/V386 reste déclaré ; cette continuation ne lui invente aucune acquisition naturelle.

Les trois fenêtres initiales pause/×1/×6 sont jouées. Au12303, Tao20331 a reçu par Assignations le régime2 permettant les rations, alors que le5 de la colonie les réserve. Un loisir commencé entre repérage et pause empêche son admission : RED104,357s conservé, vrai export12303/SHA639dcd8ff8008572c891441d5413b7790e77ccaf34c4d29a314e5b2dc997d540. Reprise depuis ce seul état, mobilisation/démobilisation UI en pause du seul loisir, stocks/priorités/tick conservés ; aucun sommeil/service/cargo interrompu.

Chargement physique8rations depuis22395/22396 par4+4, première cargaison30829 observée12391 ; départ12824, route existante0→59→65, arrivée14471. Aucun voisin direct n’accepte une carte : quatre océans et la tuile59 montagneuse ; ni planète ni graine rerollée. Le site65 tempéré petites collines est créé au14471,250² comme le foyer ; Tao entre avec son fusil et ses quatre vêtements, puis décharge. Le panneau Monde resté ouvert intercepte le clic d’inspection : RED186,716s conservé, vrai export14500/SHA8f665e33a4b182fb0bcf239dc85bafa99d2e8b71de153f6f7a4fd6ced98675fe. Reprise uniquement14500, fermeture par le vrai bouton, aucun aller rejoué.

Travail local : arbre34051, job51981, Tao au contact14830 ;26bois obtenus. Mur bois134,1 : job52531/cadre payé5bois, contact14942/progress2, ouvrage52539 fini au constat14974. Stock52521 de21bois laissé134,0. Export complet14974 et réimport UI strictement identique des DEUX cartes, puis nouvel export égal. Tao revient au foyer, déchargement constaté16915 ; les quinze personnes ont alors leur propriétaire réel. Caméra et options restituées par gestes ordinaires, puis trois fenêtres foyer pause/×1/×6 avec deux cartes.

Revisite par le même Tao, nouvelle formation avec3rations réelles, arrivée21429 et entrée21461. Vrai export complet21483 avant les assertions finales, RAW9758f629ebdf902a97414c22f7d52d86d807df92a366721db6a7a053cea6713f. L’audit postérieur en lecture seule de CE fichier confirme : même création14471/site65, arbre34051 absent, même mur52539, même pile52521/21bois/position, mêmes cinq pièces20332/20333/20358/20368/26497 chez Tao. Les quinze personnes ont chacune un propriétaire réel unique et restent vivantes ; les neuf domestiques d’origine sont présents. Aucune somme de stocks figée : cuisson, consommation, combustible, usure et autres travaux légitimes ont continué. Le fret général de bois et une économie entière ne sont pas qualifiés.

## Échec significatif conservé

Natif03 RED504,718s à la garde finale d’incapacité : Noé19871, Iris20322 et Rose20349 sont réellement à terre au foyer. La gazelle19905 est devenue manhunter auCore204000 ; sa menace de mêlée est portée par leurs blessures, Noé tombe21184 et Iris21425. Tous restent vivants, blessures et sang conservés, aucun soin ou victoire fabriqués. Ce n’est ni un effacement de personnes ni une perte de persistance, et cela ne rend pas l’essai global vert.

Le garde du pilote ne surveillait continûment que le voyageur et les résumés d’incidents distants ; `CampaignIncident` ne couvre que raid/mechanoid/visitor. La rage animale et l’incapacité distante n’y sont pas remontées. La vérification complète finale a détecté ce vrai danger. Prochaine correction produit prioritaire : alerte navigable hors carte pour ces états, sans terrain/tâches inactifs ni scan par image. La branche21483 n’autorise aucun rejeu favorable10733/12303/14500/14974/16915. Toute éventuelle intervention ultérieure doit partir de son vrai état blessé et préserver les ingestions/cargos engagés.

## Mesures descriptives du parcours

Windows, Ryzen5 3600, Chrome matériel/WebGPU, adaptateur AMD/RDNA1,1440×1000/DPR1, orthographique/span33,92, chambre et diorama activés, ombres60Hz/2048, LOD24/8pixels/milieu12Hz. Fenêtres3s ; source instrumentée uniquement dans le navigateur de test. Aucune lecture/clonage World dans les fenêtres, garde scalaire10Hz identique. Même vue/options du foyer avant/après vérifiée, mais campagne, tâches, météo et population évoluent : pas une causalité isolée du coût de la seconde carte.

| Fenêtre | Ticks | RAF images/s | Vitesse observée | Decoder moyen ms/réception |
| --- | --- | ---: | ---: | ---: |
| home-before-x0 | 10733–10733 | 239.3 | 0.00 | — |
| home-before-x1 | 10736–10754 | 189.7 | 1.00 | 17.45 |
| home-before-x6 | 10794–10905 | 36.5 | 6.11 | 15.47 |
| secondary-two-maps | 14983–15097 | 211.0 | 6.33 | 6.33 |
| home-returned-x0 | 16915–16915 | 240.0 | 0.00 | — |
| home-returned-x1 | 16918–16936 | 162.7 | 1.00 | 18.22 |
| home-returned-x6 | 16977–17090 | 11.5 | 6.09 | 17.04 |

Le décodeur prend15–18ms par réception au foyer dans ces fenêtres ; son coût MAIN s’ajoute à la réception et au rendu. À×6,107–111 réceptions sur environ3s occupent une grande part du thread principal. Le worker rapporte un temps moyen par tick publié, pas tout son coût de simulation/encodage/transfert ; l’inactivité du rendu ne signifie pas simulation gratuite. Le second site peu bâti rend211images/s alors que le foyer revient à11,5 dans sa fenêtre×6 ; cela oriente la suite vers les snapshots/structures et la charge CPU, sans attribuer toute la différence à une cause unique. Le GPU n’est pas chronométré ; RAF n’est pas son temps, la fréquence d’écran n’est pas mesurée et aucune promesse240FPS/×6durable n’en découle.

## Contrôles et suite

Typages12,675/12,486/12,638s. Trois natifs successifs depuis leurs vrais points conservés, aucune préparation rejouée ni règle moteur détendue ; les deux premiers rouges concernent le pilote, le troisième le bien-être réel. Les captures départ/chargement, coupe/cadre et revisite/échec sont inspectées ROOT. Erreursconsole[] dans les rapports, sans annoncer une suite complète verte. Audit final `tmp/aulnes-multimap-v397/final-readonly-audit.json` passe sur identité/persistance seulement, sans simulation ou effacement du rouge. Freeze03/3452chemins exact avant/après ; fichiers natifs/exports/rapports sous `tmp/aulnes-multimap-v397`, résultats sous `tmp/validation-runs`. Pas de build, corpus, présentation ou campagne inchangés rejoués pour cette QA.

[Comparaison des voyages et de la persistance Core](../research/travel-persistence-core-v397.md). Terrain continu non prévu : la formulation « pas encore » était impropre. Elsewhere a un foyer et un seul second site persistant, proche d’un avant-poste ; les camps Vanilla1.6 sont temporaires. Les caravanes multiples, troisième site et abandon ne sont pas acquis.

Clôture documentaire2,157s et diff sans erreur. Lot QA seulement, sans nouveau déploiement ; toute optimisation suivante doit être contrôlée sur ses propres sources figées.
