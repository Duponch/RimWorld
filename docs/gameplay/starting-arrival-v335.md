# V335 — arrivée physique des survivants

13 octobre 2026. Schéma 231, départ prospectif Crashlanded révision 10. Ce lot ferme la transition entre les cinq pages de création et les premiers gestes sur la carte ; il ne qualifie pas encore une campagne early access complète.

## Parcours joueur et conservation

Le départ choisi reste en pause. Trois capsules contiennent les trois personnes sélectionnées et leurs possessions originales. Le bandeau indique les noms et permet de reprendre ; les portraits et le carnet des premiers jours apparaissent après la sortie réelle. Aucun colon contenu ne travaille, ne mange, ne marche ni n’est ciblable comme un acteur de carte. Bois et acier dispersés sont déjà au sol ; les autres fournitures deviennent disponibles à l’ouverture.

L’horloge de simulation confirme l’impact au tick 15 puis l’ouverture collective au tick 27, soit 4,5 secondes à ×1. Les vitesses modulent cette horloge ; la pause la fige. Les cellules de sortie et de dépôt sont réévaluées avant tout transfert. Une sortie obstruée conserve les trois personnes et tous les biens, affiche le problème et retente au tick suivant. Un plan bloquant peut être annulé ; aucune autre cellule n’est choisie silencieusement.

Les personnes, vêtements, armes, piles, quantités, liens familiaux et profils gardent leurs identités. Trois identités de capsule sont allouées à la création seulement. L’ouverture n’effectue aucun tirage aléatoire, ne fabrique aucun objet, ne fusionne aucune pile et ne régénère aucun profil. L’état ouvert est un reçu de cellules et d’heure, sans propriétaire humain ou matériel supplémentaire.

## Référence et adaptations explicites

