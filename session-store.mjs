import {randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir,lstat,rename,chmod,rm} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {spawn} from 'node:child_process';

export function sessionLifetime(days){
 if(days===undefined)return 2*60*60*1000;
 const n=Number(days);if(!Number.isInteger(n)||n<1||n>90)throw Error('--session-days must be a whole number from 1 to 90.');
 return n*86400000;
}
// DPAPI binds the saved credential to this Windows user on this computer.
// Only stdin/stdout pipes carry plaintext; no secret appears in command arguments.
export function windowsProtect(input,decode=false){
 const operation=decode?'Unprotect':'Protect';
 const script=`$ErrorActionPreference='Stop'; [Console]::InputEncoding=[Text.UTF8Encoding]::new($false); [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); Add-Type -AssemblyName System.Security; $s=[Console]::In.ReadToEnd(); $b=${decode?'[Convert]::FromBase64String($s)':'[Text.Encoding]::UTF8.GetBytes($s)'}; $r=[Security.Cryptography.ProtectedData]::${operation}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write(${decode?'[Text.Encoding]::UTF8.GetString($r)':'[Convert]::ToBase64String($r)'})`;
 return new Promise((done,reject)=>{const p=spawn(join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{stdio:['pipe','pipe','pipe'],windowsHide:true});let output='';const timer=setTimeout(()=>{p.kill();reject(Error('Windows credential protection timed out.'));},15000);p.stdout.on('data',b=>{output+=b;if(output.length>32768)p.kill();});p.stderr.on('data',()=>{});p.on('error',()=>{clearTimeout(timer);reject(Error('Windows credential protection could not start.'));});p.on('close',code=>{clearTimeout(timer);code===0?done(output):reject(Error('Windows credential protection failed. Use the same Windows account.'));});p.stdin.on('error',()=>{});p.stdin.end(input);});
}
export async function openSessionStore({cwd,port,ttlMs,reset=false,path,protect=windowsProtect,platform=process.platform,now=Date.now()}){
 path ||= join(platform==='win32'?(process.env.LOCALAPPDATA||join(homedir(),'AppData','Local')):homedir(),platform==='win32'?'GraceRemoteCredentials':'.grace-remote-sessions',`session-${port}.json`);
 const dir=dirname(path);await mkdir(dir,{recursive:true,mode:0o700});
 if((await lstat(dir)).isSymbolicLink())throw Error('Session directory cannot be a symlink.');
 if(platform!=='win32')await chmod(dir,0o700);
 const binding={cwd:resolve(cwd),port};
 async function save(session){
  const payload=JSON.stringify({...binding,...session});
  const data=platform==='win32'?JSON.stringify({version:1,dpapi:await protect(payload)}):payload;
  const temp=path+'.'+randomBytes(8).toString('hex')+'.tmp';
  try{await writeFile(temp,data,{flag:'wx',mode:0o600});await rename(temp,path);}finally{await rm(temp,{force:true});}
 }
 let record;
 try{const info=await lstat(path);if(info.isSymbolicLink()||!info.isFile()||info.size>32768)throw Error('Invalid saved session file.');
  if(!reset){if(platform!=='win32'&&process.platform!=='win32'&&(info.mode&0o077))throw Error('Saved session file must have mode 0600.');const raw=JSON.parse(await readFile(path,'utf8'));record=platform==='win32'?JSON.parse(await protect(raw.dpapi,true)):raw;}
 }catch(e){if(e.code!=='ENOENT')throw e;}
 if(record){
  if(record.cwd!==binding.cwd||record.port!==port)throw Error('Saved token belongs to a different workspace. Stop the companion and use --reset-token.');
  if(!/^[\w-]{43}$/.test(record.token)||!Number.isFinite(record.expiresAt))throw Error('Saved session is invalid. Use --reset-token.');
  if(record.expiresAt<=now)throw Error('Saved token expired. Use --reset-token to issue a new one.');
 }else{record={...binding,token:randomBytes(32).toString('base64url'),expiresAt:now+ttlMs};await save(record);}
 return {token:record.token,expiresAt:record.expiresAt,save};
}
