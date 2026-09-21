# V93 — refonte de l’interface

Validation du 22 septembre 2026, depuis V92 `3097de9`, sur `main`, mode jour. Schéma du monde **91** inchangé. G0 en consolidation, G1/G2/G3 partiels, G4 engagé, G5 absent : aucun jalon global clos. Les estimations demeurent dans [ROADMAP](../ROADMAP.md#estimation-davancement).

## Changements livrés

- Nouveau thème ivoire/forêt, Source Sans 3 et Literata embarquées, cadres géométriques sans étirement d’image, contrôles et défilement assortis. Les illustrations originales sont conservées. La référence fournie a été abandonnée comme modèle de cadres à la demande de l’utilisateur ; ce thème ne revendique pas une reproduction pixel pour pixel.
- Architecte : trois zones stables, options séparées, **60 pictogrammes PNG originaux** dans deux atlas et **neuf curseurs** rasterisés une fois depuis l’atlas existant. Les caractères décoratifs des outils, passions et marques de menus concernés sont remplacés par des images.
- Dossiers : résumé et actions fixes, pages plus hautes, compétences et traits repliables, soins/propreté/sépulture dans Santé. Une seule zone défile pour le contenu. Ressources compactes pendant l’inspection ou la gestion, boutons et légendes contrastés, barre inférieure unifiée.
- Correction de sélection : un fauteuil choisit le tissu quand le matériau précédent n’est pas compatible ; aucun appel de recette bois inexistante. Coûts et catalogue physique inchangés.
- Compression sans perte des grandes sauvegardes navigateur et chargement des anciens JSON. Voir le [contrat de stockage](../development/save-storage.md), distinct du schéma du monde.

[Identité visuelle et dimensions des assets](../development/visual-identity.md). Ce lot n’ajoute ni objet physique, ni recette, ni boucle de simulation. Les systèmes et contenus V91 restent disponibles ; monde, quêtes, audio et les autres lacunes recensées ne sont pas livrés par une nouvelle présentation.

## Contrôles regroupés

| Contrôle | Résultat |
|---|---|
| Pictogrammes, dossiers, matériaux/curseurs | **9/9**, trois fichiers ; 60 correspondances exhaustives, fichiers PNG RGBA et transitions valides entre les outils |
| Codec et session | **10/10**, deux fichiers ; identité exacte, données anciennes, métadonnées, enveloppes invalides, refus, concurrence et récupération conservée |
| Typage et build | Réussis ; production Vite, 503 modules. Avertissement de gros bundle conservé |
| Parcours natif principal | **Réussi, 54,0 s** : nouvelle partie 250², cinq dossiers, trois résolutions, toutes catégories/outils, neuf curseurs, menus, clavier, clic droit réel, sauvegarde/rechargement exact et restauration après rechargement de page |
| Commerce natif | **Réussi, 26,0 s** : ancien JSON brut d’une situation préparée, approche/contact réel et dialogue borné à 1280×720. Aucune campagne naturelle ni vente nouvelle prétendue |
| Netlify public | **Réussi** : HTTP 200, vraie création, trois colons, cinq dossiers, sauvegarde/rechargement, deux créneaux et chargement après rechargement de page, 60 pictogrammes, deux fontes et six illustrations disponibles ; aucune erreur JS/GPU |

Les deux tests Chromium utilisent le GPU natif, sans paramètres SwiftShader. Toutes les sources servies restent gelées pendant le parcours ; les tests et mesures lourds ne se chevauchent pas. Les 19 contrôles courts ont été exécutés en deux groupes sur fichiers attribués, puis l’intégration et le build ont été vérifiés au centre. Pas de campagne annuelle : aucune règle temporelle n’a changé.

Les bornes observées à **1280×720**, **1440×1000** et **1920×1080** conservent dossier, ressources, alertes, horloge et navigation sans chevauchement. La zone de contenu du dossier mesure au moins **204,58 px** à 720p, au-dessus du seuil de 190 px conservé. Architecte garde son emprise à travers les catégories et outils ; le matériau et son sélecteur sont aussi inspectés à 720p. Les captures de menus, dossiers, Architecte, régimes et commerce ont été examinées visuellement. Les captures locales `artifacts/interface-v93-*.png` restent régénérables et ignorées par Git.

Rapports : [parcours principal](../../artifacts/interface-native-v93.json), [commerce](../../artifacts/interface-trade-v93.json). Le pilote historique `scenario-start.spec.ts` lit désormais les sauvegardes via le codec et attend le compteur FPS masqué à l’accueil ; cette longue campagne historique n’a pas été rejouée. Les contrats de chargement actuels sont vérifiés dans le parcours V93 et les tests de session.

Déploiement public `6ab1c36292a59ae7250a0ab8`, état `ready`, 21 fichiers, sur [Lisière](https://lisiere-duponch.netlify.app). [Manifeste de déploiement](../../artifacts/netlify-v93.json), [contrôle du site publié](../../artifacts/netlify-smoke-v93.json). Le build de production n’expose pas le diagnostic de test `window.__lisiere`.

## Échecs conservés et corrections

- Les premières dispositions donnaient trop peu de hauteur au dossier. Le résumé a été borné, les actions regroupées et les détails déplacés dans les pages ; le seuil de lisibilité n’a pas été réduit. Un chevauchement de sept pixels ressources/Architecte à 720p a ensuite été retiré et une assertion de séparation ajoutée.
- La sélection du fauteuil révélait un matériau bois invalide et une erreur `ingredients`. La sélection par défaut suit désormais les matières réellement autorisées. [Premier rapport](../../artifacts/interface-native-v93-initial.json).
- Le checkpoint 250² au tick 291 dépassait le quota local avec **5 518 819 octets**. L’enveloppe compressée occupe **506 817 caractères**, deux slots **1 013 634**, avec identité exacte après décompression. La récupération n’a pas été supprimée pour libérer de la place. [Échec quota](../../artifacts/interface-native-v93-quota.json).
- Le premier pilote de chargement à froid omettait de choisir le créneau et attendait un bouton normalement désactivé. Le pilote coche maintenant le vrai choix ; aucune règle d’interface n’a été contournée. Le rapport intermédiaire est [conservé](../../artifacts/interface-native-v93-pilot.json) ; la dernière passe complète réussit.

## Mesure et limites

Sur le départ 250×250 à trois colons, pendant une fenêtre de huit secondes avec vitesse 6× demandée : **983 images**, intervalle p95 **16,7 ms**, maximum **41,6 ms**, débit observé **5,61×**. Le débit inclut le coût d’observation et de pause du pilote ; cette fenêtre courte n’est ni une garantie de 6× ni un comparatif causal avec V92. Aucun nouvel audit à cent colons n’a été exécuté : les limites de charge V91/V92 restent ouvertes.

La compatibilité mobile, tous les navigateurs, toutes les polices système et la diversité complète des portraits ne sont pas certifiées. Les menus utilisent le sélecteur personnalisable du Chromium testé avec un repli CSS ; les pictogrammes restent des images décoratives attachées à des commandes nommées. Le fond planétaire reste 1672×941, sans revendication 4K.
