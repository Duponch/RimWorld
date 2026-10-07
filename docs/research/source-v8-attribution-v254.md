# V254 — recherche sur le profilage du Worker source

Produit V242, schéma 198 inchangé. Recherche et diagnostic, sans candidat adopté. [Contrat](../development/source-v8-attribution-v254.md), [preuves](../history/validation-source-v8-attribution-v254.md).

L'API publique [BrowserContext.newCDPSession](https://playwright.dev/docs/api/class-browsercontext#browser-context-new-cdp-session) accepte une Page ou une Frame. Profiler cette session sans sélectionner le Worker aurait mesuré MAIN. Les types et bundles Playwright installés sont inclus dans le GEL.

Le domaine [Target du protocole CDP](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Target.pdl) décrit auto-attach, les sessions et le transport non aplati. V254 utilise ce dernier par une session Page supplémentaire possédée, sans pause du Worker. Sa dépréciation est déclarée ; le succès de ce Chromium ne promet pas sa pérennité. Les six cas composants vérifient les deux ACK, corrélations, erreurs, timeouts, ambiguïtés, bornes et fermeture, mais ne remplacent pas la preuve native de cible.

Le [protocole JavaScript CDP](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/js_protocol.pdl) fournit Profiler, l'identité d'isolate et les scripts Debugger. L'intervalle demandé est 1 000 µs ; il n'est pas assimilé à la cadence effective de chaque sample. `timeDeltas`, timestamps, références et arbre sont contrôlés hors ligne. Les poids d'intervalles restent approximatifs, parents recouvrants et frontières conservées.

[HR-Time 3](https://www.w3.org/TR/hr-time-3/#examples) permet de traduire des horloges de contextes par leurs origines. V254 conserve séparément une intersection conditionnelle des offsets V8 possibles : aucune origine commune ou correspondance exacte V8/performance n'est inventée. Les quatre témoins natifs encadrent toute la fenêtre GAME.

Après stop et avant reload, Debugger capture les scripts connus dans le même Worker, sans breakpoint, coverage, heap snapshot ou GC forcé. Le JS compilé et ses maps inline sont conservés. Le contenu source des maps engine/Worker/Snapshot peut être comparé exactement au RAW gelé ; une position générée n'est pas annoncée comme une ligne TypeScript sans résolution explicite.

Les observations orientent vers des captures spatiales répétées et des requêtes de meubles. `footprintContains` possède déjà un rejet spatial et n'alloue pas systématiquement une liste de cases. Le frontier de navigation est déjà une file de Dial. Ces faits écartent deux recommandations génériques sans cause. Une refonte doit partir des parcours réellement payés et conserver décisions, réservations, getters publics, mutations inter-acteurs et anciennes captures.

Le profil ne mesure ni les threads audio/layout, ni le GPU, ni un gain A/B. Une activité source élevée ne prouve pas que tout travail source retiré augmentera les FPS : V250 a déjà montré le contraire. Le coût complet, le débit réel et le jeu matériel demeurent les critères de promotion d'une future optimisation.