La [présentation officielle de RimWorld](https://rimworldgame.com/) décrit trois survivants naufragés et le choix d’un site d’arrivée. L’[annonce Ludeon 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) situe la branche de référence ; elle est antérieure à l’installation locale étudiée, **Core 1.6.4871 rev590**. Les timings et conteneurs exacts sont relevés dans cette installation, pas déduits du site Web.

Le Core détient réellement Pawn et items dans un conteneur de transport. Sa chute varie de 120 à 200 ticks Core, puis l’ouverture survient après 111 ticks actifs au sol. Elsewhere adopte le principe de custody, avec une chronologie locale fixe de 15+12 ticks et une ouverture collective atomique. Cette chronologie est une adaptation, pas la distribution Core. Les fournitures et permissions existantes sont conservées. Ce lot n’ajoute ni scorie, interdiction générique de piles, animal initial, casque/pantalon pare-balles, maladie de cryptosommeil ni capsule destructible. Le récit modal de bienvenue et sa reprise automatique ne sont pas repris : le départ reste en pause comme V333.

Les sources locales privées et leurs extraits restent sous `tmp/arrival-v334/`. Aucun code ou asset propriétaire n’est publié. SHA256 du binaire Core étudié : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`.

## Propriétaires, sauvegarde et rendu

Pendant l’attente, les contenus sont exclus de `world.pawns`, `world.piles`, des stocks disponibles et des travaux de carte. La capture commune des humains connaît leur propriétaire distinct et leur horloge personnelle figée à zéro ; elle les inclut dans les identités, liens et plafonds actifs, sans les confondre avec une archive de personne partie. Les personnes initiales fraîches n’ont aucun travail, maladie active ou blessure engagée. Seule l’ancre clinique est recalée à la sortie pour reprendre les soins ordinaires sans rattrapage fictif ; âge, besoins, compétences et vêtements restent ceux détenus.

La migration 230→231 valide strictement l’ancien schéma puis change seulement le numéro. Elle ne crée aucune arrivée dans les campagnes anciennes, y compris les départs préparés révision 9. Les sauvegardes anciennes contenant les futurs propriétaires sont refusées. Save et Decoder vérifient forme, horaires, contenus frais, dotation, propriétaires exclusifs et namespace avant publication. Dans une même epoch, le Decoder refuse la réécriture d’un contenu détenu ou la résurrection d’une arrivée ouverte ; une vraie recharge passe par une nouvelle epoch. Au snapshot du tick exact d’ouverture, le Decoder vérifie aussi la restitution de chaque personne et objet original, avec seulement les changements de propriétaire et d’ancre autorisés. Un snapshot ultérieur peut arriver après plusieurs ticks omis : cette garde n’en démontre pas à elle seule tous les transferts intermédiaires ; les règles de propriété ordinaires et la conservation dans la simulation restent nécessaires.

La projection Three utilise un lot résident de 24 pièces pour trois capsules, avec texture originale et LOD commun. Pause et phase viennent des ticks adoptés. L’animation ne décide jamais de la sortie ; le reçu confirmé déclenche l’ouverture et une extinction courte. Après extinction, les snapshots et images prennent une sortie anticipée, sans reconstruire les cellules ou coefficients. Il reste une petite allocation résidente et une vérification de reçu ; aucun coût strictement nul, gain FPS ou 240 FPS n’est revendiqué.

## Contrôles ROOT

ROOT seul exécute séquentiellement sur sources, tests, publics et pilotes gelés : `tmp/arrival-v335/freeze.json`, 2842 entrées exactes. Les états préparés et les campagnes naturelles restent distincts.

- Unités : **175 cas uniques dans 15 fichiers acquis par reprises**, dont 24 nouveaux dans quatre fichiers d’arrivée. Premier groupe 171/175, 16,869 s ; reprise des trois fichiers concernés 20/20, 8,716 s. Conservation, blocage collectif, sortie, migrants, liens, limites de propriétaires, namespace, checkpoints/deltas refusés et projection sont couverts.
- Typage complet : PASS, 11,434 s après une annotation TypeScript autorisant le `motion:null` existant ; première erreur conservée, 11,039 s. L’annotation n’a pas changé le JavaScript métier.
- Corpus public : **63 références/66 fichiers**, PASS, 56,611 s. Migration, sauvegarde/recharge, vrai tick, RAW et adoption immutable ; fichiers publics exacts. Les anciens `gatherId:undefined` absents après transport JSON restent normalisés uniquement sur les chemins déjà documentés, pas sur des valeurs définies.
- Chrome natif/WebGPU : deux parcours PASS, **75,073 s**. Création 250², cinq pages et événements de glisser-déposer natifs ; équipe Robin/Équipe 333/Alex aux IDs18530/18532/18534. Départ en pause0, export/recharge exacte pendant la descente au tick4, puis mêmes personnes et biens après ouverture, état34. Parcours du carnet : arrivée, état30, outils existants, focus pendant les ticks, deux tailles1440/960 et export/recharge37exacte. Aucun message d’erreur ; images iso/perspective et carnet960 inspectées. Les capsules peuvent encore être partiellement hors cadre pendant la chute en perspective : les captures ne prouvent pas un cadrage intégral de trois capsules.

Les quatre premiers rouges unitaires sont conservés sous `tmp/validation-runs/v335-arrival-unit-2026-10-12T23-08-35.898Z-20432/`. Deux fixtures sautaient directement l’horloge sans avancer plantes/personnes ; elles utilisent maintenant de vrais ticks. Un refus de climat se produit désormais plus tôt dans la garde du propriétaire : seule l’attente du message est corrigée. Le faux schéma79 transportait une permission future de croquettes : la fixture retire cette permission avec le helper historique existant ; l’admission des contenus futurs reste stricte. Aucun assouplissement produit pour faire passer ces reprises.

Le premier Chrome n’atteignait pas le serveur Vite lancé dans un autre environnement de sandbox : 9,018 s, avant chargement du jeu, rapport `native-report-connection-red.json`. Reprise avec Vite et Chrome dans le même environnement, sans changer le produit, les assertions ou le backend.

Le premier contrôle commun de présentation a été lancé par erreur sur le Chromium des tests, malgré la cible Chrome prévue : 68,311 s, quatre refus Tint IR « swizzle view instruction still has usages after lowering ». Il constate néanmoins minage186→162, tick2885, aucune starvation, aucun saut ni présence dans une roche ; les commandes de vitesse répondent en7,3–19,8ms. L’échec est déclenché par les erreurs de pipeline, pas par l’absence de progression. Le rapport reste conservé ; la reprise Chrome n’est pas une réparation démontrée du compilateur Chromium.

Le contrôle commun **Chrome PASS, 129,891 s** : minage186→162 au tick2885, abattage262→238 au tick2887, aucun saut brut ou discontinu, aucune starvation, aucune occupation de roche ni erreur ; changements de vitesse en4,9–17,9ms. Rapport `tmp/test-runs/v335-presentation-chrome-2026-10-12T23-21-45.486Z-24664/artifacts/harvest-sync-verification.json`. Cette fixture legacy n’utilise pas l’arrivée et complète le parcours natif qui l’exerce réellement. Elle ne répare pas rétroactivement le refus d’allocation du banc V333 ni les erreurs Tint IR.

Build Pages final **PASS, 2,032 s**, après typage complet séparé ; le laboratoire et les fichiers privés restent exclus. Documentation **PASS, 1,922 s**, six en-têtes courants au schéma231 et trois sources originales identiques. Publication consignée à la clôture. Ni suite complète, campagne naturelle entière, compatibilité graphique exhaustive, gainFPS ni 240FPS certifiés.

## Livraison et suite

Produit **`59717fa7` commité/poussé sur `main`**, publié une seule fois avec V334 en **`4d7ac5ca`**. Package515fichiers/119392441octets,63références/66fichiers exacts ; inspection1,493s, Wrangler17,517s et102réponsesHTTPS exactes6,436s. [Publication et limites](../development/cloudflare-pages.md#publication-v334v335--carnet-et-arrivée-physique). ServeurVite5408 et navigateurs de contrôle possédés fermés ; `references_UI/` laissé intact.

La suite prioritaire est le couchage humain au sol et la première nuit des trois biomes, puis la qualification d’une campagne durable et de ses issues. La relance demeure ACTIVE à la demande humaine. [Critères early access](early-access-readiness.md).
