# Bibliothèque de colonies de test — V98

V101 ajoute une [démonstration industrielle à importer](../../public/test-saves/v101/atelier.json), distincte des six colonies V98 inchangées. Recherches et matériel initial sont préparés ; l’atelier est ensuite construit par le vrai moteur. `node --experimental-strip-types scripts/machining-demo-v101.ts` régénère et recharge exactement ce fichier. Aucun travail d’armurerie n’est lancé à l’avance.

Six sauvegardes Lisière sont accessibles dans **Charger une partie → Colonies de test**, depuis l'accueil ou Menu. Elles permettent d'essayer les systèmes et performances sans recommencer une colonie. [Preuves](../history/validation-test-colonies-v98.md).

| Colonie | Habitants vivants | Situation disponible |
|---|---:|---|
| Colonie avancée | 4 | Campagne Lisière poursuivie pendant 182,577 jours ; habitat, cultures, vêtements, stocks et travaux conservés. |
| Nourriture et énergie | 12 | Deux cuisines électriques, solaire, batteries, interrupteurs, froid, cultures et 12 lièvres. |
| Prison et intendance | 12 + 2 captifs | Deux chambres de prison, lits, rations physiques, geôliers et énergie. |
| Vent, chaleur et incendie | 12 | Éoliennes, chauffage, climat et six foyers préparés, extinction ordinaire. |
| Commerce et circulation | 100 + 2 visiteurs | Marchand, argent et stocks finis, ateliers, cultures, énergie et 100 lièvres. |
| Habitat, vêtements et salubrité | 100 + 2 visiteurs | Tailleurs, vêtements, mobilier, patients, salissures, tombes, deux morts préparés et 100 lièvres. |

Toutes les cartes font 250 × 250. Les cinq situations préparées proviennent de scénarios de charge : elles ne représentent pas des colonies autonomes équilibrées. Certains besoins sont déjà urgents ; elles servent à exercer des systèmes existants, sans démontrer une progression naturelle ou la parité Core. La première est une partie de **Lisière**, jamais une sauvegarde personnelle RimWorld. Ses 48 dossiers comprennent quatre habitants vivants et 44 morts historiques. Visiteurs, captifs et morts ne comptent pas comme cent colons libres.

## Chargement et conservation

Le catalogue et le fichier choisi sont téléchargés à la demande depuis `/test-saves/v98/`. Aucun constructeur de scénario n'entre dans le bundle applicatif. Les fiches indiquent provenance, systèmes et coordonnées utiles. Chaque chargement repart du même état en pause ; règles et délais ordinaires reprennent ensuite.

Le manifeste contient les comptes et le SHA-256 du JSON métier décompressé. Lecture réseau bornée, nom de fichier contrôlé, décompression bornée et empreinte précèdent la validation stricte du worker. **Télécharger le fichier** conserve l'enveloppe compressée ; **Importer un fichier** accepte aussi les sauvegardes JSON brutes, dans la limite de 32 Mio. Ce n'est pas un importeur RimWorld.

`GameSession.loadExternal` partage l'exclusion des créations/chargements. Une lecture refusée ne touche aucun emplacement ; un refus worker conserve le monde actif et restaure l'ancienne récupération. Avant remplacement accepté, le monde courant est conservé dans **Colonie précédente**. La **Sauvegarde manuelle** reste intacte. La récupération n'a qu'un emplacement : enregistrer volontairement sa progression avant plusieurs essais. **Menu → Charger une partie** évite le bouton d'accueil qui sauvegarde automatiquement.

## Sources et entretien

[Générateur](../../scripts/test-colonies-v98.ts) : fixture immuable `colony-v90.json.gz`, scénarios `energy-load`, `environment-load`, `trade-load` et `habitat-apparel-load`. La prison est préparée explicitement sur `energy-load` : le constructeur historique V86 ne renseigne pas la qualité des lits requise au schéma 91. Aucun oracle historique modifié.

Entretien : variable `WRITE_TEST_SAVES=1`, puis `npx vitest run tests/test-colonies-v98.test.ts`. Les fichiers versionnés et leurs empreintes sont ensuite testés sans régénération. Une future évolution de schéma doit valider la migration de ces références identifiées. Schéma 91, catalogue V91 et PRNG conservés. Les courtes reprises ne remplacent pas les campagnes temporelles lorsque leurs contrats changent.
