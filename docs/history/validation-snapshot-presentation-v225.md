# Validation V225 — changements confirmés et scène des Aulnes

Lot engagé le 5 octobre 2026 sur V224 `8f3ef07f`, schéma 198 inchangé. [Contrat](../development/snapshot-presentation-v225.md), [recherche technique](../research/snapshot-presentation-v225.md). Les résultats suivants restent distincts de V224 ; la cible 240 FPS à 6× n'est pas acquise.

## Diagnostic

Copie exacte de V224 par archive Git, Vite privé5206 ; candidat courant privé5205. Checkpoint commun `public/test-saves/v224/les-aulnes-sieges.json`, tick6934,250²,14colons+Dorian,16animaux,18224ressources. Node24.11.1/Ryzen5 3600, Chromium headless matériel AMD/rdna-1,1920×1080,DPR1, caméra et qualité communes. Sessions utilisateur,62payloads publics, métadonnées et `references_UI` préservés ; caches sous `tmp/host-cache`. Root seul exécute les contrôles lourds, séquentiellement, via `validate:logged`.

`aulnes-v225-main-baseline-2026-10-05T21-18-23.389Z-24024` passe30,588s : profil main V224 sur cette nouvelle référence. Coûts propres échantillonnés : décodeur535,580ms, lecture naturelle491,564ms, updateResources288,999ms, applyWorld254,861ms. Ils ne sont pas les temps inclusifs ni une fréquence d'appels.

`aulnes-v225-adoption-baseline-2026-10-05T21-20-05.594Z-23588` passe40,578s. Sonde additionnelle,3s de préparation puis8s à1×/6×, arguments/retours/erreurs transmis à l'identique. À6× :153décodages et135applyWorld/8,021s,16,831applications/s,25,237ms moyens incluant updateResources12,544ms ; adoption6,456ms. À1× :48décodages/45applications, apply21,842ms et ressources9,440ms. Les sondes ajoutent des timers/allocations ; FPS instrumentés non utilisés comme comparaison ordinaire. Rapports et cpuprofile sous `tmp/performance-orientation-v225`.

Premier candidat : `aulnes-v225-adoption-initial-2026-10-05T21-32-35.791Z-11412` passe43,569s. À6×,126applications/141adoptions, apply24,095ms et ressources11,461ms ; faible réduction, débit3,899× contre4,239× dans la sonde A. Aucun gain FPS ou débit n'en reçoit crédit. La relecture révèle deux tris redondants de la partition temporisée ; ils sont remplacés ensuite par fusion ordonnée et tri uniquement à une entrée/sortie effective. Ce premier résultat n'est pas attribué au candidat final.

## Oracles et reprises

Premier groupe `aulnes-v225-targeted-initial-2026-10-05T21-26-14.922Z-21412` rouge24,842s :18cas passent, un refuse la fixture. Le diagnostic isolé rouge7,086s identifie un delta de croissance sur arbre legacy inerte sans espèce. La fixture reçoit une vraie identité oak avant croissance ; aucun garde n'est modifié. Reprise `aulnes-v225-targeted-retry-2026-10-05T21-27-38.734Z-8744` verte27,127s :5fichiers/28cas, journal/lectures naturelles et terrain/paint. Le motif de fichier terrain-state inexistant de l'essai initial n'ajoute aucun contrôle fictif.

Compléments après revue indépendante : patch silencieux suivi d'une autre forme, références courantes et ancienne vue intactes, mutation reverse/pop d'un tableau retourné, expiration64 avec véritable patch, entrées/sorties temporisées et feuilles à5999/6000. `aulnes-v225-natural-extra-2026-10-05T21-30-37.979Z-3352` passe7,079s. Typage initial `aulnes-v225-types-initial-2026-10-05T21-30-55.673Z-23160` passe7,829s. Après fusion ordonnée, `aulnes-v225-natural-merge-targeted-2026-10-05T21-34-33.425Z-19200` passe25,519s :6oracles naturels et trois oracles temporisésV224. Les12oracles du journal couvrent fabricant public absent, provenance faible, packed growth/upserts, suffixes sautés, refus tardif/stale, changement d'ordre/appartenance, checkpoints, epoch et éviction. Les tests de géométrie ne prétendent pas constituer des sauvegardes historiques.

## Mesures et limites

Premier banc `aulnes-v225-natural-abba-2026-10-05T21-35-42.964Z-20400` rouge41,711s : aucun timing crédité. Un WebSocket privé tente le port24678 déjà utilisé ; les serveurs SSR de reprise désactivent HMR. Le garde strict V224 refuse le World physique à6987,53ticks après la référence. Reproduction distincte `aulnes-v225-travel-reproduction-2026-10-05T21-38-43.200Z-8836` rouge27,471s, dernier valide6986 et état brut6987 conservés sous `tmp/performance-orientation-v225/travel-{last-valid,invalid}.json`.

