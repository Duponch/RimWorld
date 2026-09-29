# Douze cues sonores publiés — travaux restants, suivi V149, 29 septembre 2026

Le manifeste inscrit maintenant **12/12 IDs** du [plan SFX](../../scripts/audio/sfx-plan.json). Les quatre nouveaux fichiers locaux accompagnent les cues existants de fabrication à l'établi, couture, boucherie et recherche. Ils n'ajoutent ni action, objet, production, état de sauvegarde ou règle Core. Musique et voix restent absentes.

## Provenance des quatre fichiers

Chaque ID a reçu **un candidat retenu**, généré via le nœud SFX MCP ElevenLabs avec `eleven_text_to_sound_v2`, sans boucle, au format MP3 stéréo 44,1 kHz / 128 kb/s. Le [journal de génération](../../scripts/audio/generation-log.json) conserve pour chacun le prompt exact, l'identifiant, les paramètres effectifs, le coût rapporté et l'empreinte. Les coûts ci-dessous, **9 crédits rapportés au total**, ne sont pas un relevé indépendant de la facture du compte. Les mesures PCM portent sur les fichiers isolés avant gain de lecture.

| Cue et fichier | Génération / SHA-256 | Demande / mesure PCM | Lecture dans le manifeste |
| --- | --- | --- | --- |
| `crafting.work` — `crafting-work-v1.mp3` | `bRDwPzWTrssXICxNVLTN` / `de0aece3346b3c63fed6fb183e012116b7503dfab7aad31d2e1321d00d6952e8` | 0,70 s, influence 0,75, **2,3333 crédits** ; 0,68 s décodée, crête −4,4 dBFS, RMS −23,6 dBFS | gain **0,3**, portée **16 cases** |
| `tailoring.work` — `tailoring-work-v1.mp3` | `zGld8bVyGg5M4hkEIy03` / `a2d9e74e3d1194b727852a039569fbe846960a7391013e5b9f3a45c9849ecd13` | 0,65 s, influence 0,75, **2,1667 crédits** ; 0,64 s décodée, crête −1,1 dBFS, RMS −28,9 dBFS | gain **0,7**, portée **14 cases** |
| `butchering.work` — `butchering-work-v1.mp3` | `3cAeAiirSw2MP2V8Vse3` / `3b60367fba41e369850c8005ed1bea86b6628d1fd0ff59a0a05bfdd9f3f0ccfb` | 0,65 s, influence 0,65, **2,1667 crédits** ; 0,64 s décodée, crête −0,6 dBFS, RMS −20,9 dBFS | gain **0,25**, portée **16 cases** |
| `research.work` — `research-work-v1.mp3` | `cc7pYjN8HUeirLSRoOJK` / `922cab0ce91ef59ad069f01c961d234c219ad553b0b10beead9846c84156cfbb` | 0,70 s, influence 0,65, **2,3333 crédits** ; 0,68 s décodée, crête −9,0 dBFS, RMS −30,8 dBFS | gain **0,8**, portée **14 cases** |

Les prompts visent respectivement une lime sur pièce métallique, aiguille et ciseaux sur tissu, coupe contrôlée sur planche, et note au crayon avec faible contact de verre. Ces descriptions sont des **demandes de génération** ; seule une écoute peut confirmer le timbre obtenu. Les quatre fichiers se décodent sans échantillon classé écrêté dans le contrôle PCM local, sans garantir l'absence de distorsion perceptible.

## Mix et validation de l'intégration

Les contacts de travail d'un **même cue** situés à moins de **cinq cases** ne superposent plus le même enregistrement ; le moteur admet au plus **trois voix simultanées par cue de travail**. La règle couvre minage, coupe de bois, construction, cuisine et les quatre nouveaux travaux. Les cues de combat ne suivent pas ce regroupement. Le contrôle s'effectue sur le lot borné des contacts arrivés à échéance, sans recherche métier par image ; aucun gain CPU/RAF/GPU n'a été mesuré.

- `generate-sfx.mjs --dry-run` passé : **12/12 fichiers publiés**. Tests du validateur d'assets : **8/8**.
- Tests audio/bridge ciblés : **41/41 dans deux fichiers** (`tests/audio-v149.test.ts`, `tests/bridge-audio-cues.test.ts`). Le bridge vérifie les quatre nouveaux cues ; les tests audio couvrent le regroupement par type.
- Build avec typage passé ; Vite a transformé **609 modules**. `npm run check:docs` passé : **552 documents, 5 404 liens locaux, 25 IDs de domaine et cinq familles de validation** ; schéma courant 156 et trois sources originales byte-identiques.
- Chromium audio : **3/3 en 56,6 s**, avec **12 MP3 décodés**, essai/Options et vrai contact de minage dont le PCM est contrôlé après le mix. Ce parcours n'a pas observé les quatre nouveaux travaux en scène.

Aucune écoute humaine des quatre nouveaux sons ou du mix des travaux n'a été faite. Les campagnes longues et la régression complète n'ont pas été rejouées pour ce suivi ; aucune mesure de performance ni de FPS ne lui est attribuée. Les [preuves de construction](validation-audio-construction-v149.md) et des lots précédents gardent leurs décomptes historiques.
