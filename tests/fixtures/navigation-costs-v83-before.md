# Référence du banc de navigation V83

`navigation-costs-v83-before.json.gz` contient les trois modules **Lisière** capturés juste avant l’optimisation des coûts de navigation : `furniture-travel.ts`, `weighted-search.ts` et `wildlife-navigation.ts`. Ce sont uniquement des sources de ce projet ; aucun fichier, code décompilé ou sauvegarde de RimWorld n’est inclus. Les chaînes conservent leurs fins de ligne d’origine et chaque entrée porte son empreinte SHA-256.

| Élément | SHA-256 |
|---|---|
| Archive gzip (4 781 octets) | `44a135bd6f58d5c7c9402eba21c9f2f3cba7d6ed8251ef1e2b3724bcb7b971ce` |
| `furniture-travel.ts` | `2e9ad56956028f2039259424baf3368eac645ddffc659566ad60dc72ae39e06c` |
| `weighted-search.ts` | `14dae396fb38dfa374e1fde00536b73cb803685b8dcf1abfb8b9a6f08b118bc3` |
| `wildlife-navigation.ts` | `b3aa19b953750c3e5c767020720cc99103741e568ca033eb8837c5180abeb239` |

Depuis la racine du dépôt, avec les dépendances installées (`npm ci`) et le Node requis par `package.json` :

```powershell
node --experimental-strip-types scripts/navigation-costs-bench.ts > tmp/navigation-costs-v83.json
```

Le script crée `tmp` s’il manque, mais une redirection PowerShell exige que son dossier existe déjà : exécuter `New-Item -ItemType Directory -Force tmp | Out-Null` avant la commande sur un clone neuf. Il vérifie les empreintes, copie le `src/sim` courant dans un dossier temporaire distinct par exécution, puis remplace exactement les trois modules archivés. Les autres dépendances restent celles du checkout testé : la comparaison isole ce changement de représentation des coûts, sans reconstruire toutes les anciennes règles du jeu. Les sources doivent rester gelées pendant copie et mesure. Le dossier temporaire est conservé pour diagnostic ; aucun fichier de production n’est remplacé.

Le banc utilise le départ V83 et le camp historique, compare tous les coûts et parents d’une recherche complète, puis mesure séparément capture, recherche humaine et recherche avec échelle animale. Cinq chauffes précèdent trente observations par cas, en alternant l’ordre ancien/nouveau sans exécutions concurrentes. `NAVIGATION_SAMPLES` permet 10 à 1 000 observations. `NAVIGATION_WORLD` ajoute facultativement le chemin d’un checkpoint Lisière local ; il n’est pas requis pour reproduire les deux cas embarqués. Aucune ancienne copie sous `tmp/navigation-costs-before` n’est nécessaire.

La sortie inclut les empreintes de l’archive, des modules avant/après et du nouveau helper, l’environnement, les identités des mondes et les observations brutes. Ce banc ne mesure ni cadence du worker, ni images, ni bénéfice universel : les résultats de charge et le rejeu de colonie restent consignés dans les preuves de livraison.
