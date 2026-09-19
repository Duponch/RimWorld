# Validation V67 — ouvrages endommagés et réparation

19 septembre 2026. Lot de dépendance visible de l'étape 2 ; aucun raid nouveau annoncé. Dommages et entretien des murs/portes, foyer manuel et migration V66 neutre ; les autres objets et la boucle de raid restent ouverts.

Premier passage ciblé : 24/25. Le scénario indépendant de cadence a détecté un excès d'XP dû aux arrondis répétés par sous-pas Core ; regroupement de l'apprentissage au tick local, sans changer l'attente ni supprimer l'assertion. Passage suivant : 33/33, sept familles incluant combat, retrait, toiture, projectile et snapshots.

UI native à 1×/6× : une passe réussie en 18,1 s ; frappes réellement rendues, 0 orientation incorrecte sur les observations, trajet, arrêt, sauvegarde/rechargement, zone de foyer et réparation à 195/195. Aucun objet consommé et aucune erreur navigateur. [Rapport](../../artifacts/barrier-ui-v67.json). Captures locales `artifacts/barrier-v67-1x.png` et `barrier-v67-6x.png` inspectées. La passe UI finale après revue réussit en 17,2 s ; elle vérifie aussi le bouton Annuler masqué pour un entretien automatique et l’orientation du réparateur, avec un écart angulaire qui détecte également un demi-tour.

Les fixtures courtes sont contrôlées ; elles ne prouvent ni un incident hostile naturel ni la totalité du contenu de construction. La nouvelle zone est manuelle. Les grandes limites historiques de charge demeurent jusqu'à nouvelles mesures.

## Contrôles regroupés

Passe globale : **326/327**, seule erreur dans l’ancienne fixture d’accueil qui exigeait littéralement le schéma 66 après migration ; assertion mise sur la version courante, en conservant l’égalité de tout le monde. Les trois pilotes cœur sur plusieurs jours passent avec foyer peint et pertes distinctes. Après l’audit des captures, ajout de l’invalidation du contact et du son lors de destruction : 29/30 au premier contrôle (date injectée du bruit un sous-pas dans le futur, correctement refusée), puis **30/30** après correction de cette fixture, sans relâcher le validateur. Familles : barrières, réveils, accueil, projectiles et mêlée. Revue finale : retirer les travaux automatiques du rectangle Annuler, garder la déconstruction prioritaire et refuser une récupération de coup dont l’ID/case contredit un objet vivant. **39/39** finaux sur huit familles, avec annulation atomique et corruption. Aucune nouvelle passe globale annoncée.

## Charge CPU puis navigateur

Exécutions successives ; pas de pilote long concomitant, sources gelées pendant la capture native. Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1, WebGPU AMD RDNA1, fenêtre 1440×1000, forêt 250². Trois populations, 240 ticks chacune ; un tiers frappe des murs déjà affaiblis, un tiers répare d’autres ouvrages endommagés, les autres travaillent. Vêtements présents ; aucun reset de santé, dégâts, travaux ou ressources pendant la mesure. Ces cibles préparées forment un audit contrôlé, pas un raid naturel.

Les destructions (1/10/33), réparations complètes et états valides sont confirmés dans les deux exécutions. Le CPU observe 1/10/34 cellules minées ; aucun arbre entièrement abattu sur ces 240 ticks. Les percentiles généraux ne doivent pas masquer que le combat ne dure que 17/29/29 ticks : conserver aussi sa fenêtre active, le début et les maxima complets.

| Acteurs | Tick CPU complet p95 / p99 / max (ms) | Combat actif p95 / max (ms) | Encodage p95 (ms) | Image native p95 / p99 / max (ms) |
|---|---|---|---|---|
| 3 | 1,38 / 7,16 / 20,46 | 20,46 / 20,46 | 3,03 | 16,50 / 20,90 / 29,20 |
| 30 | 5,40 / 16,04 / 31,79 | 19,20 / 31,79 | 3,19 | 16,60 / 25,00 / 50,10 |
| 100 | 20,36 / 38,79 / 51,40 | 40,29 / 51,40 | 3,37 | 25,10 / 50,10 / 79,20 |

À cent acteurs, adoption de scène p95 9,90 / max 16,70 ms ; callbacks de snapshots p95 12,40 / max 21,40 ms, hors décodage IPC. Aucun nouveau pipeline GPU ni erreur navigateur ; 1 435 poses de mêlée observées. Le natif passe en 50,6 s. Le p95 CPU complet dépasse 16,67 ms (budget d’un tick à 6×) et le pic d’image atteint 79,20 ms : **pas de garantie de 6× ni de fluidité parfaite**. La charge diffère de V66, donc ces nombres ne démontrent pas un gain comparatif. [CPU détaillé](../../artifacts/shooting-cpu-v67.json), [natif détaillé](../../artifacts/shooting-native-v67.json).

## Parcours, présentation et livraison

Parcours UI complet réussi en **7,1 minutes**, sur le départ ordinaire 250², sans fixture injectée. 199 décisions, arrivée réelle d’un quatrième colon, quatre couchages utilisés, cinq vêtements portés, 26 repas cuisinés et 21 consommations observées. Au tick 18 059 : camp équipé (table, trois tabourets, atelier, porte, générateur/lampe), 28 cases couvertes, 15 cultures, neuf cases de foyer, zéro travail restant ; cinquante acier, trente-cinq blocs et deux fragments rangés. Conservation bois/alimentation et absence d’erreur navigateur confirmées. La maintenance est déjà achevée à la dernière observation ; pas de continuation de checkpoint nécessaire. [Parcours complet](../../artifacts/colony-three-days-v67.json).

Les dernières gardes d’annulation et de forme de récupération sont couvertes par les 39 contrôles ciblés et l’UI courte finale ; pas de répétition du long parcours civil qui n’utilise pas ces commandes contre des ouvrages endommagés.

Garde native minage/abattage : deux observations de 45 secondes, trois colons, carte 250², alternance 1×/6×/1×/3× toutes les deux secondes. Plus de 10 500 images par action ; zéro saut dépassant la borne, zéro occupation graphique d’un solide et zéro frame affamée selon les sondes. 41 opérations de minage et 42 abattages terminés. Images p95 4,30 ms, maximum 20,90 ms dans chaque cas. [Mesure complète et délais des vitesses](../../artifacts/harvest-sync-v67.json). Les compteurs de trajets futurs sont conservés dans le rapport, sans les assimiler à des téléportations ; ces sondes ne prouvent pas tous les cas de présentation.

Build TypeScript/Vite final réussi ; avertissement connu de bundle supérieur à 500 kB. Vérification des liens documentaires et intégrité des trois originaux conservées.

G0 en consolidation, G1/G2/G3 partiels, G4 engagé par l’accueil et G5 absent. Aucun jalon clos ; étape 2 ouverte. Le prochain lot doit produire la menace et ses conséquences dans la partie ordinaire, avec accès au camp fermé et issue effective.
