import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ResearchDraw } from "../types";

export function loadRealDraws(path:string):ResearchDraw[]{
 const extension=extname(path).toLowerCase();
 if(extension===".sqlite"||extension===".db")return loadSqlite(path);
 const text=readFileSync(path,"utf8");
 if(extension===".json")return JSON.parse(text) as ResearchDraw[];
 if(extension===".csv")return text.trim().split(/\r?\n/).slice(1).filter(Boolean).map(line=>{const [issue,openTime,n1,n2,n3,sum]=line.split(",");return {issue,openTime,numbers:[+n1,+n2,+n3],sum:+sum}});
 throw new Error(`Unsupported real history format: ${extension}`);
}
function loadSqlite(path:string){const db=new DatabaseSync(path,{readOnly:true});try{return (db.prepare("SELECT issue, open_time, number_1, number_2, number_3, sum FROM draw_records ORDER BY datetime(open_time), CAST(issue AS INTEGER)").all() as Array<Record<string,string|number>>).map(row=>({issue:String(row.issue),openTime:String(row.open_time),numbers:[Number(row.number_1),Number(row.number_2),Number(row.number_3)],sum:Number(row.sum)} as ResearchDraw))}finally{db.close()}}
