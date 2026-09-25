# Validation V103 — pièces vécues

25 septembre 2026, Core seul. Base `9635eaa` (revue V102 intégrée), travail sur `main`. [Contrat](../development/room-quality.md), [référence des usages](../research/room-impressiveness-reference-v103.md), [valeur des objets](../research/room-market-value-reference-v103.md). Deux missions Sol bornées ont préparé les références et modules purs ; intégration, états sauvegardés et validation centrales.

## Livraison et frontières

Richesse, espace et impression sont dérivés de la pièce réelle. Les repas, les fers et le sommeil en lit civil personnel produisent des souvenirs d'humeur après leurs transitions physiques. Une échéance persiste pour l'observation du sommeil ; les familles ne s'accumulent pas, chambre/dortoir s'excluent et chaque souvenir expire après un jour. Les tableaux de paliers proviennent de Core local 1.6.4871, recoupé avec les sources publiques datées. Schéma 103 : validation stricte V101 puis migration neutre. Pas de souvenir, ressource, recherche ou événement rétrospectif.

Le contenu déjà jouable (meubles, sols, fleurs, repas, fers, lits) reçoit des effets supplémentaires ; **aucun nouvel objet de catalogue**. Art/sculpture est documenté, pas implémenté. Richesse globale, attentes/narrateur, pensées hospitalières, captifs/visiteurs et rôles spécialisés restent distincts. Les limites héritées de beauté végétale et de géométrie sont explicites dans le contrat. G0 consolidé mais partiel ; G1–G4 partiels ; G5 absent. Aucun jalon global clos.

## Contrôles regroupés

- **48 contrôles distincts réussis** : [lot de 46](../../artifacts/room-experience-unit-v103.json), puis [six contrôles d'expérience](../../artifacts/room-experience-boundaries-v103.json), dont quatre déjà comptés et deux frontières ajoutées. Formule/paliers, matières/qualité/PV, valeurs de sols, objets libres, espace, fleur/propreté et brèche, cache sur mutation en pause, repas interrompu/achevé, fers et ciel, sommeil bref/délai/réveil, PRNG/reprise exacte, expiration et refus de formes invalides. Régressions humeur, loisirs, confort, topologie, bridge et usinage comprises.
- La vraie fixture publique V101 `atelier.json`, immuable, est rechargée et comparée **champ par champ**, seule la version passe à 103. Le cas synthétique ancien avec souvenir futur est rejeté avant migration.
- **Deux parcours UI/worker réussis** : inspection, porte ouverte, brèche par travaux et rechargement (`rooms.spec.ts`) ; démonstration V103, trois statistiques, ingestion réelle, pensée visible dans Besoins et reprise exacte (`room-experience.spec.ts`). La dernière passe de ce second parcours est en Chromium affiché, WebGPU, 1440×1000 : [rapport](../../artifacts/room-experience-native-v103.json), [inspection](../../artifacts/room-quality-ui-v103.png), [souvenir](../../artifacts/room-memory-ui-v103.png).
- TypeScript et build de production réussis ; avertissement connu de taille des chunks conservé. Liens documentaires contrôlés avant publication.

Le premier pilote UI tentait de cliquer le vieux résumé « Pensées et humeur », volontairement masqué depuis la structure en dossiers. Besoins ouvre déjà ses rubriques. [Échec conservé](../../artifacts/room-experience-ui-initial-v103.md), pilote corrigé sans modifier le produit ni retirer l'oracle de pensée ; parcours repassé en 12,9 s puis capture visible affinée en 10,9 s. Le contrôle Pièces réussit en 19,4 s. Les durées sont celles des cas Playwright, pas le temps total de recherche/implémentation. Pas de campagne annuelle : frontières à un jour, reprises et transitions physiques ciblées suffisent à ce lot, sans prétendre établir l'équilibre à long terme.

## Coûts mesurés séparément

Ryzen 5 3600, Node 24.11.1 ; navigateur WebGPU AMD RDNA1, 1440×1000. CPU, UI et rendu exécutés successivement, sources servies gelées pendant les sessions natives.

[Microbanc de lecture](../../artifacts/room-quality-cost-v103.json) : pièce préparée de 36 cases sur carte 250², topologie retenue, 20 préchauffages puis 160 lectures de chaque version en ordre alterné. Ancienne capture complète : moyenne 0,977 ms, p95 2,674 ms ; nouvelle capture locale avec les statistiques ajoutées : moyenne 0,076 ms, p95 0,162 ms. Beauté identique sur cette scène. Cela mesure le coût dérivé local, **pas les FPS ni tous les frais du cache UI**.

[CPU mixte](../../artifacts/research-cpu-v103.json) : 3/30/100 colons, recherche, confection et extraction, 650 ticks et 100 de préchauffage séparés, instantané tous les cinq ticks. p95 simulation : **3,97 / 9,09 / 22,99 ms**, maximum à 100 : **42,18 ms**. Les vrais travaux terminent et les mondes restent valides.

[Worker et rendu](../../artifacts/research-render-v103.json) : même famille de charge, 90 images de chauffe, 650 ticks demandés à 6×, aucun export complet pendant la mesure. À 3/30/100 colons : image p95 **8,4 / 8,4 / 20,9 ms**, maxima **29,2 / 37,5 / 54,2 ms** ; à cent, 657 ticks en 19,046 s, soit **5,75×** environ. Aucune erreur JS/GPU, allocation structurale instable ni nouveau pipeline pendant les mesures. Les échantillons worker sont des moyennes par lot, pas des ticks indépendants. Ce relevé court sans animaux ne remplace pas les anciens stress mixtes ni une comparaison causale V102/V103 ; aucune garantie 240 FPS ou 6× à charge générale.

## Découverte et publication

La [salle préparée](../../public/test-saves/v103/salles.json) fournit un colon, trois repas, mobilier et fleurs déjà posés ; aucun souvenir prérempli. Ce n'est ni une progression naturelle ni une colonie autonome. Télécharger puis importer depuis Charger ; reprendre et observer le repas dans Besoins. Les fixtures V98/V101 ne sont pas réécrites. Le [guide joueur](../gameplay/player-guide.md) distingue cette démonstration des usages ordinaires.

Production Netlify **`6ab6e70384f6d62f0f619a5d`**, 32 fichiers, état `ready` : [réponse](../../artifacts/netlify-v103.json). Le [contrôle général public](../../artifacts/netlify-smoke-v103.json) passe : création, schéma 103, dossiers, sauvegarde/restauration à froid, curseurs et 61 outils, sans erreur JS/GPU. Le [contrôle V103](../../artifacts/room-public-v103.json) compare tous les fichiers JS/CSS et l'entrée au build local, vérifie les octets de la démonstration, l'importe et la sauvegarde à l'identique puis constate ingestion et souvenir dans le vrai produit publié. [Capture publique](../../artifacts/room-public-v103.png). Aucun export de diagnostic de test exposé par le bundle public.
