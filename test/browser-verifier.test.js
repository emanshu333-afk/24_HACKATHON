import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import * as node from '../src/crypto.js';
import * as browser from '../shared/browser-verifier.js';
const vectors=JSON.parse(readFileSync(new URL('../fixtures/proof-vectors.json',import.meta.url),'utf8'));
test('public signed fixtures verify identically using Node crypto and browser WebCrypto',async()=>{
  for(const [name,receipt,expected] of [['current',vectors.receipt,'VALID_CURRENT'],['historical',vectors.receipt,'VALID_HISTORICAL'],['corrected',vectors.correctedReceipt,'VALID_CURRENT'],['tampered',vectors.receipt,'INVALID']]){
    const evidence=vectors[name].evidence;
    const actual=node.verifyEvidence(evidence,vectors.publicKey,{receipt});
    assert.equal(actual.status,expected);assert.deepEqual(await browser.verifyEvidence(evidence,vectors.publicKey,{receipt}),actual);
  }
});
const mutations=[
  ['student identity',e=>{e.events[0].body.data.studentId='substituted';}],
  ['exam identity',e=>{e.events[0].body.data.examId='substituted';}],
  ['commitment',e=>{e.events[0].body.commitment='0'.repeat(64);}],
  ['link',e=>{e.events[1].body.previousHash='0'.repeat(64);}],
  ['removed event',e=>{e.events.shift();}],
  ['reordered events',e=>{e.events.reverse();}],
  ['replaced payload',e=>{e.events[0].body=e.events[1].body;}],
  ['event signature',e=>{e.events[0].signature='A'.repeat(86);}],
  ['checkpoint',e=>{e.checkpoint.body.sequence=1;}],
  ['approval signature',e=>{e.events[1].body.correction.approvals[0].signature='A'.repeat(86);}],
  ['approver certificate',e=>{e.events[1].body.correction.approvals[0].certificate.body.role='ADMIN';}],
  ['malformed event',e=>{e.events[0]=null;}]
];
for(const [label,mutate] of mutations)test(`WebCrypto rejects ${label} and agrees with offline verifier`,async()=>{
  const evidence=structuredClone(vectors.corrected.evidence);mutate(evidence);
  const options={receipt:vectors.receipt};const result=node.verifyEvidence(evidence,vectors.publicKey,options);
  assert.equal(result.status,'INVALID');assert.deepEqual(await browser.verifyEvidence(evidence,vectors.publicKey,options),result);
});
test('wrong pinned institution key is rejected by both verifiers',async()=>{
  const wrong=generateKeyPairSync('ed25519').publicKey.export({type:'spki',format:'pem'});
  const n=node.verifyEvidence(vectors.current.evidence,wrong,{receipt:vectors.receipt});
  assert.equal(n.status,'INVALID');assert.deepEqual(await browser.verifyEvidence(vectors.current.evidence,wrong,{receipt:vectors.receipt}),n);
});
test('Unicode normalization is absent; null differs from missing; ordering and safe integers are deterministic',async()=>{
  assert.notEqual(node.digest('result',{text:'é'}),node.digest('result',{text:'e\u0301'}));
  assert.notEqual(node.digest('result',{a:null}),node.digest('result',{}));
  assert.equal(node.digest('result',{b:2,a:1}),node.digest('result',{a:1,b:2}));
  for(const value of [-0,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1,undefined,new Array(1)])assert.throws(()=>node.canonical(value));
  for(const value of [null,{},[],{text:'e\u0301'},Number.MAX_SAFE_INTEGER,{score:0}])assert.equal(await browser.digest('result',value),node.digest('result',value));
  assert.notEqual(node.digest('result',{score:75}),node.digest('result',{score:99}));
});
test('same signing key with two distinct certified user IDs is insufficient',async()=>{
  const institution=generateKeyPairSync('ed25519'), approver=generateKeyPairSync('ed25519');
  const priv=institution.privateKey.export({type:'pkcs8',format:'pem'}),pub=institution.publicKey.export({type:'spki',format:'pem'}),apub=approver.publicKey.export({type:'spki',format:'pem'});
  const proposal={format:node.FORMAT,id:'synthetic',reason:'Distinct identities same key'};
  const approvals=['a','b'].map(userId=>({certificate:node.signed('approver-certificate',{format:node.FORMAT,role:'APPROVER',userId,keyId:node.keyId(apub),publicKey:apub},priv),signature:node.signValue('approval',{proposalDigest:node.digest('proposal',proposal)},approver.privateKey)}));
  assert.throws(()=>node.checkApprovals({proposal,approvals},pub),/DUPLICATE_APPROVER/);
  await assert.rejects(browser.checkApprovals({proposal,approvals},pub),/DUPLICATE_APPROVER/);
});
test('witness rollback, fork, forgery and freshness claims agree',async()=>{
  const {evidence,witness}=vectors.rollback;
  assert.equal(node.verifyEvidence(evidence,vectors.publicKey).status,'VALID_CURRENT');
  for(const w of [witness,{...witness,signature:'A'.repeat(86)}]){
    const result=node.verifyEvidence(evidence,vectors.publicKey,{witness:w});assert.equal(result.status,'INVALID');assert.equal(result.freshness,'UNWITNESSED');
    assert.deepEqual(await browser.verifyEvidence(evidence,vectors.publicKey,{witness:w}),result);
  }
  const valid=node.verifyEvidence(vectors.corrected.evidence,vectors.publicKey,{witness});assert.equal(valid.freshness,'AT_LEAST_WITNESSED_CHECKPOINT');
  assert.deepEqual(await browser.verifyEvidence(vectors.corrected.evidence,vectors.publicKey,{witness}),valid);
});
test('displayed mutable marks must match signed result, not just server status',()=>{
  const checked=node.verifyEvidence(vectors.current.evidence,vectors.publicKey,{receipt:vectors.receipt});
  assert.equal(browser.compareDisplayedResult(checked,checked.result).status,'VALID_CURRENT');
  assert.equal(browser.compareDisplayedResult(checked,{...checked.result,marks:[{subject:'CS101',score:99,max:100}]}).status,'INVALID');
});
test('missing evidence is unavailable, and unsupported WebCrypto fails closed',async()=>{
  assert.equal((await browser.verifyEvidence({},vectors.publicKey)).status,'INCOMPLETE');
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  try{Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true});assert.equal((await browser.verifyEvidence(vectors.current.evidence,vectors.publicKey)).status,'INCOMPLETE');}
  finally{Object.defineProperty(globalThis,'crypto',descriptor);}
});
