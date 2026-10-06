# V240 — attribution causale de la scène

Diagnostic du produit V233 après la reprise autorisée le 6 octobre. Schéma 198 et contenu inchangés. Les [preuves](../history/validation-scene-causal-phases-v240.md) orientent une refonte du mobilier ; elles ne livrent aucun gain FPS.

Les anciennes sondes d'agenda ordinal ne couvraient pas le nouveau parcours par identifiants. Ce contrôle observe les vraies phases Nature/agenda ID et les déclencheurs déjà capturés par la signature des structures. Les trois modules canoniques instrumentés gardent des inverses RAW entiers, sans lecture supplémentaire de World/Resource, calcul de croissance répété ou timer par plante. Les corps et horloges main/Core/moteur restent ceux du jeu. Les parents et descendants partagent le même observateur ; les durées inclusives ne s'additionnent pas.

Dans la fenêtre réelle, toutes les 163 lectures Nature sont admises par ID : 132 vues et 31 absences de changement, aucun repli ou réamorçage complet. Le coût observé concerne surtout les prévisions, leur préparation et la matérialisation de la vue ; il ne justifie pas de retirer les gardes par supposition. Les phases froides avant arm ne sont pas mesurées.

Trois changements ponctuels de croissance de fleurs déclenchent trois reconstructions de tout le mobilier. La signature enregistre un seul champ changé pour chacun des trois pots distincts. Furniture prend 15,73 ms en moyenne, jusqu'à 21,5 ms ; la génération des placements et leur application au lot contribuent toutes deux au coût. La prochaine refonte doit garder le lot unique, l'ordre des instances, les matrices/couleurs F32, les bornes, les uploads nécessaires et les replis historiques, tout en remplaçant seulement les contributions réellement changées.

La cible proche de 240 FPS à 6× reste ouverte. Les compteurs, timers instrumentés et cette unique fenêtre ne constituent ni un ABBA d'optimisation, ni une preuve de débit GPU exhaustif ou d'écran 240 Hz.
