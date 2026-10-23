# Apprentissage des premiers gestes — référence V470

Recherche du23octobre2026, Core local **1.6.4871 rev590**. La [publication officielle du12octobre](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) situe1.7sur la branche unstable et maintient1.6sur la branche principale. L’[annonce Alpha15 de2016](https://ludeon.com/blog/2016/08/alpha-15-tutorial-and-drugs-released/) distingue historiquement tutoriel dirigé et aide reconnaissant les interactions ; ses règles ne sont pas traitées comme actuelles.

La fermeture primaire actuelle est conservée dans [le relevé privé](../../tmp/guidance-v470/primary-closure.md) :13types nommés, trois XML directement concernés, version/DLL/outil identiques avant/après. DLL SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a` ; ILSpyCmd8.2 SHA256 `c1635be8deba8b374b43863fe843950460f9860989decff3e522afab35d30904`. Aucun code, texte ou asset propriétaire n’est intégré au produit.

Le corpus utilisateur, [chapitre8](../reference/originals/Documentation_developpement.html#chap-08), distingue sélection/interface et effet logique de commande, refus expliqués et modes explicites. Chapitres9–12 : travail/logistique/production restent physiques et distincts des intentions. Les identifiants de ces domaines ne sont pas clos par une aide à quatre gestes.

## Règles établies

`PlayerKnowledgeDatabase` est statique, hors Game/World, et possède des valeurs par notion dans **Config/Knowledge.xml**. Une notion absente commence à zéro. Des signaux d’interaction/lecture peuvent augmenter cette connaissance ; le bouton explicite **MarkLearned** la marque connue. Ouvrir une fiche LearningReadout ne démontre pas à lui seul que son texte a été lu.

Le contexte de leçon est un autre propriétaire : Game.Tutor expose sa leçon, son readout et l’état du tutoriel dans la partie. Après chargement, LearningReadout retire les notions devenues connues dans la base globale du joueur. Recharger une ancienne partie ne rembobine donc pas nécessairement les connaissances du joueur. Hors TutorialMode, la voie AllowAction ne bloque pas les commandes ordinaires.

L’API native distingue plusieurs crédits fractionnaires et des notes qui enseignent ou créditent leur fermeture. Ce petit lot ne reproduit ni ces coefficients, ni la décroissance, les occasions adaptatives, la cadence d’affichage ou le tutoriel dirigé entier. Les appelants natifs exacts de chacun des quatre gestes locaux ne sont pas inventoriés : leur raccord local est une adaptation, pas une équivalence exhaustive revendiquée.

## Décision locale

**Adopter** la séparation entre connaissances du joueur et état physique du monde, l’interaction reconnue et la déclaration explicite. Un refus, un simple clic de raccourci, un plan préexistant ou le chargement d’une partie ne valide rien.

**Adapter** à quatre notions binaires : changer une priorité positive pour un colon libre vivant, tracer une réserve avec des cases effectivement acceptées, poser un couchage humain au sol immédiat, tracer une zone de culture avec des cases acceptées. La confirmation de la vraie commande prouve le geste d’interface. Elle ne prouve ni transport, sommeil, semis, récolte, abri ou autonomie alimentaire. La déclaration « Je connais déjà ce geste » porte une origine distincte.

La mémoire version1 est locale à l’origine et au navigateur, partagée entre colonies. Aucun état ni schéma World n’est ajouté ; exporter une partie ne transporte pas cette mémoire. Les anciennes parties ne donnent aucun apprentissage rétroactif. Le parcours est proposé puis activé volontairement ; arrêt, reprise et révision sont explicites. Aucun ordre, ressource ou connaissance de recherche de colonie n’est offert.

**Différer/vérifier** le tutoriel Core complet, les autres notions, la synchronisation entre appareils/onglets et les campagnes durables. La fréquence native complète d’écriture de Knowledge.xml et toutes les occasions de leçons restent hors de cette lecture bornée. [Résultat joueur, contrôles et limites](../gameplay/first-gestures-v470.md).
