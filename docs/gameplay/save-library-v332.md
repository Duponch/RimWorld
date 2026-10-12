# Sauvegardes nommées, rotation et export — V332

## Périmètre

Premier lot de préparation d'une version jouable, après la demande humaine de
passer du prototype à une campagne que l'on peut commencer, conserver et reprendre.
Le format des mondes reste **229**. Aucun fichier de simulation, bridge, rendu ou
colonie publique n'est modifié. Les sous-métiers restent reportés et l'UI papier
reste sur `codex/ui-papier-v317`.

Le menu de partie propose douze copies nommées indépendantes et trois copies
automatiques. La fréquence est commune au menu et aux Options de l'accueil :
désactivée, 1, 3, **5 par défaut**, 10 ou 15 minutes réelles de jeu actif. Pause,
accueil, document caché, remplacement et état fatal empêchent les captures. Les
opérations déjà engagées différèrent la capture, sans rattrapage en rafale. Un
long trou de timer ajoute au maximum deux secondes. Une sauvegarde manuelle ou
nommée réussie remet l'intervalle à zéro ; changer de monde remet l'agenda à zéro.

Créer ne remplace jamais silencieusement une copie nommée. Remplacer ou supprimer
demande une confirmation dans le menu. Les dates distinguent les copies automatiques.
Les deux créneaux historiques manuel/récupération gardent leurs clés et comportements.
Le chargement de toute copie continue d'ouvrir la colonie en pause.

## Conservation et coût

Les nouvelles clés sont fixes : `lisiere.named.v1.1` à `.12` et
`lisiere.auto.v1.1` à `.3`. Chaque record contient nom, date, compteur et checkpoint
raw/gzip existant ; aucun catalogue mutable ni déplacement de copie n'est nécessaire.
La compression précède la transaction. Le choix et l'écriture/suppression se font
dans une transaction IndexedDB unique, avec mise à jour du cache après son succès.
Une confirmation fournit le record textuel exact observé : si un autre onglet l'a changé,
l'opération est refusée avant toute mutation. Le compteur ordonne les autosaves
même si l'horloge système recule ; la date ne sert qu'à l'affichage.

Une structure ou des métadonnées illisibles sont réservées : la rotation choisit
une copie lisible ou un emplacement vide. Une valeur IndexedDB non textuelle dans
un nouveau créneau ne bloque pas les anciennes sauvegardes. Ces valeurs anormales
partagent un marqueur illisible ; il ne distingue pas deux corruptions non textuelles
successives et n'est pas une révision de sauvegarde normale. La lecture superficielle
ne certifie pas l'intégrité d'un payload compressé ou d'un monde : le codec et le
Worker assurent toujours l'admission complète au chargement. Aucun quota n'est
contourné en supprimant d'autres parties. Le repli localStorage reste limité en
capacité et ne garantit pas l'arbitrage entre plusieurs onglets concurrents.

Le scheduler réutilise le timer hôte d'une seconde avec des lectures scalaires.
Il ne parcourt pas le monde à chaque frame. Les captures/compressions/écritures
périodiques ont un coût réel ; ce lot n'annonce aucun gain FPS, coût nul ni 240 FPS.
La liste est bornée à dix-sept entrées, avec métadonnées mises en cache par valeur.

Exporter capture l'état autoritaire courant dans le même verrou de session puis
télécharge un JSON admis par l'import existant, sans écrire dans le dépôt local.
Les sauvegardes sont propres à l'origine du navigateur ; exporter permet de les
transférer et de les garder en dehors du navigateur. Fermer l'onglet n'ajoute pas
de capture asynchrone prétendue fiable : la dernière copie périodique peut précéder
la fermeture. Voir [transactions IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction),
[localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) et
[limites de pagehide](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event).

## Vérifications

ROOT seul exécute les contrôles, sur sources/tests/pilotes figés. Les rapports et
les premiers refus d'accès réseau sont conservés sous `tmp/save-library-v332/`
et `tmp/validation-runs/v332-*`.

| Contrôle | Résultat et preuve |
| --- | --- |
| Groupe storage/session/codec | **72 cas / 4 fichiers PASS, 2,542 s**, `v332-storage-tests-2026-10-12T20-58-26.044Z-7128` : capacité, rotation, horloge reculant, métadonnées refusées, quota, témoins périmés, suppression atomique, export sans écriture, générations, cadence/pause/OFF/retry et ancien dépôt. |
| Typage | **PASS, 10,566 s**, `v332-typecheck-2026-10-12T20-57-52.733Z-7368`. |
| Build Pages | **PASS, 3,107 s**, `v332-pages-build-2026-10-12T20-58-39.366Z-13440`. |
| Chrome natif, dépôt | Trois créations concurrentes par deux connexions choisissent trois emplacements distincts ; un témoin périmé refuse la suppression. Fermeture/réouverture conserve les contenus exacts. |
| Chrome natif, menu | Création/remplacement et suppression avec annulations ; nom rendu comme texte, deux tailles d'écran, export JSON, chargement nommé, redémarrage complet et import du fichier téléchargé : **trois reprises exactes au tick 6**, graine332/carte32. Préférence3min retrouvée. Erreurs console vides. |
| Chrome WebGPU, Les Aulnes | Graine publique sans modification du monde, **8434 → 9937**, ×6 demandé ; une copie réellement capturée après **63,434 s** de jeu actif, puis reprise du monde complet exacte9937 en pause. Erreurs console vides. **PASS, 102,821 s**, `v332-native-aulnes-2026-10-12T21-04-16.046Z-7984`. Aucune mesure de débit réel ×6 ou FPS revendiquée. |
| Gel final | **3079 / 3079 fichiers exacts** ; snapshot `freeze-reprise.json`. Simulation, bridge, rendu et fichiers publics sont inchangés par rapport au produit initial. |
| Documentation | **PASS, 3,070 s**, `v332-docs-runtime-2026-10-12T21-08-54.460Z-20944`, Python du runtime fourni. Le premier appel à l'alias système `python` reste ERROR126/EACCES0,021s ; aucun contrôle documentaire accompli dans cet essai. |

Le groupe natif initial `v332-native-local-2026-10-12T21-02-09.024Z-4144`
reste **FAIL 81,644 s** : les deux premiers parcours passent, le troisième atteint
sa limite de20s pendant la préparation de la grande carte. Le plateau apparaît
ensuite dans la capture, sans message d'erreur produit. Seule cette attente du
pilote passe à90s avant la reprise ciblée ; aucun source produit n'est changé.
Les captures du gestionnaire1440/960 et les traces sont conservées dans
`native-load-timeout/`. Les deux premiers essais réseau n'atteignent pas le jeu :
refus réseau27,763s, puis serveur inaccessible12,968s. ROOT ferme le premier
serveur, relance serveur et Chrome avec l'accès local nécessaire ; ces rouges
restent dans `native-network-denied/` et `native-server-denied/`.

Chrome de test et serveur Vite5405 fermés après les contrôles. Aucun déploiement
individuel pour ce lot : les publications Cloudflare restent regroupées et la
version publique estV331 à cette clôture. La relance planifiée demeurePAUSED.

Ce lot ne certifie pas une campagne naturelle entière, une immunité aux pertes
physiques du disque ou une absence de toute régression du projet. Les prochains
lots concernent le vrai parcours de nouvelle partie, les trois biomes actuels,
l'apprentissage des premiers jours puis une campagne longue et sa progression.
