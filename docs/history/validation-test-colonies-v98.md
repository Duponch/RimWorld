# Colonies de test accessibles au joueur — V98

Livraison du 24 septembre 2026. Six fichiers Lisière compressés, catalogue accessible depuis Charger, téléchargement, import et récupération. [Contrat et contenu](../development/test-colonies.md). Aucun changement de simulation, schéma 91 ou catalogue V91.

## Preuves regroupées

**23/23 contrôles**, quatre fichiers : `test-colonies-v98`, `test-colony-library`, `game-session`, `save-storage-codec`, durée 11,10 s. Six fichiers strictement validés, empreintes et comptes exacts, compression sans perte, sérialisation identique, continuation déterministe comparée entre deux restaurations. Reprises bornées : 12 ticks pour les petites configurations, 3 pour chacune à cent colons ; activité réelle de déplacement/travail/besoins. Présence des installations, deux captifs, visiteurs/transaction, feu, tailleur, salissures et sépulture vérifiée. Refus des fichiers et catalogues invalides, conservation des emplacements et exclusion pendant une lecture réseau couverts. [Inventaire des fichiers et tailles](../../artifacts/test-colonies-v98.json).

Typage et build réussis. Les sauvegardes font environ 106–187 Ko chacune, chargées seulement à la demande. Le bundle worker reste `simulation.worker-Bk9oiuuH.js` : aucune règle de simulation ajoutée.

[Parcours natif local](../../artifacts/test-colonies-native-v98-local.json), Chromium matériel, sources servies gelées : six chargements depuis les vrais boutons, comptes 4/12/12/12/100/100, ouverture en pause puis progression à vitesse demandée ×6. Téléchargement et empreinte, import réussi, import métier invalide refusé sans altérer la partie ni les deux emplacements, reprise de la véritable colonie précédente à cent colons. Catalogue contrôlé en 1440×1000 et 1366×768, sans débordement horizontal, actions accessibles. Captures inspectées ; aucune erreur JS/GPU.

Ces parcours vérifient l'accès et la reprise, pas la réussite complète de toutes les boucles ni l'autonomie alimentaire des charges préparées. Aucune nouvelle moyenne FPS ou garantie de débit n'est déduite de ces essais courts ; les limites de [V97](validation-performance-v97.md) restent valables. Aucun pilote annuel nécessaire : les contrats temporels ne changent pas.

## Périmètre

G0 en consolidation, G1/G2/G3 partiels, G4 engagé, G5 absent ; estimations fonctionnelles inchangées. Nouveauté : moyens d'essai accessibles. Gameplay présent et grands systèmes partiels/absents restent ceux de l'[inventaire](../gameplay/implementation-status.md). Les situations préparées ne sont pas des modèles universels de progression RimWorld.

Netlify : déploiement **`6ab593dc07b647ac555993f8`**, 30 fichiers, état `ready`. [Résultat](../../artifacts/netlify-v98.json), [parcours public natif](../../artifacts/test-colonies-native-v98-public.json) : les six colonies s'ouvrent en pause avec les comptes attendus, téléchargement/import/refus/récupération passent sans erreur JS/GPU. Le diagnostic des ticks n'est pas exposé en production ; les reprises exactes sont prouvées localement, pas déduites d'un délai d'attente public. Documentation vérifiée et originaux du corpus inchangés. Mode jour : publication puis retour à l'utilisateur.
