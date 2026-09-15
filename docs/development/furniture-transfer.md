# Transferts de meubles V25–V26

V42 ajoute la lampe sur pied aux meubles minifiables : identité et acier conservés, orientation fixe, connexion et alimentation réinitialisées au retrait. La réinstallation emploie son matériau réel pour la prévalidation du placement. Le générateur à bois ne peut pas être déplacé entier. [Contrat](power.md).

V37 applique la [lumière](light-work.md) au retrait physique, sans ajouter de travail à la prise/pose du paquet. Les trajets gardent leur facteur capturé et les interruptions effacent aussi le reliquat de retrait.

[Vérification RimWorld](../research/furniture-transfer-reference.md), chapitre 10 / SYS-059 / TEST-059. Cette mécanique complète la [déconstruction](deconstruction.md), qui détruit le bâtiment et restitue des matériaux : ici l'objet reste entier.

## Propriété et progression

`World.packed` contient un bâtiment et un propriétaire exclusif : cellule du sol ou colon. Son identité reste globale et unique ; le bâtiment est soit dans `structures`, soit dans `packed`, jamais dans les deux. Aucun bois ni nouvelle identité de meuble n'est créé pendant le transfert. L'attribution d'un lit reste attachée à son identité. Les anciens lits à empreinte simple conservent ce profil.

Les intentions `uninstall` et `install` stockent l'identité et le type dans `Job.furniture`. Une seule intention par meuble. Retrait après accès à une face de l'empreinte et travail, puis paquet au sol ou porté ; prise d'un paquet après accès ; trajet vers le plan tourné ; pose au contact lorsque le volume est libre. La pose n'a pas de phase de travail supplémentaire. Le détail de durée de référence est dans la recherche.

Le plan de réinstallation emploie les règles de construction : contrôle de terrain, empreinte, zones, dégagement des plantes/piles et accès. Le bâtiment source est exclu du contrôle de placement pour permettre une rotation sur place. Un usage déjà engagé (sommeil, place, loisir) retarde le retrait ; sa réservation de travail exclut les nouveaux utilisateurs. Table retirée : le repas transporté reste intact et sa référence au plateau est libérée.

Interrompre libère les engagements mais dépose le paquet entier. Les commandes préparent tous les dépôts sur une vue conservatrice avant de modifier l'état. Si le sol est saturé, la commande est refusée et le portage conservé. Une cellule contenant un paquet n'accepte aucune pile de matériau. Le paquet est une cargaison temporaire, pas un inventaire personnel ni un équipement.

## Modules et reprise

`furniture-commands.ts` prépare les intentions ; `furniture-rules.ts` calcule cible, disponibilité et durée ; `furniture-transfer.ts` exécute les transitions physiques ; `furniture-transfer-save.ts` valide propriétaires, identités et références. Le module historique `furniture-save.ts` reste consacré à la migration de circulation V22.

Contrat de transfert **V26** : la [logistique V26](furniture-logistics.md) valide V25 avant migration. En V25, V24 est validée avant ajout de `packed: []`. Aucun meuble existant n'est déplacé rétroactivement. Les versions antérieures passent par les migrations existantes. Sauvegarde et snapshots contiennent la progression, l'intention, le paquet et son propriétaire ; la reprise ne dépend d'aucun état du rendu.

L'interface conserve Architecte → Ordres et les boutons d'inspection. « Réinstaller » ouvre un plan tournable par Q/E ; « Désinstaller » laisse un paquet sélectionnable. Annuler sur le plan ou sur la source encore présente utilise les mêmes commandes conservatrices. Les paquets au sol partagent le lot de mobilier ; le portage ajoute une variante au lot GPU de cargaisons, avec les mêmes poses que le colon, sans squelette CPU individuel.

## Périmètre et suites

Lit, table, tabouret et piquet ; V31 ajoute la table de taille 3×1 avec son matériau, [contrat](stonecutter.md). Désinstallation par clic ou inspection ; pas encore de rectangle dédié. Fournisseur Transport, rangement et dégagement des paquets livrés en V26 ; voir [contrat courant](furniture-logistics.md). Matériaux bois/acier et cinq pierres conservés en V30–V33 ; matériaux supplémentaires, qualité, dégâts, masse et états médicaux des meubles restent absents. Les coûts historiques de certains bâtiments et les compétences ne sont pas calibrés implicitement par ce lot.

Les quatre scénarios ciblés couvrent accès, interruption, saturation, identité, lit occupé, rotation, données corrompues et reprise ; le pilote de colonie retire, range puis réinstalle son piquet après le premier jour. Les mesures CPU séparent ticks actifs et période complète. Voir [validation](validation.md).

V32 : les factures de la table de taille gardent identité et réglages pendant le transfert du meuble entier. Un poste réservé ne se démonte pas au milieu de son usage. Les paquets valident leurs factures comme les ateliers installés ; [production](stonecutting.md).
