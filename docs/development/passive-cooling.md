# Refroidissement passif — V40

V74 utilise cet appareil dans la [boucle de canicule](heatwave.md), avec exposition réelle et secours au frais. Les validations V40 ci-dessous restent historiques ; la nouvelle preuve traverse un événement naturel du calendrier.

[Recherche et décisions](../research/passive-cooling-reference.md), [température](temperature.md), [ravitaillement](cooking.md), [construction](construction-materials.md), [preuves](validation.md).

## Contrat joueur

Architecte → Température propose un refroidisseur passif fixe de 1×1 case. Construction livre 50 bois, puis effectue 20 ticks neutres de travail, avec les facteurs lumineux habituels. Les premières livraisons créent un cadre ; le bâtiment apparaît seulement après finition et dégagement physique. Le réservoir initial contient ces 50 bois, soit cinq jours à dix bois/jour.

Une pièce retenant son air est refroidie au-dessus de 17 °C. La capacité se répartit entre ses cellules ; ouvertures et parois continuent leurs échanges, donc une grande pièce n’atteint pas nécessairement le seuil. Dehors ou sous le seuil, le bois se consomme toujours. La case reste traversable avec supplément de trois ticks, mais ne sert pas d’arrêt ordinaire ni de dépôt. Ce meuble ne porte pas de toit.

L’inspection affiche combustible, seuil, absence de réfrigération et contrôle automatique. Transport assure les recharges à 30 % ou moins : prélèvement, trajet adjacent, 24 ticks de service et incorporation réelle. Le clic droit d’un colon propose un ravitaillement forcé, y compris automatisme désactivé. Files, priorités maintenues, réservations, cargaisons interrompues et sauvegardes utilisent le même contrat que le feu. Aucun métier Cuisine, facture ou émission lumineuse n’est accordé à ce bâtiment.

Vide, il reste debout et ne refroidit plus. Déconstruction retire le bâtiment sans bois récupéré ; le bilan transfère combustible restant et déjà consommé. Désinstallation refusée. Les différences de recharge et de recherche avec Core sont précisées dans la recherche liée.

## Architecture et persistance

`fuel.ts` expose les capacités par définition, sans dupliquer les transports. Les unités de combustible restent des ticks entiers, 600 par bois. `thermal-sources.ts` isole les sources du calcul des échanges ; sa lecture précède la combustion du tick. Aucun travail thermique par frame ni parcours de diffusion par colon. Le facteur alimentaire demeure celui de l’air réel : ce bâtiment ne peut pas procurer une conservation réfrigérée.

Schéma **40** pour la nouvelle définition. V39 est strictement validée avant migration ; ni bâtiment, combustible, température ni recherche inventés. Matériau bois explicite, orientation fixe zéro, combustible borné et absence de factures sont validés ; les ordres de ravitaillement pour Cuisine ne peuvent cibler un refroidisseur. Les snapshots dynamiques transportent déjà bâtiments/réservoirs sans nouveau protocole.

`passive-cooler-parts.ts` génère seize parties dans le lot de mobilier existant, sans mesh ni matériau par bâtiment. Pas de nouvelle lampe, particules ni shader ; changement de couleur du contenu à vide/plein seulement. Le compteur de bois ne reconstruit pas le mobilier à chaque tick. Le curseur de placement est désormais visible pendant la préparation masquée au chargement : son matériau double face avait sinon deux pipelines créés au premier survol. Sa visibilité courante est restaurée ensuite.

## Validation et limites

Deux scénarios de simulation couvrent construction, volume/seuil, dehors, combustion jusqu’à cinq jours, reprise de chantier/service, interruption, ordre forcé, déconstruction sans duplication, matériaux/versions invalides et absence de gain alimentaire. Le pilote de colonie sait proposer un appareil pour une petite pièce chaude ; il n’en construit pas dans le camp ouvert et conserve les bilans du bois, y compris combustible retiré.

Le parcours natif part d’une pièce chaude synthétique et construit par l’UI ; température visible, absence de recettes, recharge manuelle depuis une seconde fixture initialement vide et rechargement exact sont contrôlés. L’audit CPU utilise 3/30/100 transporteurs réellement actifs. Ces scènes V40 ne prouvaient ni le confort thermique des colons ni la chaîne du froid électrique ; exposition et refuge sont ajoutés en V74, réfrigération toujours absente ; les budgets et pointes sont dans les preuves courantes.
