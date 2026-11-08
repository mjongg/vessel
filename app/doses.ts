// Shared by the tick-off screen and its API route. Times match the "When is it taken?" choices on a medicine.
export const doseSlots=['Morning','Noon','Evening','Bedtime','As needed'] as const;
export type DoseSlot=typeof doseSlots[number];
export type DoseMark={medicineId:string;day:string;slot:DoseSlot;status:'given'|'skipped';by:string;at:string};

/** Today's date in the Philippines, as YYYY-MM-DD. */
export const manilaDay=(at=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(at);
/** The day before or after a YYYY-MM-DD date. */
export const shiftDay=(day:string,by:number)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+by);return d.toISOString().slice(0,10)};
/** How many scheduled doses on one day have any mark, for the "4 of 6 done" line. "As needed" is never counted as due. */
export function progress(due:{id:string;slot:string}[],marks:DoseMark[],day:string){
 const scheduled=due.filter(d=>d.slot!=='As needed');
 const done=scheduled.filter(d=>marks.some(m=>m.medicineId===d.id&&m.slot===d.slot&&m.day===day)).length;
 return {done,total:scheduled.length};
}
