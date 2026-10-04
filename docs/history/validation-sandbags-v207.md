# V207 — Preuve bornée des sacs de sable

Relevé du **4 octobre 2026**, depuis V206 `eb8cebb`, schéma **189**. [Contrat](../development/sandbags-v207.md), [recherche Core 1.6.4871 et adaptations](../research/defensive-cover-core-v207.md). Travail en mode jour : une tranche de préparation défensive, puis commit local et attente de relance. Aucun push.

## Recherche et contenu fonctionnel

XML Core et classes du binaire identifié établissent cinq Cloth, 180 unités de construction, 300 PV, remplissage 0,55, PassThroughOnly, pathCost42 avec non-répétition, beauté −10, inflammabilité0 et absence de recherche/qualité/minification. La représentation locale originale utilise les lots résidents. Le tissu existant est pris et livré avant les 18 ticks neutres ; le couvert intervient dans les requêtes et projectiles existants, pas par une collision dérivée du modèle 3D.

Destruction au quart et déconstruction à moitié conservent leurs PRNG, prévalidations de place/identité et bilans distincts. Les pertes textiles de déconstruction sont prospectives ; aucune migration ne reconstitue le passé. Le sac ne ferme ni pièce ni enclos, ne soutient aucun toit et ne devient pas une cible de brèche nécessaire au trajet des raids. Valeur de marché locale 8,148 avant PV, distincte du prix de vente. Les positions de tir PassThroughOnly particulières de Core restent adaptées à la sélection locale ; autres matières, barricades et gravats SandbagRubble sont différés.

## Contrôles ciblés et corrections

**154 tests uniques dans 23 fichiers passent par reprises**, dont **21 nouveaux cas V207** dans six fichiers : production, couvert/impacts/réparation, navigation, persistance, bridge et présentation. Les voisins réellement touchés incluent matériaux, déconstruction, mobilier, toits, raids, captures/requêtes de tir, valeur des pièces, mêlée, icônes, audio de travaux et sauvegardes publiques. Ce résultat n'est ni une suite complète ni une campagne naturelle. Rapports `tmp/v207/targeted-a.json` à `targeted-d.json`.

La première suite a révélé deux oublis **produit** : le garde nouveau consultait un bilan absent avant le schéma24 et le validateur de mêlée gardait une liste fermée des anciens ouvrages. Le garde accepte désormais l'absence historique avant24 sans admettre un bilan futur ; la mêlée partage la famille endommageable. Une **fixture** de fauteuil préparé manquait Mobilier complexe : son prérequis est fourni, les assertions métier restent intactes. L'**oracle** de nombre d'outils Architecte passe de72 à73, avec cellules historiques inchangées. Chaque fichier en échec est repris ; aucune assertion utile n'est retirée pour obtenir le résultat.

Migration188→189 strictement validée avant changement neutre : structures, plans, retrait, paquets, transfert ou bilans futurs sont refusés sous188. Tissu, orientation0, empreinte standard, dégâts1..299 et absence de qualité/états étrangers sont contrôlés. Un retrait physique de fauteuil migré rend55 tissus et enregistre55 pertes nouvelles, sans histoire rétroactive. Refus de capacités/identités/pertes saturées restent atomiques ; les continuations de collecte, chantier, transit, impacts, réparation et retrait conservent World/PRNG. Checkpoints/deltas au même tick, anciens Worlds figés, rejet après patch de pile puis continuation valide sont exercés. Les relations/capacités complètes restent celles des validateurs ordinaires de sauvegarde, pas une prétention de validation bridge exhaustive.

## Chromium matériel et présentation

**Parcours préparé matériel 1/1 sur la version finale**, Chromium **153.0.8010.12**, WebGPU AMD **rdna-1**, sans fallback logiciel accepté. La candidate a d'abord été importée par le menu ; le dernier parcours charge la scène depuis **Colonies de test**. Aucun World n'est modifié depuis le navigateur pour fabriquer une livraison, un tir ou un impact.

Construction observée au tick3012 avec cinq tissus réellement livrés et progrès1 ; ouvrage terminé au tick3029. Tir sortant depuis derrière le couvert puis impact balistique de12PV au tick3034, réparation réelle dès3035. La relecture a identifié un troisième défaut **produit** : le clic de ciblage mêlée ne reconnaissait que murs/portes. Il partage maintenant `isBarrier` avec le moteur, et l'aide nomme les ouvrages disponibles. Le dernier parcours sélectionne le sac par ce contrôle, approche et inflige8PV au tick3054 ; récupération puis réparation physique terminent au tick3078. Sauvegarde/recharge exactes au chantier, à la visée, aux dégâts, à la réparation, à la récupération de mêlée et à la finition.

