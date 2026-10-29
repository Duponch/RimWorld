# Or perdu lors d’une destruction : rechargement conservé

Détruire un multi-analyseur pouvait produire un World que son propre lecteur refusait de recharger. Le service de destruction comptabilisait correctement l’or non restitué, mais le registre des pertes n’admettait pas cet ingrédient. Cette omission existe dans le produit297 de référence b9d3db3f.

Le correctif ajoute l’or aux ingrédients admis à partir du schéma123, seuil déjà utilisé pour le multi-analyseur et le stockage de cet ingrédient. La déclaration typée du registre inclut également cet ingrédient. Il garde les quantités entières positives, les noms fermés et les autres contrôles. Le service de destruction, la restitution, les compteurs, le RNG, le temps et le schéma297 restent identiques. Le cœur d’IA demeure réservé au chantier privé298.

## Vérification ciblée

Les deux contrats de [destroyed-gold-ledger297.test.ts](../../tests/destroyed-gold-ledger297.test.ts) utilisent uniquement la fixture publique conservée. Un multi-analyseur non alimenté est déclaré dans la préparation initiale, puis le vrai service lui inflige une destruction fatale. Le World d’entrée est validé et rechargé avant cette action ; après le correctif, les pertes réelles restent enregistrées et la sortie se recharge exactement. Il ne s’agit pas d’une construction payée jouée ou d’une continuation de campagne.

La frontière123/122, les quantités invalides, un ingrédient inconnu et l’IA dans297 restent contrôlés séparément comme domaines directs du lecteur. Ces adverses ne sont pas présentés comme des Worlds historiques admis.

Le premier essai de préparation sans état électrique échoue avant admission et reste conservé. Après déclaration de ce composant initial obligatoire, les deux refus sur le produit original sont reproduits en11,312s ; la seule nouvelle condition donne deux PASS en12,392s. La promotion reprend exactement ces contenus, puis normalise seulement les fins de lignes du lecteur pour l’enregistrement Git.

## Coût et portée

La condition se trouve dans la boucle existante des ingrédients perdus. Elle n’ajoute ni scan de World, allocation, timer, cache ou travail par Core. Le chemin sans registre de destruction garde son retour actuel. Aucun gain CPU, FPS ou GPU global n’est déduit de ce changement de validation.

Les preuves privées sont conservées sous `C:/Users/ebsaf/.codex/visualizations/2026/10/25/01a17357-d7a6-7ee3-9e93-2d2419b318db/victory-resume-v493/gold-ledger-product-root/`. Les sauvegardes humaines et la mission de travail ne sont ni chargées ni modifiées. La Source12 privée reste scellée ce4bafdf, indépendamment de cette petite livraison produit. La dernière publication Cloudflare attestée reste V491.
