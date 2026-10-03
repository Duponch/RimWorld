# Serre électrique sur sol existant — contrat V189

**Livré dans le périmètre de la [preuve ciblée](../history/validation-greenhouse-v189.md).** [Recherche Core](../research/greenhouse-core-v189.md), [agriculture](farming.md), [croissance thermique](plant-temperature.md), [réseau](power.md), [lumière des travaux](light-work.md), [présentation lumineuse](environment-lighting.md), [préparation des ombres](shadow-preparation.md). Le schéma courant est **177**, après validation stricte de 176 et migration neutre.

## Décision jouable

Construire une lampe horticole dans une pièce couverte, alimenter ses 2 900 W et cultiver le sol existant dans sa couverture réelle. Le toit, le courant, le sol et la température restent des contraintes distinctes. La pièce conserve les travaux physiques de construction, semis, récolte, transport et chauffage existants. Aucun plant, récolte, sol fertile, bâtiment ou courant n'est offert par migration.

`sun-lamp` : une cellule traversable, orientation fixe, 40 acier, 33 ticks neutres, 50 PV, emballage/réinstallation conservatifs, interrupteur physique et horaire civil automatique strict 06:00 < heure <19:12. Les réseaux existants choisissent les démarrages et délestages ; ne pas allumer gratuitement un appareil par changement d'heure. Lumière blanche logique 370/370/370, portée14 et surexposition coût<700 du même flood. Chaleur active3/s distribuée dans l'air réel ; aucune consigne thermostatique inventée.

## Croissance et causalité

`Resource.growthLight?: 'dark' | 'artificial-full'` capture le régime de l'intervalle commencé à `growthTick`. Absence conserve le calcul naturel historique. L'ancien régime et l'ancien facteur thermique sont soldés avant adoption du nouveau. L'état sombre interdit le rattrapage après découverte ; l'état artificiel utilise l'intégrale civile pleine, indépendamment du toit. Le régime est réservé aux vraies plantes avec checkpoint valide, refusé avant177. Plusieurs réconciliations au même tick n'ajoutent rien.

Les checkpoints de toiture avant mutation restent obligatoires. Réconciliation au début de reprise, après alimentation/pannes/feu, et après mutations d'acteurs avant publication. Naissances et semis commencent au vrai tick ; adoption climatique solde avant changement d'origine. Le contrôle vital individuel existant lit l'éclairage effectif, sans bonus de nuit, température ou fertilité. Lampe sur pied insuffisante ; panne, extinction et obstacle coupent les futures contributions.

Index dérivés par World, tableau de ressources, tableau de couverture et identité du champ artificiel immuable ; jamais le Set temporaire des toits. Le régime stable ne visite pas la forêt par tick. Croissance consultée O(1), diffusion reconstruite seulement sur sources/dimensions/obstacles pertinents. Aucun état métier confié au renderer ni dépendance à la caméra.

## Interface et présentation

Outil Architecte, coût acier et inspection distinguant horaire, arrêt manuel, panne, raccordement et manque de puissance. Couverture horticole basée sur le masque métier et les obstacles, pas un disque approximatif. Le modèle utilise quelques volumes pastel du lot de mobilier résident. La texture graphique actuelle encode explicitement `min(0,5,lumière)` pour éviter le débordement d'un octet à100 %. Pas de lumière Three, mesh ou passe d'ombre par lampe ; textures désactivées conservent l'absence de prélèvement pigmentaire.

## Validation et limites

La preuve établit **114/114 ciblés uniques**, **30/30 gardes finales**, build/typage, présentation et **1/1 Chromium natif WebGPU** depuis la 40e colonie publique. Contrôles des coûts/construction, réseau équilibré et horaires/décalage civil, diffusion/obstacles/chevauchement, cultures sous toit et lampe ordinaire, coupure/reprise/changement thermique, semis/récolte physiques, emballage, sauvegarde stricte176 et continuation177, deltas au même tick et ancien snapshot immuable. Colonie préparée « Serre électrique » accessible au menu, avec livraison/construction, commutations au contact, reprise et récolte réelles. Présentation passée pour le codec modifié. Le contour de sélection est préparé au chargement, avec zéro nouveau pipeline pendant le parcours natif. Build/typage et liens documentaires ciblés ; campagnes longues et régression globale seulement si un contrat ou échec les motive.

Mesurer séparément réconciliation agricole et reconstruction lumineuse à250², avec référence indépendante et cas stable sans lampe. Source gelée pendant banc/native, opérations lourdes successives. Ces mesures bornées ne prouvent ni gain global, ni coût GPU nul, ni parité Core exhaustive. Hydroponie, nouvelles cultures et météo restent hors de ce lot.
