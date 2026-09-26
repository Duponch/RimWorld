# Bibliothèque de colonies de test — V98 à V106

**V109 : douzième entrée — Visages et armurerie.** Cinq profils visuels préparés et une facture de gilet non réalisée au chargement. Base atelier V101 immuable, nouvelle scène dans `public/test-saves/v109/visages-armurerie.json`, générateur explicite `scripts/generate-appearance-flak-v109.mjs`. Aucun écrasement des onze références précédentes ; contrôle d’empreinte et de migration maintenu.

**V106 :** « Lièvres et soins · 1 colon » ajoute un lièvre sauvage à désigner et un lièvre possédé blessé. Un lit, 75 baies, 20 repas et quatre plantes médicinales sont préparés ; les tentatives et soins sont réels, sans succès garanti. [Générateur](../../scripts/generate-domestic-demo.ts), [contrat](domestic-animals.md). Les dix fichiers précédents restent immuables.

**V105 :** dix colonies dans le manifeste commun. « Art et commerce · 1 colon » propose un visiteur et une œuvre préparée pour adopter le suivi, contacter, vendre puis sauvegarder. Les neuf fichiers historiques restent inchangés ; [générateur](../../scripts/generate-economy-demo.ts).

**Charger une partie → Colonies de test** propose directement onze situations, depuis l'accueil ou Menu : les six références V98 inchangées et cinq démonstrations préparées. Il suffit de choisir **Charger cette colonie** ; téléchargement et import manuel ne sont plus nécessaires. Chaque copie s'ouvre en pause et le jeu continue normalement après reprise.

V101 ajoute [l'atelier](../../public/test-saves/v101/atelier.json) : recherches et matières initiales préparées, atelier construit par le vrai moteur, aucune arme fabriquée d'avance. `node --experimental-strip-types scripts/machining-demo-v101.ts` régénère et recharge exactement ce fichier. V103 ajoute [les salles](../../public/test-saves/v103/salles.json) : pièces meublées, fleurs et repas préparés, sans souvenir prérempli ; l'ingestion et les pensées suivent la simulation. Ces deux démonstrations ne sont pas des colonies autonomes. [Preuves V98](../history/validation-test-colonies-v98.md), [V101](../history/validation-machining-v101.md) et [V103](../history/validation-rooms-v103.md).

| Colonie | Habitants vivants | Situation disponible |
|---|---:|---|
| Colonie avancée | 4 | Campagne Lisière poursuivie pendant 182,577 jours ; habitat, cultures, vêtements, stocks et travaux conservés. |
| Nourriture et énergie | 12 | Deux cuisines électriques, solaire, batteries, interrupteurs, froid, cultures et 12 lièvres. |
| Prison et intendance | 12 + 2 captifs | Deux chambres de prison, lits, rations physiques, geôliers et énergie. |
| Vent, chaleur et incendie | 12 | Éoliennes, chauffage, climat et six foyers préparés, extinction ordinaire. |
| Commerce et circulation | 100 + 2 visiteurs | Marchand, argent et stocks finis, ateliers, cultures, énergie et 100 lièvres. |
| Habitat, vêtements et salubrité | 100 + 2 visiteurs | Tailleurs, vêtements, mobilier, patients, salissures, tombes, deux morts préparés et 100 lièvres. |
| Atelier et armurerie | 1 | Atelier V101 alimenté, acier et composants ; fabriquer puis équiper une arme par les travaux ordinaires. |
| Pièces vécues | 1 | Salles V103 et trois repas ; inspecter impression, puis reprendre le temps et observer le souvenir dans Besoins. |
| Atelier de sculpture | 1 | Grande œuvre en marbre réellement produite et posée ; fabriquer puis installer une petite sculpture en bois. |
| Art et commerce | 1 + 1 marchand | Œuvre vendable, contact et argent physiques, suivi du patrimoine. |
| Lièvres et soins | 1 | Apprivoisement à tenter et lièvre possédé blessé à soigner ; provisions préparées. |

Les six cartes V98 font 250 × 250 ; les cinq démonstrations font 32 × 32. Les cinq situations V98 préparées proviennent de scénarios de charge : elles ne représentent pas des colonies autonomes équilibrées. Certains besoins sont déjà urgents ; elles servent à exercer des systèmes existants, sans démontrer une progression naturelle ou la parité Core. La première est une partie de **Lisière**, jamais une sauvegarde personnelle RimWorld. Ses 48 dossiers comprennent quatre habitants vivants et 44 morts historiques. Visiteurs, captifs et morts ne comptent pas comme cent colons libres.

## Chargement et conservation

Le catalogue commun `/test-saves/manifest.json` et le fichier choisi sont téléchargés à la demande depuis leur dossier de version (`v98`, `v101`, `v103`, `v104`, `v105` ou `v106`). Le manifeste V98 historique et ses six fichiers restent inchangés. Le lecteur accepte aussi ce manifeste historique de version 1 ; le catalogue commun de version 2 indique le dossier de chaque entrée. Aucun constructeur de scénario n'entre dans le bundle applicatif. Les fiches indiquent provenance, systèmes et coordonnées utiles. Chaque chargement repart du même état en pause ; règles et délais ordinaires reprennent ensuite.

Le manifeste contient les comptes et le SHA-256 du JSON métier décompressé. Lecture réseau bornée, dossier de version et nom de fichier contrôlés, décompression bornée et empreinte précèdent la validation stricte du worker. **Télécharger le fichier** conserve les octets publiés, y compris l'enveloppe compressée des fichiers V98 ; **Importer un fichier** accepte aussi les sauvegardes JSON brutes, dans la limite de 32 Mio. Ce n'est pas un importeur RimWorld.

`GameSession.loadExternal` partage l'exclusion des créations/chargements. Une lecture refusée ne touche aucun emplacement ; un refus worker conserve le monde actif et restaure l'ancienne récupération. Avant remplacement accepté, le monde courant est conservé dans **Colonie précédente**. La **Sauvegarde manuelle** reste intacte. La récupération n'a qu'un emplacement : enregistrer volontairement sa progression avant plusieurs essais. **Menu → Charger une partie** évite le bouton d'accueil qui sauvegarde automatiquement.

## Sources et entretien

[Générateur](../../scripts/test-colonies-v98.ts) : fixture immuable `colony-v90.json.gz`, scénarios `energy-load`, `environment-load`, `trade-load` et `habitat-apparel-load`. La prison est préparée explicitement sur `energy-load` : le constructeur historique V86 ne renseigne pas la qualité des lits requise au schéma 91. Aucun oracle historique modifié.

Entretien : variable `WRITE_TEST_SAVES=1`, puis `npx vitest run tests/test-colonies-v98.test.ts`. Les fichiers versionnés et leurs empreintes sont ensuite testés sans régénération. Une future évolution de schéma doit valider la migration de ces références identifiées. Ces fichiers historiques restent au schéma 91 ; leur migration vers le schéma courant conserve le PRNG et les données hors ajouts neutres documentés. Les courtes reprises ne remplacent pas les campagnes temporelles lorsque leurs contrats changent.

La scène **Atelier de sculpture · 1 colon** ajoute le poste manuel et une œuvre de marbre produite puis installée, avec 50 bois pour essayer une petite sculpture. Préparation et transitions reproductibles : `scripts/generate-art-demo.ts` ; le personnage dort et récupère naturellement avant l’installation. Aucun parcours naturel n’est revendiqué.