Nils20340 traverse (97,88)→(96,87), clôture23621 : start6986,121067084908, end6992,363707772027, `terrainDelay:2`, cooldown5,363707772026828. Durée start+3√2+2 et cooldown end−6987 exacts, aucun intervalle ou facteur de vitesse. Le seul refus provient de la liste incomplète de suppléments du lecteur Pawn. La correction porte sur l'admission versionnée des suppléments existants, pas les mouvements ou données préparées. La reprise du banc emploie le même producteur/moteur/encodeur V224 et les paquets exacts, avec le lecteur strict corrigé explicitement pour valider la source ; aucune normalisation de World.

Premier contrôle physique `aulnes-v225-travel-targeted-2026-10-05T21-45-30.766Z-13588` rouge6,788s :6cas refusent une fixture déplacée sans mandat, trois passent. La fixture est corrigée avec les vrais ordres `draft` et `draft-move`, sans toucher aux gardes. Reprise `aulnes-v225-travel-retry-2026-10-05T21-47-07.716Z-11760` verte7,896s :9cas, vrais suppléments2/clôture et0,1/plancher brûlé, roundtrip et12ticks exacts, disparition du support, versions119/89 et leurs prédécesseurs, anciennes valeurs et corruptions refusées. Aucune crise du runtime n'est déduite du refus strict6987 : les états suivants peuvent redevenir admissibles quand l'arête se termine.

### Comparaison isolée finale

`aulnes-v225-natural-abba-final-2026-10-05T21-48-20.570Z-25012` passe133,100s : deux cycles A/B/B/A par charge, huit passes par charge, chacune48adoptions et40lectures après huit ticks de préparation. Les paquets proviennent uniquement du moteur/encodeur V224 ; la validation stricte corrigée admet les mêmes états physiques sans normalisation et le refus V224 à6987 est explicitement rejoué. Worlds, vues, changements ordonnés et anciennes frames sont exactement identiques. Fingerprints de sources/entrées identiques avant/après ; le rouge antérieur et ses manifests sont préservés. La désactivation HMR demandée n'empêche pas le warning WebSocket24678 de Vite ; il ne provoque aucun échec ni timing crédité supplémentaire.

Sur Les Aulnes : lectures naturelles13,773→9,609ms au cycle1 et14,787→10,587ms au cycle2, soit−30,2%/−28,4%. Adoption+lecture par publication19,473→15,585ms puis19,765→16,995ms, soit−20,0%/−14,0%. Le décodeur seul varie−5,2% puis+9,8% : aucun gain propre stable annoncé. Sur mixed100 : lecture2,580→0,081ms puis1,310→0,068ms ; ensemble5,096→2,719ms puis3,577→2,801ms. GC/outliers inclus, timing Node/Vite SSR isolé, aucune inférence directe de FPS.

### Comparaison matérielle ordinaire

Même checkpoint corrigé6934 et caméra iso-near,6× demandé, qualité complète, warmup3s puis8s, GPU timestamps désactivés. Ordre A1/B1/B2/A2 ; les mesures isolées précèdent B2, sans aucun contrôle lourd concurrent. Journaux `aulnes-v225-native-{a1,b1,b2,a2}` :29,972s/27,801s/27,233s/26,762s, tous verts. Les sources sont gelées pendant les passes ; les quatre fichiers natifs et la source du banc sont conservés dans `tmp/performance-orientation-v225`.

| Passe | RAF images/s | Débit réel | CPU frame moyen | CPU frame p95 | Adoption moyenne |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 V224 | 63,171 | 4,132× | 10,205ms | 34,4ms | 6,688ms |
| B1 V225 | 73,395 | 4,234× | 8,627ms | 30,0ms | 6,601ms |
| B2 V225 | 68,322 | 4,438× | 9,195ms | 29,5ms | 6,535ms |
| A2 V224 | 65,579 | 4,357× | 9,701ms | 32,6ms | 6,898ms |

Moyennes des deux passes :64,375→70,859RAF/s (+10,1%), CPU frame9,953→8,911ms (−10,5%). Les deux candidats dépassent les deux témoins dans ce cycle ; il s'agit d'un gain local mesuré, pas d'une garantie générale ou du FPS du moniteur utilisateur. Débit4,245→4,336× : variation faible face à la dispersion des passes, aucun gain général ni vrai6× certifié. Le budget à240FPS reste4,167ms/image ; les applications et adoptions synchrones le dépassent encore.

