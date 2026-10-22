import assert from 'node:assert/strict';
import {drawWaterways} from '../public/bukang/waterways.js';
import {ROUTE,SHORTCUT,CHANNEL_RADIUS,SHORTCUT_RADIUS,SEA,WORLD,isWater} from '../public/bukang/harbor.js';
const layers=[];let points=[];
const ctx={beginPath(){points=[]},moveTo(x,y){points.push({x,y})},lineTo(x,y){points.push({x,y})},stroke(){layers.push({points:[...points],radius:this.lineWidth/2,color:this.strokeStyle})},fillRect(x,y,w,h){layers.push({rect:{x,y,w,h},color:this.fillStyle})}};
function distance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
function pixel(p){let color='land';for(const l of layers){if(l.rect){const r=l.rect;if(p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h)color=l.color;}else if(l.points.slice(1).some((b,i)=>distance(p,l.points[i],b)<=l.radius))color=l.color;}return color;}
for(const banks of [true,false]){
 layers.length=0;drawWaterways(ctx,'water',{banks});
 for(const {points:route,radius} of [{points:ROUTE,radius:CHANNEL_RADIUS},{points:SHORTCUT,radius:SHORTCUT_RADIUS}]){
  for(let i=0;i<route.length-1;i++){const a=route[i],b=route[i+1],angle=Math.atan2(b.y-a.y,b.x-a.x);for(let t=0;t<=1;t+=.02)for(const offset of [-radius+2,0,radius-2]){const p={x:a.x+(b.x-a.x)*t-Math.sin(angle)*offset,y:a.y+(b.y-a.y)*t+Math.cos(angle)*offset};assert.equal(pixel(p),'water',`Bank covers channel at ${p.x},${p.y}`);}}
 }
 for(let x=20;x<WORLD.width;x+=80)for(let y=20;y<WORLD.height;y+=80){if(pixel({x,y})==='water')assert.ok(isWater(x,y,0),'Rendered water must match collision water');}
 assert.equal(pixel({x:SEA.x/2,y:SEA.y+100}),'water');
}
console.log('PASS: main channel and shortcut stay visibly water through both junctions; overview and collisions agree');
