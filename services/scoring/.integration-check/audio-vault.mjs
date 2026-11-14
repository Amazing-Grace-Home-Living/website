import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
const TRACKS=[['badge','Badge'],['course-clear-fanfare','Course Clear Fanfare'],['ending','Ending'],['player-down','Player Down'],['storm','Storm'],['victory','Victory']];
export const AUDIO_TRACKS=TRACKS.map(([id,title])=>({id,title,format:'MP3'}));
export async function readVaultTrack(root,id){if(!AUDIO_TRACKS.some(track=>track.id===id))throw Error('Unknown archive track.');const file=resolve(root,'assets/audio',id+'.mp3'),info=await stat(file);if(!info.isFile()||info.size>30*1024*1024)throw Error('Archive track unavailable.');return readFile(file);}
