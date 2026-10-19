const owned=new WeakSet<Function>();

/** Called at the producer's construction expression, never on an existing
 * callback discovered during adoption. A new wrapper receives the exact this,
 * arguments, return and exception; only that fresh function is registered.
 * This module must have ONE canonical identity in a composed candidate. */
export function createSourceOwnedRenderHook435<This,Args extends unknown[],Result>(callback:(this:This,...args:Args)=>Result):(this:This,...args:Args)=>Result {
  const hook=function(this:This,...args:Args):Result{return callback.apply(this,args);};
  owned.add(hook);
  return hook;
}

export function isSourceOwnedRenderHook435(callback:unknown):boolean {
  return typeof callback==='function'&&owned.has(callback);
}
