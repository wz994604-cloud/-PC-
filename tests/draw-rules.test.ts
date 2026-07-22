import { describe,expect,it } from "vitest";
import { calculateDraw } from "@/lib/draw/rules";
import { getDrawPattern } from "@/lib/draw/pattern";
describe("draw rules",()=>{it.each([[[0,0,0],0,"小","双"],[[9,9,9],27,"大","单"],[[4,5,5],14,"大","双"],[[3,5,5],13,"小","单"]] as const)("calculates %j",(numbers,sum,bigSmall,oddEven)=>{expect(calculateDraw(numbers)).toEqual({sum,bigSmall,oddEven})});it("rejects invalid numbers",()=>expect(()=>calculateDraw([1,2,10])).toThrow(RangeError))});
describe("draw patterns",()=>{it.each([[[1,1,1],"豹子"],[[1,1,2],"对子"],[[2,1,1],"对子"],[[1,2,3],"顺子"],[[3,2,1],"顺子"],[[2,1,3],"顺子"],[[0,1,2],"顺子"],[[7,8,9],"顺子"],[[1,3,5],"杂六"]] as const)("classifies %j",(numbers,pattern)=>{expect(getDrawPattern(numbers)).toBe(pattern)})});
