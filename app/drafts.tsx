 'use client';
import {createContext,useCallback,useContext,useState,type Dispatch,type SetStateAction} from 'react';
export const DraftContext=createContext('');
const drafts=new Map<string,Map<string,unknown>>();
export function hasDraft(key:string){return !!drafts.get(key)?.size}
export function hasAnyDraft(){return drafts.size>0}
export function clearDraft(key:string){drafts.delete(key)}
export function useDraftState<T>(field:string,initial:T|(()=>T)):[T,Dispatch<SetStateAction<T>>]{const key=useContext(DraftContext);const [value,setValue]=useState<T>(()=>drafts.get(key)?.has(field)?drafts.get(key)!.get(field) as T:typeof initial==='function'?(initial as ()=>T)():initial);const set=useCallback<Dispatch<SetStateAction<T>>>((next)=>setValue(old=>{const result=typeof next==='function'?(next as (v:T)=>T)(old):next;const values=drafts.get(key)||new Map();values.set(field,result);drafts.set(key,values);return result}),[key,field]);return [value,set]}
