# Validation de la frénésie alimentaire — V150

## Périmètre livré

Le schéma de sauvegarde passe de **148 à 150**. Après validation stricte de V148, la migration change seulement le numéro : elle ne crée ni crise, aliment, souvenir, personne ou tirage rétroactif. Une nouvelle crise mineure `food-binge` rejoint l'errance triste. Lorsqu'une exposition d'humeur produit une crise dans le petit catalogue local, le choix utilise les poids Core 0,8 et 0,5. Les intensités supérieures se replient toujours sur ce catalogue incomplet ; la probabilité de crise n'est pas 80 %.

Un colon en frénésie perd le contrôle direct et le travail engagé. Il peut choisir un repas alors que sa jauge de faim est pleine, ignore temporairement son régime, rejoint physiquement la pile, réserve une portion, la porte et l'ingère. Sans portion accessible, il erre. Il ne se couche pas volontairement du seul fait de son horaire ; un véritable effondrement de fatigue, une incapacité ou le décès conservent leurs conséquences. L'épisode récupère aléatoirement entre 25 000 et 45 000 ticks Core convertis en cadence locale, puis donne la catharsis existante si le colon vit. Alertes, statut de colon et inspection d'humeur nomment la crise. Aucun nouvel objet, son, dessin ou passage GPU n'est ajouté.

Le [contrat](../development/food-binge-v150.md) précise les réservations, interruptions et limites ; la [recherche Core](../research/food-binge-core-v150.md) distingue les nombres vérifiés des adaptations locales. Aucun trait Gourmand, envie chimique, inventaire personnel, sélection exhaustive de crises ou condition de stock non certifiée n'est ajouté.

## Contrôles exécutés

| Contrôle | Résultat | Ce qu'il établit |
| --- | --- | --- |
| Vitest ciblé crise V150, migration, errance V65 et régimes | 19/19 dans quatre fichiers | Repas physique même rassasié avec régime « Rien », quantité réellement dépensée, continuation identique après sauvegarde, absence de nourriture sans création, sommeil volontaire écarté, prisonnier exclu, borne de récupération et catharsis. Deux graines préparées donnent chacune une des deux crises avec rejeu exact. Les anciennes attentes de texte ont été ajustées au choix pondéré, sans affaiblir leur assertion de rejeu. |
| Migration V148→V150 et ancien casque V148 | 5/5 dans les deux fichiers dédiés | Migration neutre, sauvegarde d'une crise ancienne, refus d'un `food-binge` ou champ futur déclaré V148, validation stricte des quatre champs de la nouvelle crise. |
| Régression hors campagnes longues | 282 fichiers réussis ; 1 224 tests réussis, 1 ignoré | Compatibilité des systèmes existants au moment de la passe. Le dernier contrôle déterministe de tirage a été ajouté après cette passe, puis testé séparément ; aucun code de production n'a changé entre les deux. |
| Chromium : frénésie V150 et errance V65 | 2/2, 1,7 minute au total | Épisode réellement déclenché depuis une exposition préparée, alerte et inspection, repas effectivement consommé, ancienne errance à vitesses 1× et 6×, sauvegardes/reprises et contrôles restaurés. Le navigateur a utilisé le **repli WebGL2**, pas WebGPU ; ce parcours ne mesure pas le GPU. |
| Compilation et présentation | `npm run build` avec typage réussi ; `npm run test:presentation` réussi | Bundle produit ; minage/abattage gardent 0 saut visible et 0 occupation solide dans ce contrôle. La présentation ne constitue pas un banc de la frénésie. |

Les scènes de navigateur et les deux graines de tirage sont **préparées** : elles permettent de vérifier les vraies transitions du moteur après reprise, mais ne mesurent pas la fréquence naturelle dans une longue campagne. La suite `test:regression` exclut les campagnes longues selon la stratégie du dépôt ; celles-ci ne sont pas annoncées vertes ici. Aucun A/B CPU ou mesure GPU/FPS sur 250² n'a été exécuté pour V150. Le coût supplémentaire est concentré dans les décisions de crise et les requêtes alimentaires déjà bornées ; « aucun nouvel objet graphique » ne signifie pas coût nul.
