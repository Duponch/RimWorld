# Validation du plat gastronomique végétarien V157

**Implémenté au schéma 157 le 29 septembre 2026, dans le périmètre décrit ci-dessous.** Le [contrat local](../development/lavish-vegetarian-v157.md) adapte la [recette Core 1.6.4871](../research/lavish-vegetarian-core-v157.md) en une facture physique à quota unique. La scène navigateur prépare explicitement des matières premières ; elle ne mesure pas leur disponibilité ordinaire en colonie.

| Famille | Preuve obtenue | Limite |
| --- | --- | --- |
| Production et réservation | `tests/vegetarian-lavish-production-v157.test.ts` et le voisin V156 : **17/17 tests**. Les cuisinières, Cuisine 7/8, le quota de 25 végétaux/laits, le rejet de 24 unités et de viande, la concurrence de deux cuisiniers, les filtres, « jusqu'à X », l'annulation, la conservation et la reprise en collecte, portage, travail et sortie sont exercés. | La fixture de cuisine est petite et préparée. L'accès à 25 unités en partie naturelle n'est pas établi. |
| Produit et ingestion | Cinq fichiers ciblés de consommation et systèmes voisins : **15/15 tests**, dont trois V157. Identité et valeur distinctes, nutrition 1,0, pile de dix, pourriture à quatre jours, contamination, régime, alimentation assistée et souvenir gastronomique partagé +12 après ingestion sont contrôlés. | Pas de composition détaillée persistée, d'œufs ni de règles Ideology. Le petit commerce local n'offre pas ce plat. |
| Sauvegarde | `tests/vegetarian-lavish-persistence-v157.test.ts` : **5/5 tests** après ajout du cas commerce/visiteurs. Schéma 156 validé strictement avant migration neutre vers 157 ; refus des piles, régimes, stocks, âge, intoxication, pertes de feu, reçus commerciaux, cargaisons de visiteur, factures actives/emballées et tâches actives/en file futurs. Reprise et World/PRNG identiques à données égales ; les anciennes autorisations restent inchangées. Le voisin V156 passe **4/4** après mise à jour de sa fixture déclarée V155. | Les états préparés et les oracles ciblés ne constituent pas un générateur exhaustif de sauvegardes invalides. |
| Vraie interface et worker | Le scénario `tests/integration/vegetarian-lavish-v157.spec.ts` passe **1/1** dans Chromium, environ **1,2 min** : copie V156 préparée, autorisation du régime et ajout de la facture par l'UI, collecte et cuisson réelles, sauvegarde pendant le travail, 25 → 1, stock/inspection, ingestion physique puis humeur +12. Le bridge audio reconnaît la recette : **15/15 tests** ciblés. | Premier essai navigateur arrivé jusqu'au produit mais bloqué par un geste de caméra de la fixture ; le geste de déplacement déjà utilisé en V156 a été repris et le scénario a été rejoué vert. Aucun son n'a été évalué à l'oreille dans ce scénario. |
| Régression, build, présentation | Régression hors campagnes longues : **301/301 fichiers, 1 325 tests réussis + un ignoré**, 217,57 s. Le test supplémentaire commerce/visiteurs a été ajouté **après** cette passe et rejoué ciblé **5/5** ; la régression complète n'a pas été relancée pour ce seul ajout de test. Build TypeScript/Vite passé, **609 modules**. Présentation minage et coupe passée : 7 887 et 7 812 images, p95/p99 **6,3/6,6 ms** et **6,5/6,6 ms**, zéro saut et zéro occupation solide dans ces scènes. | Campagnes naturelles longues et suite navigateur exhaustive non rejouées. Le contrôle de présentation concerne ses scènes et chemins mesurés, pas un débit général ni un coût GPU. |

## Coût de planification et continuité

Le rapport temporaire `tmp/benchmark-vegetarian-lavish-planner-v157.json` compare le planificateur courant à son **source V156 figé** au commit `2bf4b4e433024f8e4842fbff0cba4f0205373ad0`, lié aux définitions partagées courantes. Hachages des sources et fixtures inchangés pendant l'essai. Sur la scène `mixed-100` de **250×250** (49 colons) et la fixture raffinée V152 de **32×32** (deux colons), propositions, budgets, snapshots `planWork`, World et flux aléatoires faune/feu coïncident exactement. Une scène V157 préparée (32×32, un colon) vérifie séparément la sélection indépendante des 25 unités végétales/laitières.

Microbanc `planCooking` A/B/B/A, quatre tours de huit échantillons par variante, temps en ms par lot :

| Scène | Source V156 moyenne / médiane / p95 | Source V157 moyenne / médiane / p95 |
| --- | ---: | ---: |
| `mixed-100`, 250×250 | 129,60 / 126,14 / 151,01 | 135,19 / 129,69 / 165,71 |
| Raffiné V152, 32×32 | 6,16 / 5,83 / 8,77 | 6,04 / 5,76 / 8,00 |
| V157 préparée, 32×32 | 6,93 / 5,48 / 15,03 | 6,29 / 5,55 / 11,43 |

Ces écarts sont bruités, surtout sur les petites scènes. La « source V156 » utilise les tables partagées V157 : ce n'est pas une comparaison de deux exécutables complets. Rien ici ne mesure le tick entier, le worker, l'adoption des snapshots, le CPU image, le RAF, le GPU ou les FPS ; aucun gain général ni absence de surcoût GPU n'est conclu.

Le lot laisse absents le gastronomique carnivore, les recettes par quatre, les œufs et autres ingrédients Core sans filière locale, Ideology et une parité alimentaire exhaustive. Les anciens régimes doivent être modifiés volontairement pour admettre le nouveau produit ; les nouvelles parties l'incluent selon leurs préréglages.
