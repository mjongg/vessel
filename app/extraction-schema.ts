import {z} from 'zod';
import {categories} from './health-data';
const text=z.string().max(300);
export const extractionSchema=z.object({category:z.enum(categories),title:text,date:z.string().refine(v=>v===''||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v)),facility:text,patientName:text,summary:z.string().max(4000),warnings:z.array(z.string().max(500)).max(20),sourceQuotes:z.array(z.string().max(600)).max(20),labs:z.array(z.object({name:text.min(1),value:text.min(1),unit:text,low:text,high:text}).refine(l=>(l.low===''||Number.isFinite(Number(l.low)))&&(l.high===''||Number.isFinite(Number(l.high)))&&(l.low===''||l.high===''||Number(l.low)<=Number(l.high)))).max(300)}).strict();
export type Extraction=z.infer<typeof extractionSchema>;
const str={type:'string'};
export const extractionJsonSchema={type:'object',additionalProperties:false,properties:{category:{type:'string',enum:[...categories]},title:str,date:str,facility:str,patientName:str,summary:str,warnings:{type:'array',items:str},sourceQuotes:{type:'array',items:str},labs:{type:'array',items:{type:'object',additionalProperties:false,properties:{name:str,value:str,unit:str,low:str,high:str},required:['name','value','unit','low','high']}}},required:['category','title','date','facility','patientName','summary','warnings','sourceQuotes','labs']};
