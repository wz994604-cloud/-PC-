import type { ResearchModel } from "../types";
import { rank, theoreticalDistribution } from "./math";
const prediction=(name:string)=>({modelName:name,scores:[...theoreticalDistribution],probabilities:[...theoreticalDistribution],confidence:Math.max(...theoreticalDistribution)});
export const theoreticalBaseline:ResearchModel={name:"theoretical-baseline",predict:()=>prediction("theoretical-baseline")};
export const theoreticalModeBaseline:ResearchModel={name:"theoretical-mode-baseline",predict:()=>({...prediction("theoretical-mode-baseline"),diagnostics:{mode:rank(theoreticalDistribution,1)[0],theoreticalDistribution:[...theoreticalDistribution]}})};