`aulnes-v225-global-boundaries-2026-10-05T21-52-25.383Z-15724` passe43,614s :28fichiers/142cas, snapshots/journal et refus atomiques, schéma/globe/groupe, structures full/sparse, runtime/worker/publication/recovery, vrais franchissements et sauvegardes, continuité/stagger/stun, catalogue, nature/cultures/terrain/paint/foliage.

### Sonde inclusive et contrôles finaux

`aulnes-v225-adoption-final-2026-10-05T21-53-28.137Z-16408` passe39,267s, sondes additionnelles sur les méthodes de scène, à évaluer séparément du cycle RAF ordinaire. À1× :48adoptions/45applications, apply19,231ms et ressources7,749ms (témoin21,842/9,440ms). À6× :124adoptions/113applications, apply27,799ms (médiane24,3ms, p9542,1ms, maximum243,4ms), ressources12,729ms, adoption7,595ms ; débit instrumenté3,342×. Les moyennes6× ne progressent pas et les fortes pointes restent ouvertes. Cette sonde ne prouve ni leur cause GC, ni un gain d'application général ; profils séparés requis pour attribuer ces pointes. La cible et les moyennes ne doivent pas masquer ce risque de confort.

Premier oracle public `aulnes-v225-public-and-travel-2026-10-05T21-54-26.980Z-11784` rouge35,664s sur `enclos-v119` après un tick : le runtime contient un champ optionnel `gatherId:undefined` que le format JSON omet. L'attente deepStrictEqual du runtime à la sauvegarde était trop forte ; la reprise doit comparer les valeurs persistées complètes puis les octets re-sérialisés exacts. Les Worlds producteurs candidat/V224 et les snapshots structurés restent comparés intégralement, y compris ces propriétés ; aucune donnée source ou garde produit n'est normalisé pour satisfaire l'oracle.

`aulnes-v225-native-save-recovery-2026-10-05T21-56-01.534Z-11072` passe77,981s : catalogue62, WebGPU matériel, quatre vues rapprochées, vrai worker à1×/6×, World strict, sauvegarde compressée/rechargement exact et nouvelle continuation. Le pilote privé V224 est réutilisé tel quel ; son outputDir temporaire de captures est remplacé par ce passage V225, puis copié sous `tmp/performance-orientation-v225/native-results`. Ces nouvelles images ne sont pas les images historiques V224 ; les journaux/rapports de ce lot antérieur restent inchangés. Les payloads et sessions utilisateur ne sont pas touchés.

Typage final `aulnes-v225-types-final-2026-10-05T21-57-39.942Z-13444` vert7,260s ; build `aulnes-v225-build-final-2026-10-05T21-57-50.720Z-27052` vert2,593s.

Reprise `aulnes-v225-public-and-travel-retry-2026-10-05T21-58-15.864Z-17604` verte86,841s :62payloads/métadonnées/octets exacts, migrations et sauvegardes strictes, un tick producteur intégralement égal au V224 figé, transport full/sparse exact et anciennes frames intactes. Le vrai checkpoint6987 est admis sans modification, puis12ticks jusqu'à6999 sont comparés au V224 complet/RNG ; sauvegarde et deux voies de transport reprennent les mêmes valeurs persistées à chaque tick. Nouveaux checkpoints full/sparse, sauvegarde et tick7000 sont également exacts. Les oracles de valeurs utilisent comparaisons complètes/sérialisation exacte, jamais les hashes seuls. Sortie distincte `public-oracles-v225-final.json` ; rouge historique conservé.

Présentation finale `aulnes-v225-presentation-final-2026-10-05T22-00-24.131Z-12312` verte129,440s : contrats de déplacement/action conservés, aucun saut, dépassement continu de trajet ou occupation solide observé. Ce contrôle de contrat n'est pas une mesure FPS du renderer natif.

Documentation finale `aulnes-v225-docs-final-2026-10-05T22-03-37.402Z-19448` verte1,231s :763documents/7594liens locaux,25domaines/cinq familles et six repères courants au schéma198, trois sources originales byte-identical. Les documents canoniques orientent vers cette preuve sans en recopier les journaux.

Aucun contrôle complet de campagne, parité Core ou gain GPU n'est acquis. Le prototype de namespace et la capture de prison restent privés non intégrés. Aucun port de langage ou changement de schéma/cadence/qualité/phases/commandes. La performance générale,240FPS et le vrai débit6× restent ouverts. La prochaine priorité reste le coût et les pointes des applications de scène, avec profiling causal avant nouvelle intégration. La capture locale exacte des intégrales de lumière répétées est une proposition à mesurer, pas un gain déjà livré.
