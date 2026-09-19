# Validation de la confection — V72, 19 septembre 2026

Résultat : du coton réellement cultivé jusqu’à une tenue tribale portée, avec matière, auteur, ouvrage, qualité et expérience. Recherche/établi de tailleur/chemise fabricable restent la prochaine tranche. [Contrat](../development/tailoring.md), [vérification des règles](../research/tailoring-reference.md).

## Contrôles exécutés

- Passe globale : **81 fichiers, 356 tests réussis**, 225,31 s. Inclut trois parcours de cinq à huit jours et un raid ordinaire de cinq jours, ainsi que le parcours naturel de coton étendu jusqu’au vêtement porté. Le nom d’export de ces pilotes est maintenant V72 ; leurs preuves V71 ne sont pas écrasées.
- Cinq scénarios profonds de confection : collecte de 60 tissus en trajets bornés, arrêt/reprise, autre artisan disposant de matière mais tenu d’attendre l’auteur, suppression du poste, transport de l’inachevé, nouvelle facture, filtre/rayon d’une reprise liée, sortie et habillage, relecture/rejeu, file forcée, strict V71 et corruptions, qualité et couverture anatomique. Après la passe globale, frontières supplémentaires dans les mêmes scénarios : remboursement fractionnaire par pile, refus sans mutation à la limite des IDs et achèvement bloqué sans XP/PRNG supplémentaire ; **5/5** à nouveau réussis.
- Parcours naturel : six cotonniers, nourriture et vrai sommeil, récolte après plus de dix-huit jours, soixante tissus, poste posé par commande, travail puis tenue portée. [Bilan coton](../../artifacts/cotton-colony-v72.json), [fin de filière](../../artifacts/tailoring-colony-v72.json). La colonie atteint le jour 19 ; il ne s’agit pas d’une maturité injectée.
- UI native : **1/1**, 28,7 s. Charge le [checkpoint naturel](../../artifacts/tailoring-cotton-checkpoint-v72.json), utilise Architecte, Travail, facture et suspension ; inspection de l’ouvrage et sauvegarde/rechargement, reprise à 1× puis 6×, produit porté à 1×, qualité visible, vêtement GPU/portrait, FPS et persistance. Attributs GPU comparés au propriétaire de chaque snapshot présenté, cargaisons tissu/tenue observées, aucune erreur console/WebGPU. [Preuve compacte](../../artifacts/tailoring-ui-v72.json). Captures locales `tailoring-unfinished-v72.png` et `tailoring-worn-v72.png` examinées. Ce contrôle de la nouvelle boucle ne constitue pas un nouveau parcours UI monolithique de dix-neuf jours.
- `npm run build` réussi ; avertissement existant sur le bundle principal de plus de 500 kB conservé. Vérification des liens, ancres et empreintes du corpus par `scripts/check-docs.py`.

Premier passage ciblé : une assertion utilisait `hp` au lieu de `hitPoints`, corrigée. Le scénario de transport a détecté un vrai défaut d’intégration : la branche générique de transport créait une pile sans les données de l’inachevé. Le transfert indivisible conserve désormais le même objet, comme les équipements. Ces deux premiers échecs sont distingués de la passe finale verte.

## Charge et limites

CPU **AMD Ryzen 5 3600**, Windows, Node et conditions détaillés dans les JSON. Carte naturelle 250×250, 3/30/100 acteurs, moitié rassemblent et confectionnent, autres minent/abattent ; tous portent déjà une tenue pour charger le rendu. Le tissu initial de ces bancs est une fixture de charge, distincte de la culture naturelle. Mesures successives, sources gelées pendant le natif, une passe par population.

| Acteurs | Simulation CPU p95 / pic | Image native p95 / pic | Worker p95 / pic |
|---|---|---|---|
| 3 | 1,35 / 9,24 ms | 4,3 / 20,9 ms | 2,85 / 24,4 ms |
| 30 | 8,62 / 30,90 ms | 8,4 / 45,9 ms | 13,20 / 93,9 ms |
| 100 | 18,60 / 27,88 ms | 16,7 / 33,3 ms | 21,65 / 44,9 ms |

[Simulation et encodage](../../artifacts/tailoring-cpu-v72.json) : 650 ticks, 100 ticks de chauffe séparés, p50/p95/p99/pics et vingt premiers ticks conservés dans la série globale. 2/15/50 vêtements produits, 4/60/200 cases minées. [Worker et rendu natif](../../artifacts/tailoring-render-v72.json) : GPU AMD RDNA 1, viewport 1440×1000, 90 frames de chauffe, vraie vitesse demandée 6× ; aucune sérialisation complète de World pendant la fenêtre. Les temps worker sont les moyennes de pas publiées par lots, **pas** un percentile de chaque tick individuel.

Zéro pipeline créé pendant les trois mesures, géométrie du lot des colons conservée, aucune erreur ni état invalide. À 100 acteurs, 652 ticks sont présentés en 11,81 s environ : ne pas annoncer une tenue constante du 6× nominal. Les pointes de simulation et d’image restent réelles. Ce banc ne démontre ni absence de toutes saccades ni coût nul du nouveau contenu ; il confirme l’absence de compilations tardives et de multiplication des lots par vêtement.

## État du plan

G0 en consolidation ; G1/G2/G3 partiels, G4 engagé, G5 absent ; aucun jalon clos. L’étape proche 4 a désormais une fabrication utile consommant une matière cultivée. Sa partie recherche et déblocage réel reste ouverte selon [ROADMAP](../ROADMAP.md).
