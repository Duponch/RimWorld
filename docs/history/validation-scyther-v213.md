# Validation V213 — Scyther et récupération

**Livré dans le périmètre contrôlé, schéma194.** Base locale V212`012651a7`, validation stricte193 puis migration du numéro seul. [Contrat](../development/scyther-v213.md), [référence](../research/scyther-core-v213.md). Les contrôles historiques anatomie/combat/transport établissent leurs anciennes branches ; les preuves V213 ci-dessous couvrent le troisième propriétaire mécanique.

Les références fraîches sont certifiées par provenance/DLL identique avant/après. Elles ne prouvent aucun résultat jouable à elles seules. Les commandes parent sont enregistrées sous `tmp/validation-runs`, avec heure UTC, durée, code de sortie et journal ; aucune suite lourde n'est exécutée simultanément.

## Ciblés et corrections

Le premier noyau clinique passe31cas/6fichiers en6,973s (`v213-clinic-2026-10-05T03-23-47.471Z-11872`). Les reprises de récupération corrigent les scènes dont l'horloge avait été déplacée sans les calendriers de feu/flore : aucune validation produit n'est assouplie. Le portage conserve l'ID et tout le dossier ; concassage, staging, sortie réelle, reprise et refus atomique de finition passent4cas dans `mechanoid-recovery-v213`.

Les premières reprises transversales ont révélé une garde de sentinelle limitée aux humains, corrigée pour les cibles mécaniques typées. Les dossiers, mandats de mêlée et champs futurs restent refusés sous193. Les tests d'expiration comparent le dossier réellement capturé et l'XP tient compte de l'oubli ordinaire, au lieu d'exiger une santé vide ou des compteurs figés.

À03:42UTC,11fichiers totalisent35réussis/2échecs d'oracle ; la reprise focalisée `v213-combat-optional-xp-2026-10-05T03-50-30.796Z-14732` passe les4cas de combat en4,903s. Il ne s'agit pas encore d'un passage général complet. La garde de forme des équipements archivés est remontée hors du bloc conditionnel de capture des IDs, avec refus atomique d'une clé mécanique future même indéfinie.

Le premier précontrôle du producteur de démonstration échoue en0,893s sur le calendrier obligatoire de grippe supprimé par la préparation (`v213-producer-probe-2026-10-05T03-50-05.715Z-24072`). Ce résultat bloque sa publication et le parcours natif jusqu'à correction ; il ne décrit pas une arrivée ou une défense exécutées.

## Producteurs, publication et navigateur

La première reprise conserve le calendrier de grippe et valide préparation/arrivée, mais la défense bornée échoue : l'horloge de panne héritée rattrapait45jours sur le générateur nouvellement préparé. Le diagnostic `v213-defense-diagnostic` conserve le World observé, où la panne au tick270091 laisse les canons sans alimentation et les munitions intactes. La préparation réadopte maintenant cette horloge au tick déclaré, sans rejouer un tirage historique.

`v213-producer-breakdown-reprise-2026-10-05T03-54-43.015Z-7628` passe en1,786s : préparation270090, arrivée270100 de deux machines intactes, dernier résultat270768 puis deux carcasses originales au270784 après récupération physique. Validation et sauvegarde/reprise exactes aux trois frontières. Publication de la seule nouvelle scène en0,865s ; SHA décodé `ac32a154928cb4f5d655d5a93e21cef267f0d1a888f1c1dd8a68a7c6425a81a4`. Elle ne contient aucune machine, balle, blessure, carcasse ou récupération préjouée.

Les12fichiers/40cas V213 passent en12,722s après publication (`v213-targeted-published-2026-10-05T03-55-11.524Z-25996`). Le test supplémentaire d'identité historique passe avec le groupe transport final en4,255s. Le build incluant typage passe en6,070s. Les chemins des commandes restent dans le registre horodaté ; ces résultats ne valent pas une suite générale complète.

Les trois parcours natifs passent dans un lancement105,331s (`v213-native-2026-10-05T03-55-44.101Z-13968`) : activation prospective sans apparition immédiate puis vraie occasion préparée ; inspection32parties, clavier et deux caméras ; tirs réels, checkpoint de balle en vol, impact mécanique puis neutralisation ; carcasse entière au portage, vrai travail au poste, checkpoints et sortie de13aciers au tick270907. Chromium matériel, WebGPU AMD/rdna-1, fallback=false, aucun incident ou erreur de page. Captures et preuves inspectées, préservées sous `tmp/validation-artifacts/v213-native`. Aucune performance GPU générale déduite des images.

## CPU observé

Diagnostic absolu en18,600s,12cas complets : carte250²,100humains/100animaux,0/1/16/64machines, inactives ou en staging accessible/inaccessible. Cinq chauffes puis dix mesures, captures neuves dans le microcoût, vrais ticks consécutifs dans le coût complet. Sources hashées et stables, validateurs avant/après, PRNG/IDs/historique/probes conservés. Le script mesure les budgets réels8recherches/32768paires : au plus8recherches et2400paires observées pour16/64machines, sans quota supplémentaire. Rotation/alternance restent celles du moteur.

