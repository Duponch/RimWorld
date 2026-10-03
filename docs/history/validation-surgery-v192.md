# Validation — Chirurgie thérapeutique V192

3 octobre 2026 ; schéma **179**. [Contrat](../development/surgery-v192.md), [recherche Core](../research/surgery-core-next.md). Core local **1.6.4871 rev590**, DLL SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, installation en lecture seule ; miroirs publics recoupés sans attestation de cette révision. Une première amputation thérapeutique de membre directement infecté relie intention du patient, lit, médecin, dose, anesthésie, travail, issue anatomique et suites médicales. Aucun jalon global ni catalogue chirurgical complet n'est clôturé.

## Contrôles ciblés et diagnostics

**168 contrôles ciblés uniques dans vingt-trois fichiers passent, par composition de reprises.** La passe finale principale conserve **167 réussis et un échec** dans `tmp/surgery-v192-targeted-final.log` ; le fichier d'ordres historiques réparé passe ensuite **4/4** dans `tmp/surgery-v192-orders-repair.log`. Ce n'est pas une nouvelle passe intégrale verte, ni la régression exhaustive. Les tests cliniques, commandes, réservations, caravanes, secours, nutrition, sauvegardes, snapshots et présentation pure concernés sont exercés ; campagnes naturelles longues non rejouées.

Sept fichiers de tests historiques sont entretenus : care, feeding, health-world, self-tending, urgent-care, pod-rescue-transport-v187 et player-orders. Leur reconstruction de schémas anciens avait conservé les nouvelles permissions viande/fourrure de renard. Le filtre indépendant déjà utilisé retire ces champs futurs avant la reconstruction historique ; validateurs stricts et assertions métier restent inchangés. Aucun fichier de sauvegarde historique ou original de référence n'est réécrit.

Deux erreurs de préparation du scénario opératoire ont été diagnostiquées séparément. Avec le flux initial1, l'opération n'était pas bloquée : elle avait effectivement échoué de façon catastrophique au tick3314. Le checkpoint et diagnostic sont conservés sous `tmp/surgery-v192-failed-checkpoint.json` et `tmp/surgery-v192-diagnosis.log`. Le témoin de réussite utilise désormais le flux2 fixé **avant** toute simulation ; un contrôle distinct conserve le flux1 et vérifie dégâts réels, apprentissage, dose consommée, anesthésie et absence de réessai. Le témoin d'alimentation préparait un patient éveillé qui se nourrissait légitimement seul ; il prépare désormais une incapacité clinique après admission physique, explicitement distincte de l'anesthésie opératoire.

Les nouveaux oracles contrôlent notamment : admissibilité directe, infection immunisée encore présente, quatre racines anatomiques, protection des parties vitales/cerveau, dégâts intérieurs, branche catastrophe et mort réelle, travail dynamique et XP seulement à finition, PRNG engagé au résultat, dose unique, annulation avant/après administration, propriétaire du cargo interrompu, priorités patient et médecin, patient/chevet exclusifs, alimentation réelle, soins postopératoires, ordres en file, sauvegarde à chaque phase et migration178 strictement neutre. L'horloge anesthésique est contrôlée avec la phase de l'identité, y compris dossiers morts figés et rejet atomique d'un snapshot d'une autre cadence pourtant plausible.

Une revue indépendante finale n'identifie pas de défaut bloquant de conservation, réservation, décès ou reprise. Cette revue ne remplace pas les scénarios exécutés. Le build avec typage passe : **663 modules**, `tmp/surgery-v192-build.log`. L'avertissement de bundle supérieur à500kB subsiste ; il n'est pas une erreur de compilation.

## Parcours natif et présentation

