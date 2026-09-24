# Publication Netlify

V100 : déploiement de production `6ab5a9a7e4d26356179e4f23`, 25 septembre 2026 (date locale). [Refonte visuelle et contrôle du bundle public](../history/validation-interface-v100.md).

V99 : déploiement de production `6ab5a08e252bef16783b20b9`, 25 septembre 2026 (date locale). [Validation des interactions et contrôle public](../history/validation-interaction-v99.md).

Le site du jeu est **https://lisiere-duponch.netlify.app**, projet Netlify `lisiere-duponch`, identifiant `9c1b98b5-68a5-4242-b1ec-3bc193b93445`, compte `duponch`. Aucun autre site du compte n'est modifiÃ©.

La recherche des connecteurs disponibles n'a trouvÃ© aucun outil Netlify callable. L'API officielle a permis de publier avec la connexion Netlify locale existante ; aucune intervention ni transmission de secret par l'utilisateur n'a Ã©tÃ© nÃ©cessaire. Sources : [API de dÃ©ploiement](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/) et [spÃ©cification officielle](https://open-api.netlify.com/), consultÃ©es le 21 septembre 2026.

## Publication reproductible

1. Valider puis lancer `npm run build`.
2. Lancer `node scripts/deploy-netlify.mjs --prod`. Sans `--prod`, la publication reste un aperÃ§u.
3. VÃ©rifier la rÃ©ponse HTTPS, les fichiers et le parcours de crÃ©ation/chargement sur le site rÃ©ellement publiÃ©.

Le script lit `NETLIFY_AUTH_TOKEN` ou la connexion CLI existante dans la configuration locale Netlify. Il ne copie ni ne journalise le jeton. `.netlify/state.json` est local et ignorÃ© par Git. Le projet et le compte sont contrÃ´lÃ©s avant publication. `--create-site` n'est prÃ©vu que pour la premiÃ¨re crÃ©ation ; aucun remplacement implicite d'un site existant.

Seul `dist` est inventoriÃ© : empreintes SHA-1, envoi des fichiers demandÃ©s, puis attente de l'Ã©tat `ready`. Les liens symboliques sont refusÃ©s. `artifacts/netlify-latest.json` contient un rÃ©sultat sans secret ; une copie datÃ©e conserve la preuve de livraison. `netlify.toml` dÃ©clare le build Vite, le rÃ©pertoire public et Node 22. Les illustrations Ã  noms stables sont revalidÃ©es Ã  chaque nouvelle navigation ; le reste des assets a un cache d'une heure.

Cette configuration publie Ã  la demande. Elle ne prÃ©tend pas avoir connectÃ© un dÃ©ploiement Git automatique. Le bundle de production n'expose pas le diagnostic `window.__lisiere` des tests.

## Badge et contrÃ´le rÃ©el

Le premier contrÃ´le public a rÃ©vÃ©lÃ© un iframe `nl-badge-frame` injectÃ© par Netlify au-dessus du bouton Menu. Le rÃ©glage de ce seul projet `built_with_badge_enabled` est dÃ©sactivÃ© par l'API ; aucune modification de forfait ni contournement CSS. Ce rÃ©glage est prÃ©vu par la [documentation officielle du badge](https://docs.netlify.com/manage/projects/powered-by-netlify-badge/), consultÃ©e le 22 septembre 2026, et prend effet Ã  la requÃªte suivante sans redÃ©ploiement.

`node scripts/smoke-netlify.mjs` contrÃ´le la version publique dans Chromium natif : accueil, vraie crÃ©ation de partie, cinq dossiers, registre Ressources Ã  216 px, portrait sÃ©lectionnÃ© lisible, sauvegarde/rechargement, trois panneaux sans dÃ©bordement, six colonnes Faune, 60 pictogrammes, neuf curseurs, deux fontes, sept illustrations HTTP 200 et absence d'erreurs JS/GPU. Le suffixe `VALIDATION_VERSION` conserve les preuves historiques (dÃ©faut `v94`). Rapport courant : `artifacts/netlify-smoke-v94.json` ; les vÃ©rifications ne forcent pas les clics Ã  travers un Ã©lÃ©ment masquant.

## Sauvegardes et compatibilitÃ©

HTTPS permet WebGPU dans un navigateur compatible avec le GPU de la machine. Ce dÃ©ploiement est statique : aucune sauvegarde sur serveur, compte joueur ou synchronisation cloud n'est ajoutÃ©. Les sauvegardes restent dans le stockage du navigateur, propre Ã  cette origine ; une sauvegarde de localhost n'apparaÃ®t donc pas automatiquement sur Netlify. Changer de navigateur/profil crÃ©e Ã©galement un autre stockage.

Depuis V93, les grandes sauvegardes sont compressÃ©es sans perte pour rÃ©duire leur consommation de quota. Les JSON historiques restent lisibles ; le schÃ©ma du monde reste 91. [Format, bornes et rÃ©cupÃ©ration](save-storage.md).

V98 publie aussi six [colonies de test](test-colonies.md), tÃ©lÃ©chargÃ©es Ã  la demande, avec manifeste et fichiers revalidÃ©s par HTTP. Elles sont transportables par tÃ©lÃ©chargement/import ; aucune synchronisation cloud n'est ajoutÃ©e. DÃ©ploiement `6ab593dc07b647ac555993f8`, 30 fichiers prÃªts ; [parcours public des six configurations](../../artifacts/test-colonies-native-v98-public.json).

## Reprise V95 aprÃ¨s limitation API

Le premier envoi V95 a reÃ§u HTTP 429 (Â« API Request rate limit surpassed for application Â»), aprÃ¨s crÃ©ation du dÃ©ploiement. Le script sait reprendre cet identifiant avec `NETLIFY_RESUME_DEPLOY`, contrÃ´le son site et son mode de publication, puis envoie les empreintes encore demandÃ©es. Un GET peut renvoyer `required: []` alors que lâ€™Ã©tat est encore `uploading` : la reprise passe donc par le PUT officiel `updateSiteDeploy` du mÃªme manifeste au mÃªme identifiant. Ne pas relancer une crÃ©ation pour rÃ©parer un envoi incomplet.

Les requÃªtes GET/PUT attendent lâ€™Ã©chÃ©ance `X-RateLimit-Reset`/`Retry-After`, avec au plus trois reprises ; un POST de crÃ©ation nâ€™est jamais rÃ©pÃ©tÃ© automatiquement. Ces limites sont dÃ©crites dans la [documentation Netlify](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/#rate-limiting), consultÃ©e le 24 septembre 2026. Aucune clÃ© nâ€™est copiÃ©e dans le dÃ©pÃ´t ou la sortie.

La rÃ©ponse de limite observÃ©e utilise parfois un epoch et parfois une date UTC ; les deux formes sont reconnues. Le contrÃ´le public ne recopie pas le rÃ©sultat dâ€™une version prÃ©cÃ©dente quand `EXPECTED_DEPLOY_ID` diffÃ¨re, afin de ne pas fabriquer une fausse preuve de publication.

V95 : dÃ©ploiement `6ab57508f64713831acd4aec`, 23 fichiers, Ã©tat API `ready`. [RÃ©sultat](../../artifacts/netlify-v95.json), [contrÃ´le public](../../artifacts/netlify-smoke-v95.json).

V96 : correctif du contexte de camÃ©ra/ombres, dÃ©ploiement `6ab5816e3f833a295c8b395e` prÃªt, [contrÃ´le public rÃ©ussi](../../artifacts/netlify-smoke-v96.json) et [bundle identique au build validÃ©](../../artifacts/netlify-v96-bundle.json).

V97 : paysage visible et deltas de flore, dÃ©ploiement `6ab58e97dabdfb48f402dd22` prÃªt ; [parcours public dans Chromium visible](../../artifacts/netlify-smoke-v97.json), [empreinte du bundle validÃ©](../../artifacts/netlify-v97-bundle.json).
