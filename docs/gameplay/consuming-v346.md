# V346 — Consommer un aliment choisi

14 octobre 2026. **Qualification ciblée acquise et produit livré**, schéma 234. L'action directe Consommer réemploie le kernel alimentaire et ses possessions réelles. Groupe167cas/12fichiers dont48nouveaux, corpus63références/66fichiers et deux scènes Chrome préparées passent ; huit checkpoints sont rechargés exactement. Cette preuve ne qualifie aucune ingestion naturelle de la réserve V345 ni récupération des blessés V344. Package inspecté et documentation **PASS1,258/1,263s** ; produit `f9f65b54` commité/poussé et [publié une seule fois en5afc7ff6](../development/cloudflare-pages.md#publication-v346--consommation-directe),104réponsesHTTPS exactes.

## Geste joueur, permissions et portée

Sélectionner un seul humain libre local, civil ou mobilisé, puis choisir **Consommer** sur une pile alimentaire réelle au sol, en réserve ou sur étagère. Plusieurs piles d'un même meuble restent des cibles distinctes. Aucune file ni quantité arbitraire demandée au client : `mealQuantity` capture la portion selon besoin, disponibilité et maxIngest, comme le repas ordinaire. Le plafond10 du transport ne s'applique pas ;14riz à faim30 et20à faim0 sont possibles si disponibles, bornes de sauvegarde75 et maxIngest de l'objet conservés.

Manipulation et Eating positives sont requises. Acteur à terre, mort, porté, en crise, vomissant, sous réaction immédiate ou récupération incompatible, ou pris dans un mandat de groupe/voyage occupé, est refusé. Les priorités professionnelles et le pacifisme ne conditionnent pas ce geste. Une activité interruptible est libérée avec ses cargaisons et claims physiques avant acceptation ; faute de dépôt possible, pas de mutation partielle.

Le régime excluant l'aliment, le cru/désagréable, le stock destiné aux détenus, la contamination et le vieillissement fournissent des avertissements distincts des impossibilités. Les besoins civils automatiques conservent leur régime. Zone civile et portes physiques restent applicables ; la mobilisation suspend l'effet de zone selon son contrat existant. Ni la commande acceptée ni l'avertissement ne garantit un chemin sûr.

Première tranche : FOOD_ITEMS, pile présente ground et portion unique. Pâte déjà produite au sol admise ; acquisition au distributeur, inventaires, drogues, corps, cannibalisme, animaux et DLC reportés. [Référence primaire et adaptations](../research/consuming-core-v346.md), préparées le13octobre sur Core1.6.4871rev590 ; aucune parité exhaustive revendiquée.

## Travail physique et interruptions

Le civil choisit une vraie place de repas par le fournisseur ordinaire. Le mobilisé conserve draftON et mâche à son contact réellement arrêté, seatnull, sans trajet vers une table ; une surface adjacente effective reste comptée. Une cellule de service déjà détenue, y compris par un visiteur urgent non encore libéré, ne reçoit pas le nouveau claim.

Phases pickup→choose-spot→travel→ingest : vraie source réservée, trajet, split/transfert et cargo exact, puis progression commune d'ingestion. Âge, dommage et contamination du split sont conservés. Nutrition, pensées, risque alimentaire et PRNG restent appliqués à la vraie fin, sans bénéfice à l'admission. Annulation, remplacement, changement de mobilisation, incapacité ou danger interrompent le mandat selon les sorties communes.

La revue a identifié deux gaps ciblés, corrigés avant reprise : la forme RAW du draft valide désormais lastActiveTick obligatoire/entier≤tick et holdFiretrue si présent ; l'interruption physiologique d'un repas forcé portant un cargo pendant une arête capturée retient le même objet au lieu de le déposer à l'extrémité logique avant l'arrivée physique. Le marqueur/mandat est retiré, interruptedCargo assure la custody existante ; ID, quantité, conditions et mouvement restent conservés. Les repas automatiques et leurs sorties historiques ne sont pas élargis.

## Sauvegarde et adoption

`NeedEat.forced:true`, `orders.active=consume`, filevide et destinations/files draftvides forment un mandat durable au **schéma 234**. Valider strictement233 avant migration neutre234 : aucune personne, portion, pile, besoin, motion, régime ou PRNG créé. Présence future du champ forced, même false/undefined, mode sans marqueur, phases paste/collect et champs étrangers refusés.

RAW et Decoder complet/delta vérifient le nouveau domaine avant adoption, avec acteurs et piles retenus+mis à jour. Sourceground, réservations cumulées, cargofood exact et unique, absence de meuble emballé porté, acteur local, segment capturé, place réelle et claims exclusifs sont indexés pour cette adoption. Aucun validateur World complet ni scan consommateurs×personnes sur MAIN ; domaine absent sans construction des index de consommation. L'exception historique d'omission gatherId reste seule admissible dans le corpus. Ce garde ciblé ne constitue pas une mesureFPS générale.

## Contrôles ROOT, rouges et conservation

