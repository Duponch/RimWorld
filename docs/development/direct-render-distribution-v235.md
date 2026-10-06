# V235 — distribution directe au rendu, expérience écartée

**Produit V233 conservé, schéma 198 inchangé.** Le trajet natif direct reste
privé : un cycle A/B/B/A sur Les Aulnes donne 176,31 → 163,13 images soumises/s,
soit **−7,48 %**, avec une simulation proche de 6× des deux côtés. Aucun gain FPS
n'est livré et aucun hôte GAME supplémentaire n'est porté. La
[preuve](../history/validation-direct-render-distribution-v235.md) borne le banc ;
la [recherche](../research/direct-render-distribution-v235.md) décrit les contraintes.

Le montage complet Offscreen V231 avait déjà régressé de 13,36 %. Cette nouvelle
expérience retire uniquement la retransmission du gros paquet depuis main : le
producteur encode une seule fois, puis publie le même paquet vers le client
principal natif et un MessagePort du worker graphique. Deux sérialisations,
livraisons et décodeurs stricts demeurent ; aucun miroir propriétaire V234 rejeté
ou garde réduit n'est repris.

L'application graphique attend l'acquittement principal `APPLIED`, émis après
`onSnapshot`, l'audio et le règlement de la réponse corrélée. Le join est FIFO
selon la séquence source et le tuple génération/epoch/révision ; les deux ports
n'ont pas un ordre global implicite. Les publications d'une ancienne epoch
attendant leur ACK restent appliquées avant le remplacement au tuple suivant.
Files et ACK sont bornés à 64 ; dépassement ou refus échoue explicitement,
sans abandon de publication ou resynchronisation cachée.

Le Core utilise sa vraie horloge et le RAF natif de son environnement. Le temps
d'acquittement sert à l'observation, jamais à remplacer l'horloge de `setWorld`.
Une image compte seulement après une passe principale terminée, un retour réussi
de `renderer.render` et des appels de dessin. Le RAF de main, les timers et la
cadence demandée ne deviennent pas un compteur FPS du worker.

Le second post source coûte environ 1,01 ms par publication ; le second lecteur
strict environ 3,64–3,70 ms. La latence confirmation principale→join graphique
reste mesurée séparément. Déplacer l'application d'environ 9–10 ms ne supprime
pas son travail. Les durées imbriquées, livraisons et CPU ne s'additionnent pas
comme des postes indépendants.

Le banc possède le Core, ses caméras, lumières, herbe, ombres et qualités réelles.
Il exclut l'hôte GAME, interactions, étiquettes et audio en activité. Ses images
soumises ne certifient ni chaque image composée à l'écran, ni 240 Hz physiques.
Les valeurs ne se comparent pas causalement aux RAF du GAME V233 mesurés dans un
autre contexte. Aucun nouveau budget GPU n'est établi.

La suite vise une réduction du travail local. Le renderer relit encore toutes
les cases pour la topologie de l'éclairage, même quand il conserve ses pièces.
V236 privé examine une capture terrain possédée actualisée par le suffixe brut
confirmé A→C, sous le mandat readonly natif existant. Barrières ordonnées,
masque combiné, lumières, sols, qualité et cadence restent historiques ; un
suffixe absent, checkpoint, epoch, copie inconnue ou appel mutable impose le
parcours complet. Ce design n'est pas un gain acquis : coût de composition,
froid, oracles et vrai GAME décideront de son adoption.
