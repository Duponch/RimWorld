# Les Aulnes : atelier, étagères et tenue de garde — V381

16 octobre 2026 — schéma 242 inchangé. La référence courante des Aulnes évolue depuis son fichier V284 immuable, sans remplacer les parties personnelles. Le village 250×250 conserve ses quatorze colons, Dorian, ses animaux, bâtiments, relations et possessions historiques.

## Ce que le joueur trouve

Deux étagères en bois complètent l’atelier de fabrication au sud : entrées près de124,142, sortie près de130,142 ; poste existant128,139. Une réserve finie de40uranium et une combinaison normale sont déclarées dans le patrimoine préparé. Tao reçoit une politique de garde individuelle et enfile cette première tenue par un vrai ordre, déplacement et contact ; son ancien gilet demeure un objet.

La recherche Recon est la seule connaissance ajoutée à cette préparation. Ses points précédents sont conservés dans le rapport ; Iris est libérée par l’annulation normale de sa recherche, sans XP ni événement de recherche achevée fabriqué. Une facture d’un second exemplaire est ajoutée au poste existant :80plastacier,3composants avancés et10uranium. Les180plastacier et4composants avancés coloniaux au sol suffisent ; les biens du marchand orbital ne sont pas comptés comme ressources de la colonie. Son départ10934 demeure celui du parent.

Le patrimoine n’est pas présenté comme acquis au cours d’une partie naturelle. Les règles d’armure, fabrication et stockage sont celles déjà raccordées et comparées au Core dans [V378](recon-armor-v378.md) et les références de stockage existantes ; cette mise à jour ajoute une colonie de démonstration cohérente, aucune nouvelle règle ou parité Vanilla.

## Préparation et continuation

Le générateur vérifie le SHA du RAW V284 avant migration stricte, clone le monde et refuse une seconde application. Les emplacements doivent être libres, couverts, accessibles et compatibles avec la désignation normale ; aucun ancien stock ou acteur n’est déplacé pour faire de la place. Les étagères commencent vides. Les politiques et factures historiques sont conservées, sauf la politique ciblée de Tao et l’ajout de la nouvelle facture en tête.

Une continuation ordinaire de360ticks,8434→8794, suit la préparation. Tao porte réellement la combinaison à8713 et dix unités d’uranium sont présentes dans un rangement à l’issue. Cultures, cuisine, pharmacie et ateliers poursuivent leurs activités ordinaires. Aucun second exemplaire n’a été fabriqué dans cette fenêtre ; la progression de son ouvrage reste nulle. La reprise du même état sur un tick est exacte.

Le nouveau fichier conserve l’ancien payload V284 et les62autres sauvegardes du catalogue. V284 reçoit une fiche historique distincte ; `aulnes-current` pointe vers V381. Le catalogue atteint sa limite actuelle de64entrées : une prochaine actualisation devra faire évoluer cette limite explicitement, sans effacer les anciennes références.

## Contrôles et limites

Cas ciblé regroupé PASS22,692s : conservation, préparation, libération des réservations, filtres/factures, étagères, validation, sérialisation et Decoder250². Typage toutes sources et trois nouveaux fichiers PASS14,654s, puis PASS15,194s après correction d’import explicite. Première commande Node RED2,119s avant génération : import TypeScript sans extension, résolu sans modifier les règles. Génération privée PASS38,357s ; source et63anciens payloads inchangés.

Chrome/WebGPU PASS45,631s : import réel du fichier250², inspection de la facture, des deux étagères et de Tao équipé ; export intégral et réimport de ce fichier téléchargé exactement au tick8794. Deux captures inspectées ROOT, erreurs[] et aucun incident graphique/simulation. Publication locale du nouveau fichier et du catalogue PASS4,655s,63anciens payloads exacts. Le script est directement exécutable par Node après correction de l’import, sans chargeur privé. Typage final incluant le parcours natif PASS19,600s ; build Pages PASS3,430s et package PASS1,418s. Les67chemins publics de sauvegardes sont identiques dans le package,64fiches conservées ; aucun laboratoire ou source privée embarqué. Sorties sous `tmp/aulnes-v381/`, `tmp/aulnes-v381-generation-jvrIt3/` et `tmp/validation-runs/v381-*`. RAW final SHA `c95c7b6e99a21f521f8fe533a8b4664e758e6dd20fcdeeebf2da3f88531cced8`.

La courte continuation ne prouve ni fabrication du second exemplaire, ni campagne durable, ni débit général ×6. Les anciens résultats FPS sur le checkpoint V284 ne sont pas transposés à ce village modifié. Aucun nouveau calcul par image ou changement du moteur n’est introduit ; le mobilier et les objets ajoutés restent une charge réelle.

Le groupe produit V379–V381 est prêt pour publication commune après commit ; la disponibilité HTTPS sera consignée après sa vérification. Sources et entrées gelées04 :3311chemins, sources servies restées identiques pendant le parcours. L’extension volontaire de la configuration de typage privée a été relevée séparément, sans changement des sources servies.
