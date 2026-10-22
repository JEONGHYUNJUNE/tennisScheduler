import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const root='public/bukang/',origin='https://bukang-chung.vercel.app';
const game=readFileSync(root+'index.html','utf8');
assert.ok(game.includes('<title>부캉이 게임 | 부산 북항 탈출 타임어택</title>'));
const structured=JSON.parse(game.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
assert.equal(structured['@type'],'VideoGame');assert.equal(structured.url,origin+'/');assert.equal(structured.offers.price,'0');
assert.ok(!game.includes('id="site-ad"'),'No ads in game or its controls');
for(const filename of ['index.html','about.html','privacy.html']){
 const html=readFileSync(root+filename,'utf8');
 assert.match(html,/<meta name="description" content="[^"]+"/);assert.match(html,/<link rel="canonical" href="https:\/\/bukang-chung\.vercel\.app\//);
 for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  const ref=match[1];if(/^(https?:|mailto:|#|\/)/.test(ref)||ref==='./')continue;assert.ok(existsSync(root+ref),'Broken local link: '+filename+' '+ref);
 }
}
assert.ok(readFileSync(root+'about.html','utf8').includes('id="site-ad"'));
const sitemap=readFileSync(root+'sitemap.xml','utf8');for(const path of ['','about.html','privacy.html'])assert.ok(sitemap.includes(`<loc>${origin}/${path}</loc>`));
assert.ok(readFileSync(root+'robots.txt','utf8').includes(`Sitemap: ${origin}/sitemap.xml`));
const config=JSON.parse(readFileSync(root+'site-config.js','utf8').replace(/^export const siteConfig=/,'').replace(/;\s*$/,''));
assert.equal(config.adsense.enabled,false);assert.equal(config.adsense.approved,false);
// With unconfigured or unapproved ads, page initialization must not load external scripts.
let created=0;const code=readFileSync(root+'site.js','utf8').replace(/^import .*;\n/,'');
for(const adsense of [config.adsense,{enabled:true,approved:false,client:'ca-pub-0000000000000000',slot:'1'}]){
 vm.runInNewContext(code,{siteConfig:{creator:'',contactEmail:'',adsense},document:{querySelectorAll:()=>[],getElementById:()=>{throw Error('Ads must stay hidden')},createElement:()=>{created++;return{}},head:{append:()=>{throw Error('No advertising requests before approval')}}}});
}
assert.equal(created,0);console.log('PASS: SEO metadata/canonical/schema/sitemap, linked readable guides, no game ads, no ad requests before configuration and approval');
