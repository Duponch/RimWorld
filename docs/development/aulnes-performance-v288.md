# V288 — présence spatiale compacte pendant les validations

Après [V287](aulnes-performance-v287.md), la présence des ressources utilisée par les validations de production emploie un tableau dense local à la validation. Le moteur, le rendu, les règles, la cadence, le schéma 218 et les 63 sauvegardes restent identiques. Le candidat électrique essayé dans ce lot est écarté.

## Changement retenu

Au premier besoin, les coordonnées entières contenues dans une carte de dimensions entières positives et d'au plus 1 048 576 cellules sont inscrites dans un `Uint8Array`. Les deux axes sont vérifiés avant linéarisation : aucune coordonnée hors carte ne peut devenir l'alias d'une autre ligne. La capture sert uniquement à répondre à la présence d'une ressource ; quantités, propriétés, capacité et réservations restent contrôlées comme avant.

Les coordonnées atypiques restent dans le Map/Set historique, sans arrondi ni seconde lecture. `NaN`, infinis, fractions, `-0`, doublons et trous gardent les réponses du contrat V287. Une entrée nulle conserve son repli vers le parcours historique et ses exceptions. L'occupation géométrique n'est pas modifiée. Aucun cache ne survit à la validation ou à une mutation du World.

Cette capture est réservée au World reconstruit du transport ; les validateurs ordinaires gardent leurs parcours historiques. Le premier accès lit désormais les dimensions : aucune équivalence d'observation n'est revendiquée pour des accesseurs arbitraires sur ces dimensions. Les tests rendent cette frontière explicite.

## Coût CPU et piste écartée

Les deux expériences utilisent la base exacte V287 `212681f6`, des feuilles gelées aux URL canoniques et deux corpus préparés par 32 ticks ordinaires : Aulnes intégrées 8434→8466 et ancienne référence 6934→6966. Pour chacun, quatre processus frais ABBA, quatre deltas de chauffe et 28 mesures. Le coût inclut création des index, clonage et adoption complète.

Le premier candidat combinait l'index dense avec une comparaison par fragments de la clé électrique historique. Il conserve les lectures, coercitions et collisions de clé dans le domaine des intrinsics ordinaires, mais augmente le coût total de **3,72 %** sur l'intégrée et **4,81 %** sur l'ancienne. Il est rejeté ; le cache électrique du produit reste V287. Gel `98FE2CD6`, rapport `tmp/performance-v288/decoder/cost-IecMyz/report.json`, PASS 93,693 s. Aucun GAME n'est lancé pour ce combiné.

Une comparaison distincte isole ensuite l'index dense :

| Coût moyen, Aulnes intégrées | V287 | Dense seul | Variation |
|---|---:|---:|---:|
| Adoption |17,184 ms|16,681 ms|−2,93 %|
| Clone + adoption |22,456 ms|21,917 ms|−2,40 %|

Chaque passage B est meilleur que chaque A sur l'intégrée ; p95 total presque inchangé, 28,458→28,398 ms. Sur l'ancienne référence, l'agrégat total baisse de 7,97 %, mais A2 est plus lent et le clonage non modifié varie aussi : aucun gain stable de cette ampleur n'est attribué à l'index. Froids dispersés, avec B légèrement plus lent que A1 : aucun bénéfice froid annoncé.

Les 33 vues retenues par cohorte restent exactes par sérialisation ; graphes initial/final, sauvegarde/rechargement et un vrai tick de reprise sont exacts aux ticks 8467/6967. Gel dense `B7343D27`, `tmp/performance-v288/decoder/freeze-56rJUj/manifest.json` ; rapport `decoder/cost-GEIuko/report.json`, PASS 95,601 s. Ces coûts Node ne sont pas des mesures de rendu ou de FPS.

## Mesure dans Chrome

