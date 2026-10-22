import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync('public/bukang/index.html','utf8');
const base=html.match(/<base\s+href="([^"]+)"/);assert.ok(base,'Game needs a fixed base URL when Vercel serves /bukang without a slash');
for(const page of ['https://tennis-chung.vercel.app/bukang','https://tennis-chung.vercel.app/bukang/','https://tennis-chung.vercel.app/bukang?share=1','https://tennis-chung.vercel.app/bukang/index.html']){
 const documentBase=new URL(base[1],page);
 for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(match[1]===base[1])continue;
  const resource=new URL(match[1],documentBase);assert.ok(resource.pathname.startsWith('/bukang/'),`${page} escaped game path: ${resource}`);assert.ok(existsSync('public'+resource.pathname),`Missing ${resource.pathname}`);
 }
}
console.log('PASS: CSS, JS and images resolve under /bukang/ with and without a trailing slash, queries and index.html');