Le parcours final **Chromium153.0.8010.12 natif WebGPU, 1/1**, ouvre les **42 entrées du catalogue public réel**, sans interception du manifeste ou de la sauvegarde. Santé exerce annulation puis demande, marche au lit, collecte/portage d'une dose, chevet, administration, travail, amputation et tending supplémentaire, avec sauvegardes/reprises physiques. Journal `tmp/surgery-v192-native-final.log`, rapport `tmp/test-runs/surgery-v192-native-final/artifacts/surgery-v192-native.json`. Le premier essai candidat, également1/1, utilisait un catalogue injecté et des captures éloignées ; il ne constitue pas la preuve de publication ni les gros plans retenus.

Chronologie finale : départ3000, trajet patient repris3002, dose portée reprise3071, travail repris3096, amputation3323, soins postopératoires repris3458. Les trois doses initiales deviennent deux à l'administration, puis une après tending de la racine fraîche ; aucune dose fictive ou gratuite. La demande et tâche disparaissent à l'issue, l'anesthésie reste présente. Le masque de Basile passe0→1 au résultat ; Céleste conserve le témoin préparé de jambe droite manquante8. **77→77 pipelines**, même géométrie humaine541 et trois instances aux huit checkpoints. Le probe conserve les **4096 dernières images**, capacité plafonnée, et ne fournit pas le nombre total d'images du parcours ni une mesure GPU. Aucune erreur JavaScript/WebGPU enregistrée ; les avertissements Three.TSL historiques restent visibles au journal.

Gros plans iso et perspective obtenus par gestes réels de caméra, sans mutation du monde : rayons projetés45,56px en iso,63,60/55,27px en perspective. Captures `surgery-v192-arm-leg-iso.png` et `surgery-v192-arm-leg-perspective.png` dans le même répertoire d'artefacts ; relues visuellement, patient couché avec un seul bras et témoin debout avec une seule jambe, portraits cohérents. Le FPS ponctuel visible dans les captures n'est pas une preuve de débit soutenu.

La silhouette encode les quatre membres manquants dans le mot de forme existant ; indices, normales, ombres, sleeves, mains, chaussures et portraits suivent cette absence. Aucun squelette, AnimationMixer, attribut d'instance ou lot par personne ajouté. L'animation et `medical.tend` existants utilisent uniquement la phase de travail confirmée, sans nouvel asset audio. Un nombre stable de pipelines ne prouve pas un coût GPU nul.

`npm run test:presentation` passe ensuite sur **250×250**, vitesses6→1→3 et commandes réelles de minage/abattage ; journal `tmp/surgery-v192-presentation.log`. Minage **7788 images**, p50/p95/p99 RAF **6,0/6,2/6,6ms**, maximum17,5ms ; abattage **7762 images**, **5,9/6,1/6,6ms**, maximum36,1ms. Zéro saut, excès continu ou occupation solide dans les deux parcours. Ce banc contrôle la continuité des phases existantes, pas tous les gestes chirurgicaux ni un temps GPU isolé.

## Mesures CPU isolées

Banc `scripts/benchmark-surgery-v192.ts`, rapport `tmp/surgery-benchmark-v192.json`, journal `tmp/surgery-v192-benchmark-final.log`. Windows10.0.26300, **Ryzen5 3600, douze processeurs logiques, environ16GiB**, Node24.11.1. Carte préparée **250×250**, acteurs sains au repos sans demande ou tâche ; un autre monde contient un seul patient/opérateur aux checkpoints atteints par les transitions réelles. Pièce témoin25×25, topologie amorcée hors mesure ; nouvelle capture de propreté/extériorité mesurée à chaque consultation. Sources gelées, CPU puis navigateur puis présentation successifs, sans arrêt des applications utilisateur.

Quatre créneaux tournants, vingt échantillons par créneau, cinquante consultations par échantillon, cinq échauffements. **Mesures absolues, aucun comparateur historique/A/B.** Millisecondes par unité indiquée ; plages des quatre créneaux :

