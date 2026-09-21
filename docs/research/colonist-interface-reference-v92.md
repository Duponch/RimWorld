# Interface de personne V92 — référence du 21 septembre 2026

## Question et portée

Cette note vérifie la structure d’inspection d’une personne avant de réorganiser l’interface de Lisière. Elle porte sur la hiérarchie visible, la continuité de sélection et la place des informations déjà jouables. Elle ne cherche ni à reproduire les écrans au pixel près, ni à ajouter des biographies, âges, relations, opérations ou inventaires que la simulation locale ne possède pas.

La cible V92 est un résumé compact de la personne sélectionnée, puis des dossiers **Bio, Besoins, Santé, Équipement et Social**. **Prisonnier** apparaît seulement pour un captif. Les boutons et réglages existants restent les mêmes commandes; les onglets changent leur rangement, pas leur sens.

## Sources consultées

### Installation locale, source déterminante pour la structure actuelle

- RimWorld Core **1.6.4871 rev590**, `E:/Steam/steamapps/common/RimWorld/Version.txt`, relu en lecture seule le 21 septembre 2026.
- `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Classes ciblées relues avec ILSpyCmd 8.2 : `ITab_Pawn_Character`, `ITab_Pawn_Needs`, `ITab_Pawn_Health`, `ITab_Pawn_Gear`, `ITab_Pawn_Social` et `ITab_Pawn_Prisoner`.
- `Data/Core/Defs/ThingDefs_Races/Races_Animal_Base.xml` déclare notamment ces dossiers d’inspection pour la base des créatures. `Data/Core/Languages/English/Keyed/ITabs.xml` associe les clés courantes aux libellés `Bio`, `Needs`, `Health`, `Gear`, `Social` et `Prisoner`. Les fichiers propriétaires ont seulement été lus; aucun XML ni code décompilé n’est reproduit ou livré.

Ce relevé établit des panneaux séparés et des conditions de visibilité. La classe Prisonnier exige effectivement un prisonnier de la colonie. Bio exige une histoire disponible; Besoins exige des besoins; Équipement dépend du matériel affichable; Social dépend du type de personne. Lisière n’importe pas ces prédicats complets: elle montre uniquement les cinq domaines qu’elle simule déjà et ajoute Prisonnier sur son propre état réel de captivité.

### Sources publiques et captures datées

- La page communautaire [Health](https://rimworldwiki.com/wiki/Health), relue le 21 septembre 2026, décrit l’onglet Santé « au-dessus du panneau d’inspection » et ses sous-parties aperçu/opérations. Elle recoupe la place du dossier; ses détails médicaux dépassent le périmètre local.
- La page communautaire [Skills](https://rimworldwiki.com/wiki/Skill), relue le même jour, place les compétences dans Bio. Elle soutient le regroupement des compétences et traits locaux, sans autoriser l’invention d’une histoire personnelle.
- La page communautaire [User interface](https://rimworldwiki.com/wiki/User_interface), relue le même jour, situe le panneau d’inspection en bas à gauche lorsqu’un objet ou personnage est sélectionné.
- Une [capture de RimWorld annexée à un dossier public australien](https://www.righttoknow.org.au/request/8702/response/27307/attach/6/FOI%20request%20CB%2022%20008%20Document%20pack%20Redacted.pdf?cookie_passthrough=1), document publié en 2022 et capture antérieure, montre les languettes au-dessus du panneau bas-gauche. Elle sert uniquement de preuve visuelle historique pour la relation spatiale; elle ne certifie pas l’ordre ni le contenu de Core 1.6.4871.
- La [page officielle Steam](https://store.steampowered.com/app/294100/RimWorld/) a été consultée pour les captures générales de l’interface. Elles corroborent la densité et la place du HUD, mais aucune capture de boutique n’est retenue comme preuve exhaustive des dossiers d’une personne.

Les captures publiques varient selon version, langue, contenu sélectionné et mods éventuels. L’installation locale tranche donc les noms/classes, tandis que les images ne servent qu’à lire la géométrie générale.

### Corpus et implémentation locale

Le registre [reference-adoption.md](reference-adoption.md) a été relu pour les contrats UI déjà adoptés: soins/capture, compétences, pensées, opinions, équipement et besoins restent des domaines séparés. Le corpus ne constitue pas une preuve que leur présentation actuelle dans Lisière est correcte.

Dans Lisière V91, les producteurs réels sont déjà distincts:

| Dossier V92 | Vue existante réutilisée | Limite conservée |
|---|---|---|
| Bio | `skills-inspection` et `traits-inspection` | aucun âge ni passé personnel inventé |
| Besoins | jauges nourriture/repos/confort/humeur, loisirs et pensées | aucune jauge supplémentaire sans simulation |
| Santé | `health-inspection`, infection et politiques de soins | aucune opération médicale fictive |
| Équipement | `equipment-inspection`, arme, vêtements et cargaison réels | inventaire personnel complet toujours absent |
| Social | `social-inspection`, compétence, dernier échange et opinions | aucune relation ou mémoire rétroactive |
| Prisonnier | `prisoner-inspection`, mode, résistance, régime et état réels | visible uniquement si `pawn.prisoner` existe |

Les commandes Mobiliser, tir/mêlée, réaction hostile, Travail, annulation d’ordres, nettoyage, inhumation, soins, retrait de vêtement et dépôt d’arme ne sont pas recréées. Le composite V92 déplace leurs nœuds DOM existants afin de conserver écouteurs, identifiants et attributs de données.

## Décisions V92

1. Les languettes sont une navigation de présentation placée au-dessus du panneau bas-gauche. Elles ne créent aucun état de simulation.
2. Le nom, l’activité courante et le contexte de pièce restent dans un résumé visible indépendamment du dossier.
3. L’onglet actif est un état contrôlé par l’application. Changer de personne conserve le même domaine lorsqu’il existe; quitter un captif alors que Prisonnier est actif revient à Bio. Cette continuité est une adaptation d’ergonomie, vérifiée localement, pas une prétention d’identité interne avec RimWorld.
4. Les rôles ARIA `tablist`, `tab` et `tabpanel`, les liens `aria-controls`/`aria-labelledby`, `aria-selected`, le roving `tabindex` et les touches fléchées/Home/End rendent la structure utilisable au clavier et lisible par technologie d’assistance.
5. Les anciens accordéons sont ouverts à l’intérieur du panneau actif et leur en-tête redondant est masqué par la feuille structurelle. Leurs fonctions de mise à jour continuent de cibler les mêmes identifiants.
6. La feuille `colonist-inspector.css` traite uniquement placement, défilement, empilement et petites largeurs. Les couleurs, textures bois/parchemin, typographie et décoration relèvent du thème V92 commun.

## Confiance et limites

| Conclusion | Confiance | Motif |
|---|---:|---|
| Dossiers Core séparés Bio/Besoins/Santé/Équipement/Social, Prisonnier conditionnel | haute | classes et Def locale 1.6.4871 concordantes |
| Languettes au-dessus du panneau d’inspection bas-gauche | haute | classe d’interface décrite publiquement et captures concordantes |
| Compétences dans Bio, détails médicaux dans Santé | haute | classes locales et pages spécialisées concordantes |
| Conserver le dossier lors d’un changement de personne | moyenne | comportement d’usage public observé; choix contrôlé et réversible dans Lisière |
| Ordre exact, tailles et apparence identiques à Core 1.6.4871 | non revendiqué | captures hétérogènes et adaptation web/française |

V92 rapproche la structure de consultation et enlève l’empilement qui faisait se chevaucher ou enfouissait les domaines. Elle ne signifie pas que Lisière possède l’interface, le catalogue de données ou toutes les actions du jeu complet.
