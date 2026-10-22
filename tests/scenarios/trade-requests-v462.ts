import {preparedGiftCamp274,GIFT_CAMP_SOURCE274,GIFT_CAMP_SOURCE_SHA274} from '../helpers/diplomatic-gifts-v450.ts';
import {serializeCampaign,deserializeCampaign} from '../../src/sim/serialization.ts';
import {SCHEMA_VERSION,type World} from '../../src/sim/types.ts';

export const TRADE_REQUEST_CAMP_SOURCE462=GIFT_CAMP_SOURCE274;
export const TRADE_REQUEST_CAMP_SOURCE_SHA462=GIFT_CAMP_SOURCE_SHA274;
export const TRADE_REQUEST_CAMP_PREPARATION462='Acquired geographic campaign259, real caravan5 and its original people/animals/possessions. Reuses the declared V450 destination/60cloth/40wool preparation and real finite arrival stock. No natural journey, production, trade-request incident or fulfillment is claimed. Migrate and serialize the current campaign once, then reload that exact current baseline for each test; never regenerate its geography or faction owners.';

type Camp462=Omit<ReturnType<typeof preparedGiftCamp274>,'w'>;
let baseline:{serialized:string;metadata:Camp462}|undefined;
/** No simulation, RNG reset or selected seed search. The actual259 migration
 * and finite post preparation happen once per process. Every caller receives
 * independently admitted current owners, including the old unknown garments. */
export function preparedTradeRequestCamp462():Camp462&{w:World}{
 if(!baseline){
  const {w,...metadata}=preparedGiftCamp274();
  if(w.schemaVersion!==SCHEMA_VERSION||w.planet?.revision!==3)throw Error('Trade request fixture requires the real current geographic campaign');
  baseline={serialized:serializeCampaign(w),metadata};
 }
 const loaded=deserializeCampaign(baseline.serialized);
 if(!('pawns'in loaded))throw Error('Acquired trade request fixture lost its real loaded map');
 return {...baseline.metadata,w:loaded};
}
