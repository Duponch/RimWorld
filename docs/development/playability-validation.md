# Détecter les régressions pendant une vraie partie

Retour d’expérience du 15 septembre 2026, après les deux signalements utilisateur sur le minage/abattage puis les vitesses. [Contrat technique](presentation-timing.md), [preuves de réparation](../history/validation-v38-speed-response.md), [choix des tests](testing.md).

## Pourquoi nos contrôles ont laissé passer les défauts

La responsabilité était dans notre stratégie de vérification, pas dans un essai inhabituel du joueur. Désigner une zone et accélérer sont des gestes ordinaires. Les causes suivantes sont appuyées par les tests et les mesures du dépôt :

1. Les scénarios métier contrôlaient principalement l’état autoritaire : cellules atteintes, matériaux produits, réservations et reprise. Ces résultats pouvaient être corrects alors que le rendu utilisait des instants différents pour le corps et la ressource.
2. Les tests de déplacement utilisaient des parcours courts et des vitesses peu variées. Ils n’exerçaient pas assez l’accumulation de retard après plusieurs changements sur une grande zone naturelle.
3. Les audits mesuraient FPS, durée de frame et conservation des buffers. Un FPS élevé ne dit pas si le colon avance régulièrement ni si la pierre disparaît après son animation de travail. Certaines sondes dataient la réception du monde plutôt que son application à la scène.
4. Le premier correctif a ensuite adopté une mauvaise exigence de réactivité. Sur `f70c320`, l’oracle de vitesse attendait explicitement une lecture différée de 400 ms. Un test pouvait donc réussir en confirmant un comportement gênant. C’était une erreur de contrat, pas simplement un test oublié.
5. Le banc natif de zones restait un script de diagnostic avec vérifications facultatives. Son existence ne garantissait pas son exécution avec des assertions lors d’une livraison.

Les captures fixes et le pilote de plusieurs jours apportaient des preuves utiles, mais pas celles de la continuité temporelle. Nous avons donné à ces preuves une portée trop large.

## Changements concrets

- `npm run test:presentation` exécute maintenant le parcours existant de 45 s de minage puis 45 s d’abattage, trois colons sur une carte naturelle 250², vitesses 1×/6×/3× répétées. Les vérifications sont imposées par le lanceur, avec un arrêt après 180 s et démarrage/arrêt du serveur si nécessaire. `npm run check` inclut ce contrôle. Le banc brut vérifie aussi ses résultats par défaut ; un témoin historique nécessite une désactivation explicite.
- Mesurer séparément : réponse de la commande, progression affichée, contact/phase de travail, retrait de ressource, FPS et résultats métier. Le banc observe les poses de présentation et l’application de scène ; lire uniquement `World` ne valide pas le rendu.
- Exiger une assertion négative crédible : le test doit refuser le défaut connu. Le test de métriques exécute les assertions communes contre le témoin archivé à 416–424 ms et exige son refus au budget actuel de 100 ms ; il vérifie aussi les observations manquantes et retraits anticipés. les oracles de taux attendent la demande suivante, sans recopier le délai de l’implémentation. Les scénarios spatiaux/bridge conservent également les cas de jitter, pause, starvation, reprise et retrait anticipé.
- Avant une nouvelle mécanique, écrire ce que le joueur doit constater et les interactions affectées : commande refusée avec motif, trajet, contact, action, conséquence visible, état après pause/rechargement. Vérifier l’oracle contre ce contrat et les sources avant d’ajuster le code. Ne jamais justifier un délai par la seule valeur d’une constante interne.
- Enrichir un parcours existant avec les nouvelles phases. La croissance thermique ajoute une pièce froide, le blocage expliqué des semis, puis un feu construit qui rétablit croissance et semis dans le vrai worker. Une température injectée sert uniquement à l’état initial de cette fixture ; le réchauffement se produit par les règles du jeu.

## Retour complémentaire V42

Le pilote de huit jours a trouvé un générateur construit mais jamais ravitaillé. Le parcours court réussissait en arrivant près de son ancre ; le vrai camp arrivait sur la seconde face de son empreinte 2×2. La route acceptait cette place, mais la livraison vérifiait seulement la distance à l’ancre : le colon gardait sa cargaison sans progresser. Correction sur l’empreinte complète, test de chacune des quatre faces avec reprise pendant le service, puis nouveau parcours des trois cartes. Cette régression a été détectée avant livraison ; un état final « bâtiment construit » aurait été insuffisant. Les bilans doivent demander son fonctionnement et son entretien.

La sonde de l’audit électrique a également été alignée sur `applyWorld` : mesurer `setWorld` ne mesure plus l’application depuis l’introduction de la file de présentation. Les pointes d’image et les changements groupés restent rapportés séparément.

## Fréquence et limites

Le contrôle temporel natif est requis pour horloge, bridge, interpolation, transitions visuelles et changements de cadence. Un nouveau travail physique enrichit d’abord son parcours métier puis le contrôle de synchronisation concerné. Pour une retouche de texte/couleur, une inspection ciblée suffit. Regrouper les tests en fin de lot, sans lancer une partie longue à chaque modification.

Lors d’une livraison, distinguer explicitement **simulation validée**, **parcours navigateur joué**, **présentation observée**, **performances mesurées** et **situations non exercées**. Aucune de ces preuves ne remplace les autres. Un test absent, ignoré ou sans backend attendu ne vaut pas succès. Un scénario périodique ou une mesure conservée dans Git n’est pas automatiquement une protection continue : ce dépôt n’annonce pas de CI matérielle distante.

Cette méthode réduit le risque de refaire la même erreur. Elle ne garantit pas que tous les défauts futurs seront détectés ; un nouveau signalement doit enrichir le contrat et le parcours qui auraient dû le révéler.
