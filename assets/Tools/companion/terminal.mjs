import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
export function createTerminal({cwd,enabled=false,platform=process.platform,spawnProcess=spawn,env=process.env,timeoutMs=300000}={}){
 let job=null,child=null,timer=null;
 function stop(){if(child){const p=child;if(platform==='win32'&&Number.isInteger(p.pid)){const killer=spawnProcess(join(env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(p.pid),'/T','/F'],{stdio:'ignore',windowsHide:true,shell:false});killer.on('error',()=>p.kill());}else p.kill('SIGTERM');}return {ok:true};}
 return {
  status(){return {enabled,available:platform==='win32',cwd,job:job?{...job}:null};},
  run(command){
   if(!enabled)throw Error('PowerShell terminal is disabled. Restart the companion with --terminal to enable it.');
   if(platform!=='win32')throw Error('This terminal requires a Windows host.');
   if(child)throw Error('A command is already running. Wait or stop it first.');
   if(typeof command!=='string'||!command.trim()||command.length>12000)throw Error('Enter a command of 1–12000 characters.');
   job={id:randomUUID(),command,output:'',running:true,exitCode:null,truncated:false};
   const script="$ProgressPreference='SilentlyContinue'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $ErrorActionPreference='Stop'; try { & {\n"+command+"\n}; if (-not $?) { exit 1 } } catch { Write-Output ($_ | Out-String); exit 1 }";
   const p=spawnProcess(join(env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{cwd,env,stdio:['ignore','pipe','pipe'],shell:false,windowsHide:true});child=p;
   const append=data=>{if(job.output.length>=100000){job.truncated=true;return;}job.output=(job.output+data.toString()).slice(0,100000);};
   p.stdout.on('data',append);p.stderr.on('data',append);
   p.on('error',()=>{append('PowerShell could not start. Check the Windows host.');job.running=false;child=null;clearTimeout(timer);});
   p.on('close',code=>{job.running=false;job.exitCode=code;child=null;clearTimeout(timer);});
   timer=setTimeout(()=>{append('\nCommand exceeded five minutes; stopping.');stop();},timeoutMs);timer.unref?.();
   return {id:job.id};
  },stop,close(){stop();clearTimeout(timer);}
 };
}
