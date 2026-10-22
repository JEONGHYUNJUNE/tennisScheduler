import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const env={};
for(const file of ['.env','.env.local'])if(existsSync(file))for(const line of readFileSync(file,'utf8').split(/\r?\n/)){const match=line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);if(match)env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');}
const url=process.env.VITE_SUPABASE_URL||env.VITE_SUPABASE_URL;
const key=process.env.VITE_SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY;
if(!url||!key)throw new Error('Missing public Supabase configuration for Bukang records');
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw new Error('Unexpected Supabase URL');
if(key.startsWith('eyJ')){const role=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role;if(role!=='anon')throw new Error('Only a public anonymous key may be included in the game');}
else if(!key.startsWith('sb_publishable_'))throw new Error('Only public publishable keys are supported');
writeFileSync('public/bukang/config.js',`// Public client configuration; no private credentials.\nexport const recordsConfig=${JSON.stringify({url,key})};\n`);
console.log('Bukang public records configuration generated');
