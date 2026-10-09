# Raccords et aperçus de construction — V285

Ce lot corrige la présentation des constructions dans toutes les parties, dont [Les Aulnes intégrées](aulnes-current.md). Le moteur, les coûts, les réservations, les règles de placement et le schéma218 restent inchangés. Les fichiers publics de sauvegarde ne sont pas régénérés.

## Raccords

Les panneaux de mur et leurs chapeaux rejoignent les limites exactes des cases. Les facettes du bois restent à l'intérieur du panneau ; les corniches s'arrêtent contre la maçonnerie. Les dalles couvrent 1×1 et les trois planches couvrent chacune un tiers de case. Leurs côtés communs se touchent sans chevauchement.

Les demi-rails de clôture joignent les poteaux et la frontière commune. Aux angles, ils s'arrêtent aux faces du poteau ; les cadres et les battants fermés des portillons et portes partagent leurs limites. Les animations d'ouverture restent inchangées.

## Traces et surfaces

Le dessus des sols construits est partagé avec leur générateur géométrique : y=.062. Les traces sont posées à .009 au-dessus de leur surface de support. Une trace au bord du plancher est découpée entre ses surfaces, en conservant le centre, l'angle, le motif et les UV. Sur une surface uniforme, chaque couche conserve un seul plan dans le même lot de dessin.

La pose ou le retrait d'un sol sous une trace déjà présente invalide sa présentation. Seules les cellules sous les traces sont examinées ; une modification éloignée ne provoque pas d'upload des traces. Les six espèces de salissure suivent le même chemin.

La hauteur ancienne .071 était déjà supérieure au dessus du plancher .062 : ce lot ne présente donc pas la hauteur uniforme comme une attribution certaine du masquage rapporté. La visibilité sur les sols est vérifiée directement dans le navigateur, avec une planche privée de spécimens.

## Fantômes

Avant de placer une construction, l'objet translucide remplace la coloration de case. Il reprend les générateurs du modèle final : meubles, machines, portes, clôtures, murs bois ou minéraux, pales d'éolienne, tête de tourelle, sols et toits. Q/E actualise immédiatement les objets orientables ; les orientations automatiques suivent les voisins et les mêmes contraintes que la commande réelle.

Les matières et les empreintes sont conservées lors d'une réinstallation. Le fantôme devient rouge si le placement est refusé. Les tracés de murs, clôtures, câbles et surfaces montrent chaque élément, avec les voisins réels et ceux du tracé. Les grandes lignes partagent une capture du modèle au lieu de reconstruire le contexte pour chaque case.

Sortie du canevas, Échap, annulation, changement de carte ou d'outil masquent l'aperçu. Les allocations et matériaux restent résidents ; l'aperçu ne crée ni chantier, ni tirage aléatoire, ni objet de simulation. Les plans déjà désignés et les actions de zone conservent leurs marqueurs de suivi.

## Validation

Les contrôles ciblés regroupent65cas dans12fichiers, dont24nouveaux : joints, couverture du catalogue, rotation, installation, tracé250cases, frontières des traces, buffers résidents et restauration de compilation. Tous passent après deux reprises de fixtures ; le typage et le build passent.

Les premières erreurs conservées concernent le typage de l'union des résultats de placement, une ancienne fixture de pot, la dimension hors borne d'un monde de test et les nouveaux agendas présents dans une copie prétendant être de version134. La reprise corrige ces fixtures sans modifier le moteur.

WebGPU matériel AMD : menu public Les Aulnes au tick8434, murs bois/minéraux et sols inspectés, chaise tournée, console, chaise rouge sur une tourelle, ligne partiellement refusée et annulée, puis sol aperçu sans coloration de case. Survol et rotation conservent le monde exact. Un vrai chantier de chaise est ensuite désigné ; sauvegardes/recharges exactes8434 et8537, après103ticks ordinaires à6×. Six types de traces ajoutés à une copie privée de la référence sont importés par l'interface et visibles sur les planchers ; cette planche n'est pas une nouvelle sauvegarde publique.

Le parcours final passe en158,403s, rapport privé `tmp/construction-v285-native-4wGkX6/report.json`, erreurs jeu/réseau vides, navigateur et port5318 fermés. Le premier pilote61,830s arrêté sur un pointeur ne produisant aucun fantôme à la cible invalide est conservé dans `tmp/construction-v285-native-J2Qwd1` ; la reprise centre explicitement cette cible. Le build passe en10,517s. Les63références publiques, leur catalogue et leurs fichiers restent identiques à HEAD V284. Aucun gain FPS, campagne longue ou comparaison GPU n'est annoncé par ce lot.
