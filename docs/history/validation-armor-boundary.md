# Noyau de protection sous V62 — 19 septembre 2026

Base publiée : `540bbad` (V62). Ce lot prépare l'habillement ; **pas de vêtement jouable ni d'armure appliquée à World**, pas de migration. [Contrat](../development/armor.md), [recherche fraîche](../research/apparel-reference.md). G0 en consolidation, G1/G2 partiels, G3 humain/combat partiel, G4/G5 largement absents ; estimations inchangées.

## Vérifications exécutées

- `npx vitest run tests/armor.test.ts tests/body.test.ts tests/bullet-impact.test.ts tests/melee.test.ts` : **26/26**, quatre fichiers, 3,81 s de Vitest (5,89 s commande).
- Cinq scénarios de protection : couverture anatomique et incompatibilités, seuils stricts et distribution exacte stratifiée, ordre/usure/conversion, arrondi/destruction immuable, rejets avant RNG. Quatorze mille jets stratifiés vérifient les fréquences attendues sur sept résidus ; cela ne constitue pas un test aléatoire exhaustif.
- Cas importants : groupes FullHead/UpperHead sans nom commun ; organes couverts et mains non couvertes ; vêtement multicouche appliqué une fois ; usure avant déviation même au dernier PV ; aucune perte sur couche profonde après déviation ; Sharp conservé pour la statistique après conversion ; armure du corps en dernier ; seuils d'arrondis fractionnaires ; RNG invalide après début de transaction sans mutation des pièces.
- `npm run build` : typage et production réussis, 297 modules ; avertissement de chunk >500 kB préexistant conservé. Le module isolé n'a aucun import de production, donc aucune protection implicite.
- Journaux courts : [contrôles](../../artifacts/armor-boundary-checks.txt). Aucun test source originale n'a été copié ; les valeurs artificielles des fixtures ne définissent pas des objets du catalogue.

## Contrôles différés et limites

Pas de suite globale, pilote long, UI, contrôle de shader ni benchmark natif rejoués : aucun chemin de gameplay, commande, pont, sauvegarde ou rendu existant n'est modifié. Les derniers audits intégrés restent ceux de [V62](validation-disturbance-v62.md) ; ils ne mesurent pas le futur équipement.

L'intégration doit encore engager ensemble usure, anatomie et PRNG, inclure les trois producteurs d'impacts, conserver les événements de réveil/pouvoir d'arrêt et adapter le pilote de colonie. Une transaction pure ne prouve pas la conservation des propriétaires, la fluidité carte/portrait ni le coût avec cent acteurs. L'entrée accepte des statistiques déjà calculées ; qualité/matière, usure quotidienne et baisse éventuelle d'autres statistiques ne sont pas livrées.

Relecture rétroactive documentaire : deux absences périmées des réveils V62 corrigées dans l'inventaire consolidé. Les notes historiques restent intactes. Le prochain bilan utilisateur doit porter sur la boucle visible, pas compter cette extraction comme un vêtement supplémentaire.