Quatre parcours GAME A/B/B/A, Chrome matériel AMD/WebGPU, 2560×1440/DPR1, Vite dev, même checkpoint 8434, caméra orthographique 129/122/zoom1 et réglages initiaux. Navigateurs et serveurs privés neufs, chauffe 3 s puis mesure 10 s.

| Passage | RAF/s | Vitesse effective | p95 des intervalles | Reprise exacte |
|---|---:|---:|---:|---:|
| V287 A1 |73,25|6,046×|30,2 ms|8909|
| V288 B1 |79,58|6,015×|27,7 ms|8913|
| V288 B2 |85,18|6,016×|27,9 ms|8911|
| V287 A2 |76,75|6,012×|29,1 ms|8908|

Fenêtres cumulées : **75,00→82,38 RAF/s, +7,39/s (+9,85 %)**. Débit confirmé 6,029→6,015×, différence de −0,23 %. Moyenne des p95 29,65→27,80 ms ; pires intervalles B 54,4/49,9 ms. Les deux B dépassent les deux A, mais la taille du gain reste celle de ce banc local. Aucun cumul arithmétique avec les pourcentages V286/V287, aucune extrapolation à toutes les cartes ou caméras.

**240 FPS et la fluidité constante ne sont pas atteints.** Les RAF headless ne certifient pas le scanout d'un moniteur 240 Hz. Aucun gain GPU mesuré. WASM reste conditionnel à un noyau coûteux identifié ; les recherches d'objets évitées ici n'en établissent pas un.

## Validation

62 cas dans neuf fichiers passent en 10,367 s, dont cinq nouveaux tests dense et six tests différentiels du candidat électrique ensuite archivé. Le produit retient uniquement les cinq tests dense ; les contrôles de staging V287, production, énergie, hydroponie, biocarburant et snapshots passent ensemble. Typage 5,821 s, puis build du candidat dense seul 2,018 s. Les tests électriques privés et les gels initiaux restent conservés, sans être présentés comme une fonctionnalité livrée.

Le GAME passe en 211,636 s : `tmp/performance-v288/native/abba-bmjOaj/report.json` et ses quatre rapports liés. Sources et fichiers publics exacts, erreurs vides, quatre sauvegardes/reprises exactes, navigateurs et port 5321 privés fermés. Le profil MAIN optionnel est capturé après la mesure B2 et sa reprise ; son analyse pondérée stricte échoue sur un delta de −21 µs parmi 6 807 échantillons. Ce profil n'entre pas dans les chiffres RAF et aucun nouveau poids CPU n'en est déduit. Profil brut et diagnostic `tmp/performance-v288/profile-diagnostic.md` conservés ; pas de seconde campagne GAME pour cette seule anomalie d'analyse.

Les 63 sauvegardes publiques passent en 45,434 s : lecture stricte/migration, hash, checkpoint/delta, ancienne vue retenue et reprise d'un tick exacts. Rapport `tmp/performance-v286/public-check-KToGE6/report.json` : script existant, sortie nouvelle distincte. Aucun fichier public ou catalogue modifié.

La campagne commune de présentation V287 n'est pas rejouée : aucun changement de rendu, d'horloge ou de mouvement dans ce lot ; le vrai GAME contrôle la présentation actuelle et les reprises. Les journaux sont sous `tmp/validation-runs/performance-v288-*`.

Le premier contrôle documentaire signale le schéma absent de l'en-tête V288 du README ; mention rétablie, reprise PASS en 0,801 s (895 documents, 8 514 liens), journal rouge conservé. Aucune modification produit en découle.

## Suite bornée

Le profil valide V287 reste la référence causale du MAIN. Une comparaison directe des champs électriques primitifs, toujours relus et avec les coercitions atypiques préservées, mérite une étude distincte : le candidat rejeté reformatait encore tous les champs. Les anciens déplacements de validation entre Workers et propriétaires gelés ont déjà coûté plus cher ; aucune reprise automatique de ces prototypes. Toute refonte doit montrer un coût supprimé, son budget source et le maintien du vrai ×6 avant adoption.