| Consultation | p50 | p95 | Unité et limite |
| --- | --- | --- | --- |
| Réconciliation32 sains | 0,000990–0,001020 | 0,001146–0,001532 | Une consultation World, aucun médecin actif. |
| Réconciliation200 sains | 0,004774–0,005654 | 0,005566–0,007996 | Une consultation World, pas un tick complet. |
| Réconciliation200, collecte opératoire | 0,073606–0,075438 | 0,083482–0,126646 | Un seul opérateur actif. |
| Réconciliation200, travail opératoire | 0,043570–0,044842 | 0,067756–0,071764 | Un seul opérateur actif. |
| Lecture200 dossiers anesthésiés | 0,317422–0,328630 | 0,394010–0,455952 | Deux cents `assessMedical`, pas un surcoût différentiel. |
| Avancée200 dossiers de20 ticks | 2,138276–2,191122 | 2,484490–3,271748 | Copies privées, tout le noyau clinique représenté. |
| Capture résultat dehors | 0,201908–0,207194 | 0,245582–0,366642 | Propreté et extériorité, topologie déjà capturée. |
| Capture résultat pièce625 cases | 0,305490–0,316968 | 0,372050–0,516766 | Même consultation ; aucun second flood extérieur. |

Toutes les consultations en lecture conservent World et PRNG ; les avances médicales60 ticks et3×20 donnent des dossiers identiques sans tirage. **1344 empreintes source/test/outillage** avant et après sont identiques ; empreinte de leur dictionnaire trié compact `aab92b2e2c347ba769e912bbe3338405eeadef90941fa28a1cf098bc43d6027a`. Le premier lancement a échoué **avant mesure** sur des acteurs synthétiques en déplacement sans tâche ; la préparation a été corrigée en témoins sains au repos, sans réparation produit ni valeur issue de ce lancement invalide.

Ces nombres n'établissent pas le coût du planificateur, de tous les médecins simultanés, du tick/worker complet, des publications, du CPU image, du GPU ou des FPS. Aucun gain général n'est revendiqué, ni coût nul. Aucune campagne naturelle longue ou mesure GPU isolée pour V192.

## Scène publiée et documentation

La **42e colonie publique**, « Chirurgie thérapeutique ·3 colons », est accessible dans Charger → Colonies de test. Scène préparée32×32, graine42, tick3000, flux initial2 : Basile porte une infection directe du bras gauche déjà tendue ; Ada possède Médecine8, un vrai lit médical et trois doses industrielles disponibles. Céleste porte une ancienne jambe droite manquante et soignée, **témoin graphique explicitement préparé**, sans opération accomplie par le lot. Demande, trajet, dose, anesthésie et résultat ne sont pas accordés par la fixture.

Fichier `public/test-saves/v192/chirurgie-therapeutique.json`, SHA-256 **`80a90c43366e56adc5495fa2f53e47a11efe1d15404288c0cf5830557ed1de9e`**. Les **42 payloads publics**, décompressés lorsque leur enveloppe l'exige, passent empreinte annoncée, validation/migration strictes et roundtrip exact au schéma179 ; rapport `tmp/v192/public-catalogue-check.json`. Les41 fichiers historiques restent inchangés. Contrat, recherche, guide, catalogue, architecture, inventaire et roadmap distinguent cette boucle des greffes/prothèses, organes, effets secondaires anesthésiques et autres patients encore différés.

Les journaux, rapports détaillés, checkpoint de diagnostic et captures restent sous `tmp/`. Cette preuve conserve leur protocole et leur périmètre ; elle ne certifie pas une partie naturelle, toute la suite ni une parité Core exhaustive.

Typage final, après les dernières modifications de capture, passé dans `tmp/surgery-v192-typecheck-final.log`. `npm run check:docs` passe : **660 documents,6271 liens locaux**, six en-têtes au schéma179,25 domaines/cinq familles et trois originaux byte-identiques ; journal `tmp/surgery-v192-docs.log`. `git diff --check` ne signale pas d'erreur. Aucun push automatique.
