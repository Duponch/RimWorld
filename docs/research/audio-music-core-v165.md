# Musique de RimWorld Core et droits de génération V165

Recherche du 29 septembre 2026. Référence locale : installation Steam `E:/Steam/steamapps/common/RimWorld`, `Version.txt` = **1.6.4871 rev590**. Les définitions ci-dessous sont les fichiers livrés avec le jeu, lus directement et comptés par analyse XML. Le catalogue commercial officiel de la bande originale sert à situer la longueur des compositions, sans déduire automatiquement ses règles de lecture en partie.

## Ce que définit Core 1.6

| Source primaire installée | Observation certaine | Limite |
| --- | --- | --- |
| `Data/Core/Defs/Misc/SongDefs/Songs_Gameplay.xml` | **35 `SongDef`** : 6 marqués `allowedTimeOfDay=Day`, 6 `Night`, 23 sans restriction d'heure explicite. Les six de jour et les six de nuit comprennent des fragments `Noodle_*` d'œuvres plus longues. Les entrées portent parfois un `volume` propre. | 35 définitions ne signifient pas 35 compositions intégrales distinctes. Le XML ne donne ni intervalle de silence entre titres, ni choix aléatoire, ni fondu, ni prévention de répétition. |
| Même fichier | Un titre porte `allowedSeasons=Winter` et `commonality=2.0`. Les autres entrées de ce fichier ne fixent pas de saison ni de biome. | Cela n'établit pas que tout le moteur ignore les biomes ni comment le poids est combiné aux autres critères. |
| `Songs_Tension.xml` | **5 `SongDef`** avec `tense=true`, aux volumes propres. | La définition ne prouve pas à elle seule quel événement déclenche le passage en tension ni si le morceau en cours est coupé. |
| `Songs_Entry.xml`, `Songs_Misc.xml` | L'écran d'entrée et le générique ont `playOnMap=false`. | Un titre de menu ne doit pas être confondu avec la liste de colonie. |

La [bande originale publiée par Ludeon sur Steam](https://store.steampowered.com/app/990430/RimWorld_Soundtrack/) crédite Alistair Lindsay, décrit **31 pistes** de musique « space western » et donne des durées souvent de **3 à 5 minutes**, avec par exemple un titre de 6 min 50. Ce catalogue ne correspond pas un pour un aux `SongDef` de la version installée : certaines définitions Core découpent un titre en fragments. Son audio est propriétaire et n'est ni utilisé comme échantillon ni donné en référence à un générateur.

## Traduction dans Lisière

**Adopter** une musique à faible présence sous les effets de travail, avec un choix de jour, de nuit et de tension, ainsi qu'un volume séparé. **Adapter** le timbre à la 3D pastel/craie : petites phrases de piano feutré, cordes pincées et nappes discrètes ; tension retenue pour laisser le combat audible. L'accueil réutilise provisoirement la piste calme de jour après un geste du joueur ; cette décision de Lisière ne reproduit pas le titre d'entrée distinct de Core. **Différer** les filtres saisonniers et un titre propre à l'accueil jusqu'à disposer de plusieurs morceaux par famille. **Vérifier** ultérieurement en observation de RimWorld les silences, fondus et changements en milieu de titre. La lecture de pistes complètes avec pause entre elles est aussi une décision de Lisière, pas une valeur copiée de Core.

## ElevenLabs Music, coût et droits

L'[API officielle Music](https://elevenlabs.io/docs/api-reference/music/compose) accepte `music_v2`, une durée demandée de 3 à 600 secondes, `force_instrumental` et une sortie MP3. Le [guide officiel](https://elevenlabs.io/docs/overview/capabilities/music) indique aussi une limite de cinq minutes dans son interface : l'API et l'interface présentent donc des bornes différentes ; nos demandes de 224–233 secondes respectent les deux. Le coût n'est pas un tarif universel : une estimation du connecteur pour les trois générations de ce lot indiquait **17 150 crédits** et **343 cents** ; la consommation réelle reste à relever par génération.

Les [conditions Music](https://elevenlabs.io/music-terms) interdisent les prompts citant artiste, titre ou album existant, et précisent que la sortie n'est pas garantie unique. Les [conditions propres aux modèles](https://elevenlabs.io/eleven-music-model-specific-terms) excluent les « Studio Games » des forfaits libre-service ; elles définissent cette catégorie comme un jeu **commercialisé** et disponible sur plus d'une plateforme. L'utilisateur a précisé que Lisière doit rester **gratuit et non monétisé**. La catégorie ainsi définie ne correspond donc pas au projet annoncé. Le forfait effectivement connecté, ses droits de téléchargement et toute diffusion future monétisée ou multiplateforme doivent être revérifiés avant publication. Aucun prompt ne cite RimWorld, son compositeur ou ses titres.

En parallèle, [les compositions locales du lot](../development/audio-music-content-v165.md) sont synthétisées sans échantillons ou modèles externes, pour disposer d'une provenance complète et d'un repli indépendant des conditions du service.
