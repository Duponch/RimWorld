# V234 — propriété des messages natifs

Refonte technique privée, sans nouvelle règle RimWorld. Produit V233/schéma 198
conservés ; [contrat et décision](../development/native-resource-ownership-v234.md),
[preuves](../history/validation-native-resource-ownership-v234.md).

Sources primaires vérifiées le 6 octobre 2026 : la
[sérialisation structurée HTML](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal)
conserve cycles et identité répétée via sa mémoire. Le message désérialisé natif
permet une preuve de construction locale, sans rendre une entrée standalone
arbitraire sûre à inspecter. Les buffers partagés et objets natifs mutables gardent leurs
particularités ; aucun clonage supplémentaire de Resource par valeur n'est admis dans le parcours propriétaire.

[Object.freeze](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-object.freeze)
et [SetIntegrityLevel](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-setintegritylevel)
ferment les propriétés propres et l'extensibilité, sans fermeture récursive des
descendants ou des emplacements internes Map/Set/buffer. Le candidat ferme donc seulement
les dépendances Resource/plantLife/tableau/association réellement capturées, après
l'admission complète. Les alias restent présents et gardent l'identité de leur cible ;
ceux qui visent un objet fermé partagent sa fermeture. Les descendants inconnus et
les autres champs du World restent mutables.

Le [Worker natif](https://html.spec.whatwg.org/multipage/workers.html#dedicatedworker),
le vrai gestionnaire de messages, l'URL fixe, le registre privé et le constructeur capturé à
l'initialisation constituent ensemble la provenance. Un drapeau raw/trusted ou un
simple hash ne fournit pas ce mandat. Les oracles passent par de vrais Workers,
avec un producteur diagnostique servant l'entrée fixe et l'encodeur réel.

Sources locales primaires : SnapshotEncoder/Decoder V233, helpers healroot et
plant-light-save, PlanetValidationCache, protocole/SimulationClient V209, Vite 8
installé et oracles de graphes. Le standalone conserve lectures/getters/Proxy,
verdicts et mutabilité. Les tableaux reconstruits peuvent utiliser `Symbol.species` ou
des itérateurs interposés : leur contrôle doit précéder leur utilisation, et un `catch` ne
restaure pas des effets déjà produits. Les boucles privées de comparaison sont
numériques ; les définitions ESM du programme sont supposées stables.

Les types TypeScript n'établissent ni propriété exclusive ni gain CPU : ils disparaissent
à l'exécution. La fermeture change les descripteurs de propriétés et peut changer les formes internes
V8. Clone, reconstruction, namespace, prévalidation, Maps, gel N et consommateurs
restent à mesurer ensemble. Deux cycles natifs sont défavorables ; le résultat
ne motive aucune réécriture de langage ni promotion du cache.
