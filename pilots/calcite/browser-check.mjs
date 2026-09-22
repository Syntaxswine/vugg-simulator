import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {CdpClient,BrowserDriver} from '../../tools/browser-workflow.mjs';
import {findOwnedBrowserExecutable} from '../../tools/owned-browser-runtime.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const evidence=path.join(root,'.local-evidence','calcite-pilot');await fs.mkdir(evidence,{recursive:true});
const server=http.createServer(async(req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/,''),file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const data=await fs.readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(data);}
  catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const profile=await fs.mkdtemp(path.join(evidence,'browser-'));
const child=spawn(findOwnedBrowserExecutable(),['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--window-size=1440,1050','--enable-precise-memory-info','about:blank'],{windowsHide:true,stdio:'ignore'});
let client;
try{
  let port;
  const deadline=Date.now()+30000;
  while(Date.now()<deadline){
    try{port=Number((await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port)break;}catch{}
    if(child.exitCode!==null)throw Error(`Owned browser exited: ${child.exitCode}`);
    await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(port,'DevTools did not start');
  const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target=targets.find(t=>t.type==='page');assert.ok(target);
  client=new CdpClient(target.webSocketDebuggerUrl);await client.open();
  const driver=new BrowserDriver(client);
  await client.send('Page.enable');await client.send('Runtime.enable');
  await client.send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/pilots/calcite/index.html`});
  await driver.waitFor('!!window.calcitePilot','calcite pilot',20000);
  const verify=await driver.evaluate('window.calcitePilot.verify()');assert.ok(verify.rebuildIdentical);assert.ok(verify.recordUnchanged);
  const surfaceCheck=await driver.evaluate(`(() => {
    const p=window.calcitePilot, before=JSON.stringify(p.recording);
    document.getElementById('wire').click();document.getElementById('refine').click();
    const lamp=document.getElementById('light');lamp.value=2.7;lamp.dispatchEvent(new Event('input'));
    const unchanged=before===JSON.stringify(p.recording);
    document.getElementById('wire').click();document.getElementById('refine').click();
    return {unchanged,rebuild:p.verify()};
  })()`);assert.ok(surfaceCheck.unchanged);assert.ok(surfaceCheck.rebuild.rebuildIdentical);
  const screenshot=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await fs.writeFile(path.join(evidence,'pilot.png'),Buffer.from(screenshot.data,'base64'));
  const performance=await driver.evaluate('window.calcitePilot.benchmark()');
  const after=await driver.evaluate('window.calcitePilot.verify()');assert.ok(after.rebuildIdentical);
  const sourceHashes={};
  for(const name of ['specimen.js','render.js','viewer.js','index.html','recording.json','browser-check.mjs'])sourceHashes[name]=createHash('sha256').update((await fs.readFile(path.join(root,'pilots/calcite',name),'utf8')).replace(/\r\n/g,'\n')).digest('hex');
  const receipt={schema:'calcite-pilot-browser-check-v1',sourceHashes,browser:await client.send('Browser.getVersion'),verify,surfaceCheck,after,performance};
  await fs.writeFile(path.join(root,'pilots/calcite/browser-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt,null,2));
}finally{
  try{if(client)await client.send('Browser.close');}catch{}
  client?.close();
  await new Promise(r=>setTimeout(r,500));
  if(child.exitCode===null)child.kill();
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
