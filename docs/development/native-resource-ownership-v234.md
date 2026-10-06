# V234 — réception native et propriété locale des ressources

**Expérience écartée pour son coût, produit V233 conservé.** Schéma 198, moteur,
cadence, qualité et 62 entrées du catalogue inchangés. La [preuve](../history/validation-native-resource-ownership-v234.md)
sépare revue, contrôles natifs, coûts et limites ; la [recherche](../research/native-resource-ownership-v234.md)
décrit les sources primaires. Ce lot ne livre aucun gain de FPS ni objectif de 240 FPS atteint.

Le profil V231 attribuait une partie importante de l'adoption au callback final
sur toutes les ressources. Le prototype privé remplace ce seul parcours par une
vérification exacte d'appartenance des identifiants commerciaux F, les gardes complets des healroots H et
des régimes lumineux G, et les écritures/suppressions K réellement reconstruites.
Namespace, gardes K, ordre des décisions, horloges, reconstructeur et commit
planétaire restent historiques ; aucun parcours N supplémentaire de validation du cycle de vie.

Le mandat est construit par une factory avec URL Worker fixe et décodeur privé,
dont l'association dans le registre WeakMap reste inaccessible au constructeur et
à `adopt` du lecteur standalone. Le canal expose `postMessage`/`terminate` et des
callbacks sélectionnés. Aucun opt-in pour un paquet brut, drapeau de confiance,
décodeur, Worker ou reçu attachable n'est ajouté.
Le client privé utilise `#channel` ; il reprend de V209 les corrélations, les
timeouts au résultat `unknown`, l'ordre snapshot→audio→règlement des demandes et la reprise.

Le message natif est consommé sans second clone ou déduplication. Après tous les
gardes et le commit planétaire, seuls les objets simples Resource/plantLife,
leur tableau et la propriété `World.resources` sont fermés. Valeurs, clés, ordre,
propriétés propres de valeur `undefined`, alias et cycles
restent exacts. Les descendants inconnus et autres champs du World demeurent
mutables. Ce contrat local en lecture seule diffère de celui du standalone historique.

Avant l'inspection du propriétaire, les fonctions natives réellement utilisées pour la
reconstruction et les méthodes planétaires sont recertifiées. Une forme non prise en charge
ou une interposition impose le callback historique et purge le cache à l'adoption
concernée ; seul un checkpoint natif frais peut le réamorcer. Les anciens
records/plantLife déjà fermés restent tels quels. Un refus ou verdict `stale` n'engage aucune
nouvelle fermeture, révision ou publication. Une initialisation de module fiable et
des définitions ESM stables restent des hypothèses explicites, sans sandbox générale.

Le coût complet reste défavorable : deux cycles A/B/B/A natifs sur 64 ticks des
Aulnes donnent **+1,88/+9,28 %** de latence demande→fin du callback partiel ; le
checkpoint froid coûte aussi davantage. La diminution mesurée du callback Nature/index ne
compense pas le reste du parcours, qui inclut prévalidation, fermeture, suivi et réception. Le parcours n'est donc
pas intégré et aucun GAME lourd n'est lancé pour cette piste rejetée.

Les oracles sont distincts des mesures : leurs gros parcours de graphes ne décrivent
ni la consommation de RAM ni le coût du jeu. Le banc de coût inclut clone/livraison natifs,
validation, fermeture et Nature/index, mais exclut le GAME complet/GPU/UI/audio.
Les délais de livraison incluent ordonnancement et distribution des messages ; ils ne mesurent pas
le temps CPU propre d'`adopt`. Construction, préparation, froid et chauffe sont séparés.

La suite utile est un nouveau trajet source→main/render, sans réémission du gros
paquet après adoption main. Le Core Offscreen complet V231 avait déjà régressé
de 13,36 % : son rejet reste acquis. Une distribution directe aux deux destinataires,
avec lecteurs stricts locaux, barrière `APPLIED` sur le thread principal et vraie cadence des dessins, est une autre expérience à
qualifier avant de porter l'hôte GAME. Aucun worker graphique produit n'est acquis.
