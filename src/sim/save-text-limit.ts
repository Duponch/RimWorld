/** Same 256MiB UTF-8 ceiling as the storage codec, without a second byte buffer. */
export const MAX_SAVE_UTF8_BYTES=268_435_456;
export function withinSaveTextLimit(text:string,maxBytes=MAX_SAVE_UTF8_BYTES):boolean {if(text.length>maxBytes)return false;let bytes=0;for(let i=0;i<text.length;i++){const n=text.charCodeAt(i);bytes+=n<0x80?1:n<0x800?2:3;if(n>=0xd800&&n<=0xdbff&&i+1<text.length){const low=text.charCodeAt(i+1);if(low>=0xdc00&&low<=0xdfff){bytes++;i++;}}if(bytes>maxBytes)return false;}return true;}
