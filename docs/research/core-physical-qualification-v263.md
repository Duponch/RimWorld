# V263 — observation des champs natifs et limite de l'oracle pixel

**Qualification privée incomplète, clôturée sans adoption. Produit V242 et schéma 198 conservés, 62 références/65 fichiers publics exacts ; aucun gain CPU/GPU/FPS livré.** [Contrat](../development/core-physical-qualification-v263.md), [preuves](../history/validation-core-physical-qualification-v263.md).

V262 établissait une admission et une reprise natives positives, sans égalité A/B de champs ou pixels ni coût Core.
V263 construit une comparaison du vrai MAIN/Core sous une cadence diagnostique bornée ; cette cadence ne mesure pas le débit du jeu.
Les sorties caméra once déjà compilées restent lues sous leurs identités canoniques, sans appel de découverte.

## Sources natives et reprises d'observation

Les sources primaires locales sont Three 0.186.0 : Renderer.js, QuadMesh.js, NodeManager.js, RenderOutputNode.js, Animation.js et NodeFrame.js.
Le premier refus DFG vient d'une hypothèse de descriptor propre shaderNode sur une Fn proxy ; il ne démontre pas un défaut du kernel.
La reprise retire entièrement cette découverte nominative et garde les textures/uniformes réellement consommés sous rôles anonymes.
Aucun getter de proxy ou appel Fn ne remplace la découverte retirée ; le rapport ne revendique plus une identité analytique DFG.

Renderer._renderOutput crée un QuadMesh avec NodeMaterial, stocke {quad,cacheKey} dans sa Map _quadCache puis rend quad.camera.
QuadMesh conserve comme donnée propre une caméra orthographique lexicale partagée, distincte des caméras Core.rig.
Le helper final 7F61200F lit uniquement ces données existantes : cache exact, formes natives, ordinals de quad et alias de caméra/passe.
Le census précède les builders et est renouvelé au begin de la passe ; objets, matériaux et textures conservent leurs alias consommés.
Ces rôles servent à l'oracle, jamais à qualifier un membre résident ou à élargir l'admission.

Le premier transport dépassait 1 024 chunks malgré une capture sous la borne de bytes.
La reprise C95E36EB augmente le nombre de chunks permis et les transporte par lots ordonnés de seize, sans augmenter les 64 MiB par capture.
Offsets, totals, fin de buffer, ordre et SHA restent contrôlés ; aucun champ ou pixel n'est supprimé.

## Ce que montrent les captures achevées

Les quatorze checkpoints A/B portent sur le froid contrôlé, l'état inchangé, stockpile on/off, textures, cutaway, feuillage, projections et deux resize.
Le comparateur C269090E vérifie l'association ordonnée des champs, leurs types/classes, layouts, backing aliases, offsets et bytes, puis les pixels RGBA.
Les champs inconnus restent présents ; leur égalité structurale ne devient pas une preuve de pureté ou d'admission générale.
Treize paires sont intégralement exactes ; le World MAIN final a aussi les mêmes bytes.
Sur resize-original, les asserts précédant le pixel passent, mais les RGBA diffèrent : l'audit demeure FAIL.
Son booléen consumedFieldsQualified reste false car le comparateur ne retourne qu'après les pixels ; la pile et l'ordre des asserts situent néanmoins l'échec final.
L'égalité des bytes CPU observés ne prouve ni chaque upload physique ni tout contenu GPU ; elle ne permet pas d'attribuer la cause de la différence pixel.

Le défaut de chemin du cleanup B est établi séparément : membership se trouve dans owner.policy, pas directement dans owner.
Les valeurs réelles sont nulles/fermées, mais aucune mesure B workers0 avant fermeture du navigateur n'est inventée.
Cette lecture hors ligne conserve le statut natif rouge et ne valide pas les scénarios jamais atteints.

Coût/froid comparatif, compilation intercalée, callbacks custom, throw, mixed, GAME et promotion restent non qualifiés.
Aucun gain de fixture privée ou compte SHARED ne devient un gain FPS produit ; aucun nouveau langage ou cadence gameplay n'est adopté.
Le lot s'arrête après sa clôture et son commit local demandés ; aucune suite V264 n'est prescrite.
