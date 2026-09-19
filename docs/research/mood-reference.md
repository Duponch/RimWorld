# Humeur et premières pensées — recherche du 19 septembre 2026

Corpus relu : chapitre 14, **SYS-081 / TEST-081**, ainsi que SYS-076/078/079/080 et SYS-090/096 pour les faits producteurs. Adopter séparation situation/mémoire, échéance et évolution causale ; adapter cadence locale et profil de camp ; différer SYS-082 (crises), SYS-084 (traits), SYS-086..088 (relations et mort sociale). Les UI-017/018/028 de l’index G3 général sont des soins/captures/opérations : ils ne sont pas présentés à tort comme des spécifications de l’onglet Besoins.

## Sources et degrés de certitude

- [RimWorld Wiki, Mood](https://rimworldwiki.com/wiki/Mood) : cible distincte, base 32, progression +12/−8 par heure, gel en sommeil/inconscience. La page reconnaît que la cadence exacte manque ; ne pas la prendre comme preuve du calendrier interne.
- [Pensées](https://rimworldwiki.com/wiki/Thought) : recoupement des valeurs, souvenirs de repas, situations de besoins et vêtement abîmé. Les tables contiennent aussi des DLC, exclusions non reprises implicitement.
- [Miroir des classes](https://github.com/Chillu1/RimWorldDecompiled/tree/2d508035082e7cb0c8e29e230d26bda6e546928f), instantané du 20 mai 2026 : `Need_Mood`, `Need_Seeker`, `Need`, `RestUtility`, `ThoughtHandler`, `Thought_Memory`, `MemoryThoughtHandler`, `ThoughtDef`, workers Food/Rest/Comfort/Joy/Pain/ApparelDamaged et besoins associés relus. C’est du code miroir communautaire, pas une certification du binaire possédé par l’utilisateur.
- [Données Core plus récentes](https://github.com/GAarsin/Rimworld_Data/tree/673f1fc1792faf998cb40418bf5e01592e4a7966/Core/Defs), commit du 26 avril 2026 : `NeedDefs/Needs.xml`, quatre tables de pensées et vêtements relus. Ce second miroir n’est pas une observation expérimentale indépendante. Confrontation avec les [XML historiques](https://github.com/RimWorld-zh/RimWorld-Core/tree/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs).
- [Ludeon, correctif 1.6.4850 du 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : correction d’énumération de pensée de joie, postérieure aux miroirs. Aucune absence de mention d’une règle n’est une garantie qu’elle n’a pas changé.

Confiance élevée pour les valeurs concordantes des causes présentes ; moyenne pour la cadence exacte et les branches affectées après les miroirs. Aucun test local n’atteste une parité bit à bit avec le jeu commercial.

## Confrontation et corrections rétroactives

L’ancien XML de besoin donne une baisse d’humeur de **6 points/heure**, alors que le miroir d’avril 2026 et le wiki concordent sur **8**. V64 retient 8 et conserve cette divergence datée. La hausse vaut 12. Le résolveur Core borne la progression à sa cible, qui combine base, pensées groupées et offset de difficulté. Notre difficulté neutre et attentes fixes sont annoncées, pas déguisées en calcul de richesse.

`RestUtility.Awake` vérifie capacité d’éveil et état endormi du job ; il n’interdit pas tout individu à terre. V64 utilise les indicateurs de sommeil déjà livrés et `canBeAwake`. La douleur a des seuils stricts à 0,0001/0,15/0,4/0,8. Le vêtement usé prend le minimum des ratios et utilise `<0.5` puis `<0.2`, pas `<=` et pas une somme par pièce. Les chemises et gilets actuels héritent de `ApparelProperties.careIfDamaged=true` sans remplacement XML. La faim utilise le seuil adulte voulu 0,3 × 0,8/0,4, donc 24/12 %, distinct du seuil de recherche de repas ; à zéro Core consulte ensuite le stade de malnutrition, producteur encore absent ici.

Les XML anciens et récents concordent pour les causes retenues. Les deux souvenirs de repas durent un jour ; `ThoughtDef.stackLimit` vaut un par défaut, et sans table l’explicite. Core peut regrouper plusieurs pensées et pondérer leurs effets : ne pas généraliser notre renouvellement simple à deuil ou relations. L’âge Core avance par intervalles de 150 ticks, avec expiration `age > duration`. V64 conserve l’échéance absolue historique et expiration à `tick >= expiresAt` : adaptation de cadence explicite, sans réécrire le passé des repas sauvegardés.

L’audit corrige deux limites locales : la moyenne faim/repos devient une cible expliquée et une jauge progressive ; une mémoire sur un colon mort est désormais nettoyée à échéance, car ignorer tous ses besoins laissait un état refusé par la validation au tick d’expiration. Le bilan V63 du guide contenait encore une ligne ancienne « habillement indisponible », retirée ; les vêtements publiés restent partiels.

Le [contrat V64](../development/mood.md) centralise les nombres et les limites ; [preuves](../history/validation-mood-v64.md). La recherche ne livre ni un modèle de personnalité ni toutes les pensées de RimWorld.
