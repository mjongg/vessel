// Stable identity for a picked File, so a component can be remounted (state reset) when the file changes.
const keys=new WeakMap<File,string>();
let count=0;
export function fileKey(file:File){let key=keys.get(file);if(!key){key='file-'+(++count);keys.set(file,key)}return key}
