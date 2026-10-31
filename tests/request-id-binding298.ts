import type {Request} from '../src/bridge/protocol';

/** Historical transport mocks expect a correlated request, never an id-less ship control. */
export function mockRequestId298(request:Request):number {
 if(!('id' in request))throw Error('This transport mock requires a request with an id');
 const id=request.id;
 if(typeof id!=='number')throw Error('This transport mock requires a numeric request id');
 return id;
}