Le premier essai natif s'arrêtait au tick3029, World valide conservé : le corps projeté du destinataire était couvert par la fiche Bio alors que sa case au sol était visible. Screenshot/checkpoint et trace ont permis de diagnostiquer le **pilote** avant reprise. Son ciblage déplace maintenant la caméra par geste réel et vérifie le corps après ouverture de l'inspecteur. Les rapports restent distincts : première sortie sous `tmp/test-runs/2026-10-04T16-22-44.798Z-25404/`, reprise candidate `v207-native-b`, parcours public final `v207-native-c`. Aucun échec n'est présenté comme un parcours réussi.

Rapport final `tmp/test-runs/v207-native-c/artifacts/sandbags-v207-native.json` : mobilier **505**, acteurs **624** conservés, **18 placements** nouveaux, pipelines **76→76**, **877 images** avec projectile en vol et aucune erreur. Captures iso/perspective inspectées ; sélection, résistance300/300 et silhouette basse correspondent à l'ouvrage construit. Cette stabilité ne mesure pas le temps GPU, la VRAM ou la charge générale d'une ligne de nombreux sacs.

`npm run test:presentation` passe sur carte **250×250** : minage puis abattage45s chacun, changements1×/6×/3×. **10 524/10 467 images**, aucun saut, excès de trajet continu ni occupation solide détectés ; RAF p50 **4,2/4,2ms**, p95 **4,3/4,3ms**, p99 **8,4/8,4ms**. Rapport `tmp/test-runs/v207-presentation/artifacts/harvest-sync-verification.json`. Le dernier raccord de ciblage n'a pas changé horloge, bridge ou interpolation ; cette preuve est réutilisée dans son domaine, pas une mesure des FPS généraux.

## CPU isolé

Mesure successive, sources de simulation gelées et empreintes conservées, Node **24.11.1**, Windows **10.0.26300**, AMD **Ryzen5 3600**. `scripts/benchmark-sandbags-v207.ts` compare le commitV206 `eb8cebb` à V207 sur le même World historique strictement migré189 : carte250²,104 humains,670structures,10 077ressources,266piles, aucun sac nouveau.

Oracle exact sur **62 500 cellules**, quatre bords et32 paires de rapports ; World/PRNG inchangés. A/B/B/A, quatre tours, huit lots par variante, trois captures fraîches par lot après chauffe. Capture p50 **1,7486→1,7452ms**, requêtes par lot p50 **0,1621→0,1540ms**, total p50 **1,8974→1,8936ms** ; total p95 **3,1697→2,6013ms**. Écart de médianes faible et dispersion : aucune accélération générale ni régression robuste déduite de ce seul sous-banc historique.

Garde `validSandbagsState` séparée en **absolu** sur cette scène sans nouveau contenu actif :500chauffes,16échantillons de1000appels, p50 **0,0049055ms**, p95 **0,0068188ms**. Rapport `tmp/v207/cpu.json`. Ce parcours réel a un coût ; il exclut nouvelles défenses actives, validation complète, adoption, worker, tick complet, CPU image et GPU. Aucun coût supplémentaire nul promis.

## Publication, compilation et limites

La **53e** scène publique **« Sacs de sable · construction et couvert »** prépare trois adultes, cinq tissus au sol et deux revolvers existants équipés, sans sac, plan, tir, dégâts, foyer ou réparation fournis. Tirs volontaires entre alliés réellement dangereux et probabilistes ; cette préparation ne garantit aucun premier impact ni campagne défensive naturelle. Payload SHA256 **82bdf69c0e95e3a81ec3b2b72ef4acac65db1a68b8a7ac1794bdb6b1ad7ad7a6**.

**53 payloads** passent hash du manifeste, décodage strict, sérialisation exacte et un tick réel repris ; **52 entrées et payloads historiques byte-identiques** au commit `eb8cebb` (`tmp/v207/payloads.json`). Typage/build TypeScript/Vite passent sur sources finales, **704 modules** ; l'avertissement historique des chunks supérieurs à500kB reste présent. En-têtes courants au schéma189 et liens contrôlés ; corpus original et preuves historiques préservés. La consolidation périodique/pilote acquise en V204 n'est pas annoncée rejouée.

Recherche, implantation, corrections produit, réparations de fixture/oracle/pilote et exécution des contrôles sont distinguées. Suite exhaustive, campagnes longues naturelles, stratégie Core complète, autres matières et catalogue de défense restent ouverts. Aucun push ; après commit local, attendre une nouvelle relance en mode jour.
