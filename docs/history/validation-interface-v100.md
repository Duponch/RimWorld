# Validation de l’interface V100

25 septembre 2026, mode jour. Refonte fondée sur la capture utilisateur, contenu d’exemple non adopté comme règle. [Contrat visuel](../development/visual-identity.md). Schéma 91, catalogue, simulation, sauvegardes et scénarios conservés.

## Livré

Palette crème/forêt/miel, titres et valeurs hiérarchisés, vrais boutons délimités, ressources sans support, barre inférieure proportionnée. Fiches case et dossiers humains/animaux, Travail, Horaires, Affectations, Faune, Architecte, Recherche, historique, menus de création/chargement et commerce harmonisés. Atlas PNG et curseurs existants réutilisés. Les données de pièce sont repliables dans une fiche de case et déplacées vers Besoins pour le colon. Les activations historiques ne recouvrent plus les alertes.

## Validation

- 14 contrôles distincts passent dans `colonist-inspector`, `animal-inspector-v99`, `trade-presentation`, `architect-icons`, `site-presentation` ; les trois de géométrie ont été rejoués après la correction décrite ci-dessous. Typage et build passent. Avertissement préexistant sur la taille des bundles conservé.
- [Parcours natif de présentation](../../artifacts/interface-v100-native.json), [pilote](../../scripts/interface-native-v100.mjs) : 34 relevés de géométrie aux résolutions 1366×768, 1440×1000 et 1920×1080 ; huit panneaux, cinq onglets humains, Santé animale, fiche de case, accueil/scénario/narrateur/site/chargement. Ressources transparentes de 216 px, pas de débordement horizontal des panneaux, priorités alignées, boutons Copier/Coller sans chevauchement, Architecte stable entre quatre catégories. Vérification explicite du rattachement du contexte de pièce à Besoins. Captures relues visuellement.
- [Neuf interactions natives](../../artifacts/interaction-native-v100.json) réussies : animal/Santé/chasse, double clic, rectangle/Maj, mobilisation/R, chemin, attaque contextuelle, perspective, animal en mouvement, barre de travail/pause/dézoom. Le pilote V99 accepte désormais `VALIDATION_VERSION` pour préserver les preuves précédentes.
- [Commerce natif](../../artifacts/trade-ui-v100.json) réussi en 29,1 s : contact réel, panier, achat du fusil, argent conservé, équipement et restauration des propriétaires. Dialogue relu sur capture ; schéma et transaction inchangés.
- Chromium visible avec GPU matériel, sources servies gelées ; aucun incident JS/GPU dans ces deux parcours. CPU de validation et navigateur exécutés successivement. Aucune simulation de plusieurs jours : aucun contrat temporel modifié.

## Corrections et traces de reprise

Les deux premiers démarrages natifs ont échoué sur le nom accessible des boutons : une flèche CSS ajoutait un caractère au libellé attendu. La décoration a été retirée et le focus programmatique du titre n’affiche plus un cadre de contrôle. [Premier arrêt](../../artifacts/interface-v100-native-initial.json), [second arrêt](../../artifacts/interface-v100-native-arrow.json). Le pilote attend aussi le catalogue et le décodage des atlas avant la capture.

La première revue visuelle a conduit à corriger les sélecteurs de priorité, la place Copier/Coller, les couleurs des horaires et l’espace pris par le résumé/les actions. Les passes intermédiaires restent [distinctes](../../artifacts/interface-v100-native-first-pass.json) de la [seconde passe](../../artifacts/interface-v100-native-second-pass.json). Un test de topologie seul n’avait pas détecté le contexte créé tardivement dans le résumé ; le parcours natif vérifie désormais son parent réel. Aucune assertion métier supprimée.

Le contrôle de géométrie a révélé deux collisions préexistantes : capuche et fusil partageaient le tag `dye=-4` (216 sommets au lieu de 180 pour le fusil), puis cargaison de fusil/vêtement partageait 31 (252 au lieu de 180). Capuche -6 et cargaisons fusil/couteau 70/71 sont désormais disjoints ; les tests gardent les comptes exacts et vérifient les domaines. Les shaders et géométries utilisent les mêmes constantes. Aucun équipement physique ni donnée persistée modifié.

## Coût et limites

Contrôle court final, colonie préparée de 12 habitants, 1440×1000, fiche de case ouverte, vitesse 6× : **1263 images**, médiane **4.20 ms**, p95 **8.40 ms**, maximum **20.80 ms**, débit observé **6.027×**. C’est une fenêtre de six secondes après stabilisation, pas un comparatif causal ni une garantie de 240 FPS, de grandes colonies ou de toute la carte. Les précédents audits lourds restent les références et leurs limites restent ouvertes.

Les tableaux de douze ou cent personnes demandent toujours un défilement vertical ; le défilement horizontal est évité aux résolutions vérifiées. Les très petites fenêtres et tous les états rares ne sont pas certifiés. Aucun nouveau contenu, système de simulation ou pourcentage fonctionnel ajouté.

## Publication et jalons

Netlify production `6ab5a9a7e4d26356179e4f23`, état ready, 30 fichiers. [Contrôle public complet](../../artifacts/netlify-smoke-v100.json) réussi : vrai départ à trois personnes, huit curseurs sémantiques exercés, sauvegarde et reprise à froid, 60 pictogrammes, deux fontes, sept illustrations HTTP 200, tableaux sans débordement. [Contrôle du bundle exact](../../artifacts/interaction-public-v100.json) : `game-CHUL6wPE.js`, ressources transparentes et barre crème vérifiées sur le site, dossier animal et mobilisation réellement cliqués. Aucune erreur console/GPU. [Identifiant de livraison](../../artifacts/netlify-v100.json).

G0 en consolidation ; G1, G2, G3 partiels ; G4 engagé ; G5 absent. Aucun jalon global clos. Recherche de style : capture utilisateur et contrats existants ; implémentation en trois fronts attribués ; corrections de revue et validation centrale groupées. Aucun nouvel audit des règles RimWorld nécessaire, puisqu’elles ne changent pas. ROADMAP reste le seul calendrier.
