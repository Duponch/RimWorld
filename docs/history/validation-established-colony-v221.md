# V221 — Contrôles de la colonie Les Aulnes

Lot en cours au schéma198 inchangé, sur `c3a458ee`. [Contrat et provenance](../development/established-colony-v221.md). La reprise est explicitement autorisée par l'utilisateur le5octobre après ses tests du correctif mécanique.

## Préparation et périmètre

Le générateur actuel crée une forêt tempérée64², graine221350, au tick0. Le village, les sept adultes et leurs profils, le couple et la fratrie, les biens possédés, connaissances, croissance initiale et deux mufalos domestiques sont préparés explicitement. Aucun acte passé n'est reconstruit. Les historiques publics et le moteur ordinaire de `c3a458ee` ne sont pas modifiés.

La revue statique a corrigé des collisions d'enclos/magasin et une porte d'atelier inaccessible. Les premiers contrôles ont ensuite détecté factures absentes sur un poste inutilisé, matériau du poste artisanal, portes de cuisine/frigo donnant sur un mur voisin et herbe sous un conduit. Ces corrections concernent la nouvelle préparation, sans modification des règles du moteur ou assouplissement des gardes.

Un cas négatif ajouté au test exigeait initialement une garde générale `bedId` dans le transport historique. Ce contrat n'existe pas : la sauvegarde complète refuse cette liaison, le décodeur applique ses gardes de domaine. Le test conserve le refus du faux lit dans `validateWorld`/`deserializeWorld` et vérifie séparément le refus atomique d'un conjoint non humain, contractuel en V214. Cette correction d'oracle n'est pas présentée comme un défaut produit réparé.

## Commandes exécutées

Les contrôles répertoriés passent par `node scripts/run-validation.mjs --label … -- …` ; journaux et métadonnées sous `tmp/validation-runs/`. Un diagnostic privé de placements complète les échecs de préparation ; il n'est pas une preuve de performance.

| Contrôle | Résultat observé |
| --- | --- |
| Typage initial | Rouge7,301s : expansion du tuple de parcelle ; reprise verte6,070s. |
| Quatre tests intégrés | Trois premières reprises rouges8,074/6,478/7,899s pour les défauts de préparation ci-dessus ; quatrième8,504s pour le nouvel oracle de transport trop large. Final vert9,140s,4/4. |
| Journée réelle, `--dry-run --ticks 6000` | Verte22,604s, sept personnes et deux animaux domestiques conservés sans chute. |
| Publication, `--publish --ticks 21000` | Verte67,276s : trois jours et demi réels, validation périodique, survie, codec, métadonnées et aller-retour exacts. |
| Catalogue commun | Vert6,389s,4/4cas ; parseur UI ordinaire, hashes et protections de chargement. |
| Chromium natif | Vert71,491s,1/1parcours ; WebGPU AMD rdna-1, fallbackfalse. |
| Typage final / build | Verts5,877s /2,219s ; constructeur de scénario absent du bundle applicatif. |
| Documentation | Verte1,444s :751documents/7500liens, six en-têtes sous198 et trois sources originales byte-identiques. |

Cette journée produit physiquement huit repas simples, trois raffinés, deux pantalons et80blocs de granite. Les nouvelles piles sont observées à leur allocation réelle, avec ID, propriétaire, quantité et tick ; une différence de stock n'est pas interprétée comme production. Travail, transport, recherche, repas et sommeil sont effectivement observés. La Fabrication passe de900à1340,357328points. Ces nombres proviennent de `tmp/established-colony-v221/day-one/generation.json` ; ils ne sont pas les résultats du futur checkpoint public.

## Checkpoint publié et reprise native

La60e entrée `established-colony-v221`, **Les Aulnes · colonie en activité**, publie le [checkpoint au tick21 000](../../public/test-saves/v221/les-aulnes.json). JSON décodé447206octets, SHA-256 `81b08a46e2250650c2ed08b100abeb17de3d0fa4082fa5d627865d4a0b0baca2`. Les59 payloads antérieurs sont byte-identiques et leurs59métadonnées sont conservées, comparés aux captures précédant l'ajout. Le manifeste passe de59à60, sous le plafond64.

La maturation finale produit28repas simples,16raffinés, deux pantalons et80blocs de granite. Les sept colons et deux animaux domestiques d'origine restent présents et vivants sans chute. À la fin : bois162, nourriture159unités de la comptabilité actuelle ; Fabrication2496,055670/4000points et quatre ordres encore ouverts. Les deux canons ont60coups chacun, courant actif, feu autorisé. Ces résultats proviennent de `tmp/established-colony-v221/generation.json`, séparé du témoin de6000ticks.

Le parcours natif charge cette entrée depuis le catalogue, confronte le World exact, inspecte Bio/Social et le globe, puis présente les vues isométrique et perspective. À1×,21000→21081 ; à6×,21081→21688 ; sauvegarde et rechargement exacts, puis reprise jusqu'à21895. Validation complète, sept colons vivants, canons actifs, zéro erreur console et zéro arrêt/attente de simulation ou défaut graphique. Captures relues et preuve sous `tmp/validation-artifacts/established-colony-v221-native/`.

Le parcours mesure5,848ticks confirmés/s à1× et35,260à6×, sur cette colonie et ce matériel, avec clicks/pause/adoption inclus. Les64,755s de maturation représentent3,084ms/tick en moyenne avec observations, validations et écritures de preuve. Ce sont des coûts observés de ce parcours, sans bancA/B, isolement du tick ou mesure GPU ; aucun gain général ou débit de cent habitants n'en découle.

Le lot ne modifie aucun moteur, schéma ou règle Core. La suite complète, les treize campagnes longues, la viabilité annuelle et les mécaniques non exercées par ce quotidien ne sont pas recertifiées. Les anciennes preuves rouges et leurs suffixes prospectifs conservent leur statut. Le prochain travail doit partir des incidents concrets ou d'une mesure sur la charge concernée, puis d'une boucle humaine complète, selon la priorité du dépôt.
