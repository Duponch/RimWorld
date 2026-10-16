import {tuqueWorkshopV384} from './tuque-v384';
import {addMaterial} from '../../src/sim/materials';
import {serializeWorld,validateWorld} from '../../src/sim/serialization';

/** One additional declared possession, before import: a normal worn flak helmet.
 * Its removal/replacement must happen physically during the real UI sequence. */
export function tuqueNativeV384(){
  const f=tuqueWorkshopV384();
  addMaterial(f.world,'apparel',1,{type:'apparel',pawnId:f.pawnId},'flak-helmet');
  const helmet=f.world.piles.find(p=>p.item==='flak-helmet')!;
  const errors=validateWorld(f.world);if(errors.length)throw Error(errors.join('\n'));
  return {...f,initial:serializeWorld(f.world),helmetId:helmet.id,
    notice:'PRÉPARÉ32² : atelier manuel fini, recherche Vêtements complexes achevée,20laines de muffalo finies, réserve vêtements et casque pare-balles normal déjà porté. Aucune récolte, tonte, acquisition naturelle, facture, travail, tuque ou port de tuque n’est précrédité. La qualité réellement produite et le flux RNG restent intacts.'};
}