ROOT seul exécute séquentiellement sur sources/tests/pilotes figés. Le premier groupe reste **RED32,679s**,156/162cas/12fichiers : cinq fixtures invalides de nouveaux cas et un oracle V343 attendant encore le numéro233. Les corrections concernent matière du small-shelf, durée stun45, rot sur bois, anneau de huit cellules au sol pour la source, priorité de transport et assertion de migration au schéma courant. Les deux gaps de revue ci-dessus ont leurs adversaires dédiés ; cinq cas sont ajoutés à la reprise. Aucun rouge initial n'est effacé ou transformé implicitement en PASS.

| Contrôle ROOT | Résultat acquis ou restant |
| --- | --- |
| Typage initial | **PASS17,173s** |
| Groupe initial | **RED32,679s**,156/162cas/12fichiers, conservé |
| Typage après correctifs | **PASS16,143s** |
| Groupe repris | **PASS34,831s**,167cas/12fichiers dont48nouveaux :44dédiés et4 UI ROOT |
| Corpus public | **PASS79,664s**,63références/66fichiers, un vrai tick au schéma 234, recharges/snapshots stricts et publics inchangés |
| Chrome natif, backend non relevé | **PASS76,299s**, deux scènes préparées32×32, huit recharges exactes, erreurs[] ; corps civil36,654s/mobilisé32,843s |
| Revue visuelle | Cinq PNG inspectés ROOT |
| Pages build | **PASS2,555s** après typage sur sources exactes |
| Gel |2874exact vérifié ROOT, puis2875final avec seul ajout du vérificateur privé ; aucune source changée après typage16,143s/natif |
| Package final | **PASS1,599s**,516fichiers/119470631octets,63références/66chemins publics exacts, laboratoire absent/targetedForbidden[] |
| Gate documentaire, commit/push et publication | **PASS1,258/1,263s**, produit `f9f65b54` poussé/publié une fois5afc7ff6 ;104réponsesHTTPS exactes |

Le civil porte14riz puis mange à table au3040 ; fin3091, cargo consommé,16riz sources restants, événement d'ingestion réel et absence de pensée sans-table. Le mobilisé pacifiste, régime « Rien », choisit14riz sur étagère, mange à son contact au3026 et termine3077 ; mobilisation conservée,3rations de survie restent inchangées. Les deux scènes sont préparées, sans assimilation à la campagne naturelle. Le pilote conserve le canal Chrome mais n'a pas enregistré le backend du renderer dans ses résumés : ces preuves qualifient Chrome natif, sans certification WebGPU ou WebGL. Le choix automatique dans le code ne prouve pas le périphérique actif de ce passage. Cette correction concerne seulement la portée documentaire ; aucun contrôle inchangé n'est rejoué pour lui attribuer rétroactivement un backend.

| Scène et checkpoint rechargé exactement | Tick | SHA256 |
| --- | --- | --- |
| Civil — approche |3000| `0fdb7cc4b52a7413842b52cb8bcde7ebf04304e41bbcf1fd2fe7a9917cc2b689` |
| Civil — cargo |3025| `109e4e1f7c2a97bfc60014faedf6df8fd39204c48feae41b6de6119bb7dc084a` |
| Civil — ingestion |3040| `3845cf7d805277e88cdc2f4026bb887288df883e0e8f84ccdbf76225ebbd545e` |
| Civil — final |3091| `d0b40ecaa0ec45ae379afe5aa0ceb61a678796268305f28e3a09c19efbbfbcc5` |
| Mobilisé — approche |3000| `c8e9df6b1ec1fb22643b6439548276e4276eb48cfec0cc4c19ec007895d7a1dd` |
| Mobilisé — cargo |3025| `93e19eaece2b30b59e815100d1d3d5f5cae979fe4bb57d17e541a729363377c5` |
| Mobilisé — ingestion au contact |3026| `4a6bb3a6b19a1f729588b153dd43a0ee7980cde20cd7a43d91f4a2080e1ef9c0` |
| Mobilisé — final |3077| `2aa9b2753d04448a06bf8b91da950d327b37a20c96d983d68b73311717e36941` |

Résumés/exports/captures dans `tmp/early-access-v346/native/consuming-v346-V346-prepar-4cc15-civil-real-pile-consumption/consuming-summary.json` et `tmp/early-access-v346/native/consuming-v346-V346-prepar-1bcd2-afted-real-pile-consumption/consuming-summary.json`. Rapports ROOT `tmp/early-access-v346/native-report.json`, `public-corpus-report.json` et gels conservés séparément. Les huit recharges ne recomptent aucune preuve héritée. Package : `tmp/elsewhere-pages/v346-package-mPaVsw/report.json`, label `v346-package-2026-10-13T22-18-33.586Z-5192` ; inspection seulement, sans livraison ou publication encore créditée.

Aucun FPS, ingestion naturelle de [V345](colony-reserve-v345.md), récupération clinique de [V344](colony-recovery-v344.md), autonomie alimentaire, campagne entière ou early access100% certifiés. V34588297f86 poussé conserve son rouge borné et son export final non rechargé. Poursuite autonome ACTIVE après validation/commit/push : V347 prépare une copie distincte de la réserve58111 pour un repas forcé borné ; cette préparation privée n'a encore aucun résultat acquis. Publication unique acquise en5afc7ff6 après commit/push ; preuve et limites dans la note de publication. V347 reste préparé sans acquisition native.
