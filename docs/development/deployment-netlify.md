# Publication Netlify

Le site du jeu est **https://lisiere-duponch.netlify.app**, projet Netlify `lisiere-duponch`, identifiant `9c1b98b5-68a5-4242-b1ec-3bc193b93445`, compte `duponch`. Aucun autre site du compte n'est modifié.

La recherche des connecteurs disponibles n'a trouvé aucun outil Netlify callable. L'API officielle a permis de publier avec la connexion Netlify locale existante ; aucune intervention ni transmission de secret par l'utilisateur n'a été nécessaire. Sources : [API de déploiement](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/) et [spécification officielle](https://open-api.netlify.com/), consultées le 21 septembre 2026.

## Publication reproductible

1. Valider puis lancer `npm run build`.
2. Lancer `node scripts/deploy-netlify.mjs --prod`. Sans `--prod`, la publication reste un aperçu.
3. Vérifier la réponse HTTPS, les fichiers et le parcours de création/chargement sur le site réellement publié.

Le script lit `NETLIFY_AUTH_TOKEN` ou la connexion CLI existante dans la configuration locale Netlify. Il ne copie ni ne journalise le jeton. `.netlify/state.json` est local et ignoré par Git. Le projet et le compte sont contrôlés avant publication. `--create-site` n'est prévu que pour la première création ; aucun remplacement implicite d'un site existant.

Seul `dist` est inventorié : empreintes SHA-1, envoi des fichiers demandés, puis attente de l'état `ready`. Les liens symboliques sont refusés. `artifacts/netlify-latest.json` contient un résultat sans secret ; une copie datée conserve la preuve de livraison. `netlify.toml` déclare le build Vite, le répertoire public et Node 22. Les illustrations à noms stables sont revalidées à chaque nouvelle navigation ; le reste des assets a un cache d'une heure.

Cette configuration publie à la demande. Elle ne prétend pas avoir connecté un déploiement Git automatique. Le bundle de production n'expose pas le diagnostic `window.__lisiere` des tests.

## Badge et contrôle réel

Le premier contrôle public a révélé un iframe `nl-badge-frame` injecté par Netlify au-dessus du bouton Menu. Le réglage de ce seul projet `built_with_badge_enabled` est désactivé par l'API ; aucune modification de forfait ni contournement CSS. Ce réglage est prévu par la [documentation officielle du badge](https://docs.netlify.com/manage/projects/powered-by-netlify-badge/), consultée le 22 septembre 2026, et prend effet à la requête suivante sans redéploiement.

`node scripts/smoke-netlify.mjs` contrôle la version publique dans Chromium natif : accueil, vraie création de partie, cinq dossiers, registre Ressources à 216 px, portrait sélectionné lisible, sauvegarde/rechargement, trois panneaux sans débordement, six colonnes Faune, 60 pictogrammes, neuf curseurs, deux fontes, sept illustrations HTTP 200 et absence d'erreurs JS/GPU. Le suffixe `VALIDATION_VERSION` conserve les preuves historiques (défaut `v94`). Rapport courant : `artifacts/netlify-smoke-v94.json` ; les vérifications ne forcent pas les clics à travers un élément masquant.

## Sauvegardes et compatibilité

HTTPS permet WebGPU dans un navigateur compatible avec le GPU de la machine. Ce déploiement est statique : aucune sauvegarde sur serveur, compte joueur ou synchronisation cloud n'est ajouté. Les sauvegardes restent dans le stockage du navigateur, propre à cette origine ; une sauvegarde de localhost n'apparaît donc pas automatiquement sur Netlify. Changer de navigateur/profil crée également un autre stockage.

Depuis V93, les grandes sauvegardes sont compressées sans perte pour réduire leur consommation de quota. Les JSON historiques restent lisibles ; le schéma du monde reste 91. [Format, bornes et récupération](save-storage.md).

## Reprise V95 après limitation API

Le premier envoi V95 a reçu HTTP 429 (« API Request rate limit surpassed for application »), après création du déploiement. Le script sait reprendre cet identifiant avec `NETLIFY_RESUME_DEPLOY`, contrôle son site et son mode de publication, puis envoie les empreintes encore demandées. Un GET peut renvoyer `required: []` alors que l’état est encore `uploading` : la reprise passe donc par le PUT officiel `updateSiteDeploy` du même manifeste au même identifiant. Ne pas relancer une création pour réparer un envoi incomplet.

Les requêtes GET/PUT attendent l’échéance `X-RateLimit-Reset`/`Retry-After`, avec au plus trois reprises ; un POST de création n’est jamais répété automatiquement. Ces limites sont décrites dans la [documentation Netlify](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/#rate-limiting), consultée le 24 septembre 2026. Aucune clé n’est copiée dans le dépôt ou la sortie.

La réponse de limite observée utilise parfois un epoch et parfois une date UTC ; les deux formes sont reconnues. Le contrôle public ne recopie pas le résultat d’une version précédente quand `EXPECTED_DEPLOY_ID` diffère, afin de ne pas fabriquer une fausse preuve de publication.

V95 : déploiement `6ab57508f64713831acd4aec`, 23 fichiers, état API `ready`. [Résultat](../../artifacts/netlify-v95.json), [contrôle public](../../artifacts/netlify-smoke-v95.json).

V96 : correctif du contexte de caméra/ombres, déploiement `6ab5816e3f833a295c8b395e` prêt, [contrôle public réussi](../../artifacts/netlify-smoke-v96.json) et [bundle identique au build validé](../../artifacts/netlify-v96-bundle.json).

V97 : paysage visible et deltas de flore, déploiement `6ab58e97dabdfb48f402dd22` prêt ; [parcours public dans Chromium visible](../../artifacts/netlify-smoke-v97.json), [empreinte du bundle validé](../../artifacts/netlify-v97-bundle.json).