Pour64machines, p50/p95 de décision isolée : staging accessible33,560/48,833ms ; inaccessible32,354/48,610ms. Ticks complets : accessible12,377/44,666ms ; inaccessible11,606/28,434ms. Les machines inactives et les fenêtres entre réexamens coûtent moins. Les humains ont leurs travaux désactivés et la faune ses besoins préparés ; cela sous-représente une campagne active. Le témoin0machine utilise le même moteur courant, sans ancien checkout : aucun gain V212→V213, débit×6 ni coût GPU nul établi. Dix échantillons ne prouvent pas une cadence de campagne ou l'absence de pic rare.

## Régression finale et identités

La suite hors campagnes longues (`v213-regression-2026-10-05T04-00-58.460Z-3376`) dure390,079s :532fichiers,2392réussis,19échoués et un ignoré. Les19échecs concernent14fichiers historiques : adoption Cassandra194 conservée dans des baselines déclarées plus anciennes ou transformées en camp, et deux attentes V212 fixées sur193. Les cinq producteurs de démonstrations retirent cette adoption uniquement dans leur mode historique explicite ; leurs sorties publiques restent inchangées. Les tests de refus, composition de raid, neutralité des migrations, flux RNG et profils gardent leurs assertions. Aucune migration ni validation produit assouplie.

La reprise des14fichiers, accompagnée des frontières mécaniques de sauvegarde/transport/agenda, passe58cas/17fichiers en22,179s (`v213-regression-historical-reprise-2026-10-05T04-11-48.583Z-23072`). Bilan par reprises : **532fichiers,2411réussis et un ignoré**, dont **41nouveaux cas V213**. Ce bilan ne signifie pas un second lancement général unique sur les sources finales.

La relecture ferme aussi une frontière réelle : le membre mécanique historiquement perdu ne peut pas réutiliser l'identité d'une archive humaine collectée tardivement. Decoder et sauvegarde complète revalident le groupe après collecte du namespace, sans appel global de validation par snapshot. Le test conserve l'état/révision après refus checkpoint/delta et refuse aussi serialization/import, puis reprend exactement le monde valide avec clôture par vrai `stepWorld`. Reprise finale persistence/transport et deux oracles V212 :10cas/4fichiers en6,663s (`v213-final-persistence-2026-10-05T04-09-22.213Z-26660`). La garde supplémentaire concerne seulement les groupes mécaniques actifs ; les anciens mondes ne reçoivent aucun nouveau propriétaire ni politique.

## Catalogue, build et présentation

Le catalogue complet passe en22,295s (`v213-catalogue-2026-10-05T04-10-15.058Z-16536`) :56entrées,55historiques byte-identiques au commitV212, manifestes historiques identiques, hashes des contenus décodés exacts, validation stricte puis reprise194 de chaque World. Seule la56escène et sa fiche sont ajoutées. Ni payload historique ni hash attendu réécrits.

Build final après garde de persistance et corrections historiques :6,072s (`v213-build-persistence-final-2026-10-05T04-16-10.070Z-24232`). Présentation250² :116,547s (`v213-presentation-2026-10-05T04-13-10.192Z-7364`), aucun saut/occupation solide/excès de déplacement dans le périmètre contrôlé. Le contrôle de présentation ordinaire ne mesure pas une campagne mécanique complète ou son coût GPU. Les captures natives ont été inspectées et préservées avant un nouveau lancement navigateur.

Documentation finale :727documents/7216liens locaux, six en-têtes courants194 et trois sources originales byte-identiques, en1,016s (`v213-docs-final-2026-10-05T04-18-30.651Z-24344`). Diff sans erreur d'espacement et143fichiers changés/nouveaux UTF-8 contrôlés sans caractère de remplacement ou corruption détectée. Le registre final avant commit totalise30commandes parent/806,337s, soit13min26s ; il ne mesure ni toute la rédaction ni l'activité des agents.

## Limites et cadence

Aucune campagne longue V213 exécutée ; les treize campagnes générales gardent leur statut distinct. Autres mécanoïdes/compositions, attaques à distance nouvelles, EMP, stratégies, butin de groupe et contrôle Biotech absents. Les adaptations mono-carte, coexistence des factions, horloge locale et portage sont documentées dans la référence. Aucun jalon global, parité exhaustive ou performance générale déclaré acquis.

La régression fournit aussi une mesure utile de méthodologie : imports1365modules/3641évaluations,270,63s cumulés et38% du temps suivi par Vitest ; exécution des cas59%, transformation2%. Ces temps sont suivis sur plusieurs workers et ne s'additionnent pas comme des parts exclusives de durée murale. Ils montrent un coût d'initialisation réel ; ils ne mesurent ni tokens/seconde ni la totalité du travail de lecture/intégration. Le lancement général ne représente qu'environ6min30 du lot. Les précontrôles producteurs ont ici arrêté les scènes invalides en quelques secondes avant les parcours natifs, tous trois réussis du premier lancement.
