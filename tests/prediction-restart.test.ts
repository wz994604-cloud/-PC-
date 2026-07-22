// @vitest-environment node
import { afterEach,describe,expect,it } from "vitest";
import { mkdtempSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveDraws } from "@/lib/db/draw-repository";
import { getPredictionHistory } from "@/lib/db/prediction-repository";
import { closeDatabaseForTests } from "@/lib/db/sqlite";
import { runPredictionCycle } from "@/lib/prediction/cycle";
import type { Draw } from "@/lib/draw/types";

const directories:string[]=[];
const draw=(issue:string):Draw=>({issue,numbers:[4,5,5],sum:14,bigSmall:"大",oddEven:"双",pattern:"对子",openTime:null,rawOpenTime:null});
afterEach(()=>{closeDatabaseForTests();delete process.env.DATABASE_PATH;for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true})});

describe("prediction storage restart",()=>{
  it("continues accumulation after reopening the same SQLite file",()=>{
    const directory=mkdtempSync(join(tmpdir(),"28live-restart-"));directories.push(directory);
    process.env.DATABASE_PATH=join(directory,"prediction.sqlite");
    saveDraws([draw("100")]);
    runPredictionCycle("2026-01-01T00:00:00Z");
    closeDatabaseForTests();

    expect(getPredictionHistory().total).toBe(1);
    saveDraws([draw("101")]);
    runPredictionCycle("2026-01-01T00:04:00Z");
    expect(getPredictionHistory().records.map((record)=>record.issue)).toEqual(["102","101"]);
  });
});
