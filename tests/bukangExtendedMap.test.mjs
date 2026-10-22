import assert from 'node:assert/strict';
import {ROUTE,KEY_POINTS,SPAWN,EXIT,SHORTCUT,SHORTCUT_RADIUS,isWater,routePoint,WORLD} from '../public/bukang/harbor.js';
import {patrols,NETS} from '../public/bukang/difficulty.js';
const length=ROUTE.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-ROUTE[i].x,p.y-ROUTE[i].y),0);
assert.ok(length>11000,'Expanded course must be meaningfully longer');
for(let i=0;i<ROUTE.length-1;i++)for(let t=0;t<=1;t+=.02){const p=routePoint(i,t);assert.ok(isWater(p.x,p.y,30),`Unswimmable route ${i}/${t}`);}
for(const p of [SPAWN,EXIT,...KEY_POINTS])assert.ok(isWater(p.x,p.y,30),'Objectives must lie in navigable water');
for(let t=0;t<=1;t+=.02){const [a,b]=SHORTCUT;assert.ok(isWater(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,30));}
assert.ok(SHORTCUT_RADIUS>90,'Shortcut must have room to evade a patrol');
for(let clock=0;clock<60;clock+=.3)for(const p of patrols(clock))assert.ok(isWater(p.x,p.y,0));
assert.equal(NETS.length,4);
assert.ok(!isWater(WORLD.width/2,WORLD.height-50,30),'Land cannot become a sea shortcut');
console.log(`PASS: ${Math.round(length)} world-unit waterway, navigable objectives/branches, four nets, patrols remain in water`);
