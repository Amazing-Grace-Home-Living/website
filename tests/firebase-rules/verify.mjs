import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,collection,getDocs} from 'firebase/firestore';
import {ref,uploadBytes,getBytes} from 'firebase/storage';

const root=fileURLToPath(new URL('../../',import.meta.url));
const checks=[];
async function check(name,action) {
  try {await action();checks.push({name,ok:true});console.log('PASS',name);}
  catch(error){checks.push({name,ok:false});console.error('FAIL',name,String(error).slice(0,400));}
}
const env=await initializeTestEnvironment({
  projectId:'demo-amazing-grace-audit',
  firestore:{rules:readFileSync(join(root,'firestore.rules'),'utf8')},
  storage:{rules:readFileSync(join(root,'storage.rules'),'utf8')}
});
try {
  await env.clearFirestore();
  const alice=env.authenticatedContext('alice');
  const bob=env.authenticatedContext('bob');
  const anon=env.unauthenticatedContext();
  const aliceDb=alice.firestore(),bobDb=bob.firestore(),anonDb=anon.firestore();
  const user=doc(aliceDb,'users/alice');
  await check('Owner can create public-safe profile',()=>assertSucceeds(setDoc(user,{displayName:'Alice',updatedAt:new Date()})));
  await check('Anonymous cannot read a profile',()=>assertFails(getDoc(doc(anonDb,'users/alice'))));
  await check('Other user cannot read a private profile',()=>assertFails(getDoc(doc(bobDb,'users/alice'))));
  await check('Owner can read their own profile',()=>assertSucceeds(getDoc(user)));
  await check('Owner can update safe profile field',()=>assertSucceeds(setDoc(user,{bio:'My practice profile'},{merge:true})));
  await check('Owner cannot forge points',()=>assertFails(setDoc(user,{points:999999},{merge:true})));
  await check('Owner cannot assign their own admin role',()=>assertFails(setDoc(user,{admin:true},{merge:true})));
  await check('Owner cannot list all users',()=>assertFails(getDocs(collection(aliceDb,'users'))));
  await check('Client cannot fabricate donations',()=>assertFails(setDoc(doc(aliceDb,'donations/receipt1'),{uid:'alice',amount:9999})));
  await check('Client cannot write points transactions',()=>assertFails(setDoc(doc(aliceDb,'pointTransactions/forged'),{uid:'alice',amount:99999})));
  await env.withSecurityRulesDisabled(async ctx => {
    const db=ctx.firestore();
    await setDoc(doc(db,'donations/serverReceipt'),{uid:'alice',amount:10});
    await setDoc(doc(db,'pointTransactions/serverEntry'),{uid:'alice',amount:100});
  });
  await check('Owner can view own server-written donation',()=>assertSucceeds(getDoc(doc(aliceDb,'donations/serverReceipt'))));
  await check('Other user cannot see donation',()=>assertFails(getDoc(doc(bobDb,'donations/serverReceipt'))));
  await check('Owner cannot enumerate all donations',()=>assertFails(getDocs(collection(aliceDb,'donations'))));
  await check('Owner can view own points transaction',()=>assertSucceeds(getDoc(doc(aliceDb,'pointTransactions/serverEntry'))));
  await check('Other user cannot view points',()=>assertFails(getDoc(doc(bobDb,'pointTransactions/serverEntry'))));
  const aliceStorage=alice.storage(),bobStorage=bob.storage(),anonStorage=anon.storage();
  const myPath='users/alice/demo-check.txt';
  const otherPath='users/bob/demo-check.txt';
  const payload=new Blob(['fake training data'],{type:'text/plain'});
  await check('Owner can upload within their private storage prefix',()=>assertSucceeds(uploadBytes(ref(aliceStorage,myPath),payload)));
  await check('Cross-user cannot download private storage object',()=>assertFails(getBytes(ref(bobStorage,myPath))));
  await check('Anonymous cannot download private storage object',()=>assertFails(getBytes(ref(anonStorage,myPath))));
  await check('Cross-user cannot upload into another prefix',()=>assertFails(uploadBytes(ref(bobStorage,myPath),payload)));
  await check('Anonymous cannot upload files',()=>assertFails(uploadBytes(ref(anonStorage,otherPath),payload)));
  await check('Legacy public root path stays blocked',()=>assertFails(uploadBytes(ref(aliceStorage,'legacy/demo.txt'),payload)));
} finally {await env.cleanup();}
const failed=checks.filter(c=>!c.ok);
console.log('SUMMARY',checks.length-failed.length,'passed',failed.length,'failed');
if(failed.length)process.exitCode=1;
