# Attribution du coût par image V243

V243 est un diagnostic privé du produit V242 `b92c2fb1`, sans modification de moteur, rendu, schéma198 ou sauvegardes. [Mesures et qualification](../history/validation-frame-uniform-attribution-v243.md).

La fenêtre du vrai jeu conserve Les Aulnes corrigées250², caméra129/122/zoom1,1920×1080/DPR1, qualité complète, UI, son et musique. Le timer historique `gpu.submitRender` garde la propriété de `renderer.render`. Les nouvelles sondes s'installent sur les instances canoniques de `_renderScene`, Scene racine, NodeManager et backend ; aucun prototype ou module Three n'est substitué.

Deux timers grossiers mesurent `_renderScene` et `Scene.updateMatrixWorld`. Les décisions `updateGroup` et requêtes `updateBinding` sont comptées sans timer par binding. Les appels conservent receveur, arguments, retour, exceptions et descripteurs ; les wrappers sont restaurés avant la fermeture du probe historique. Les sous-appels héritent du verdict de fenêtre de leur parent, y compris false. La pile distingue les véritables caméras principale/d'ombre et les autres rendus.

Les métadonnées CPU sont bornées à128 premières identités, les ranges à128 par requête ; les débordements sont déclarés. Les buffers redirigés NodeUniformBuffer restent inconnus, sans nouvelle lecture de getter. Les ranges des NodeUniformsGroup ordinaires sont observées après le backend et avant leur clear par Bindings. Elles ne certifient pas des transferts physiques ou une durée GPU. Les décisions de groupe concernent aussi textures/samplers/storage, pas exclusivement des uniformes.

Les temps sont inclusifs, instrumentés et imbriqués. Ils ne s'additionnent pas ; le RAF du diagnostic n'est pas un gain du produit. Compteurs, WeakMaps, horloges et census borné ajoutent une taxe. Les601 identités de binding dépassent le census conservé ; les128 layouts ne représentent pas toute la scène.

La mesure écarte les matrices comme priorité : environ0,136ms par frame principale avec son ombre. Le rendu principal CPU coûte environ2,695ms, dont0,895ms pour l'ombre et0,139ms pour un autre rendu imbriqué. Les515546 décisions OBJECT motivent une ablation des uniformes globaux, sans démontrer leur coût propre.

La prochaine expérience doit comparer les groupes d'éclairage globaux actuels et un groupe FRAME sur les mêmes vrais dessins, valeurs, phases, qualité et reprise. Three0.186 conserve aussi des refresh FULL pour les matériaux avec outputNode/positionNode : déplacer les uniformes ne supprime pas automatiquement ces parcours. Toute promotion exige exactitude et gain complet mesuré. La réception stricte et les applications de scène restent d'autres coûts substantiels ; les projections et le namespace natif demeurent des designs privés.
