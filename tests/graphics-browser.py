"""Optional real-canvas regressions. Requires Python Playwright and Chromium.

Start the game first, then run PETTOWN_URL=http://127.0.0.1:5500 python3 tests/graphics-browser.py.
"""
import os
import shutil
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1100})
    errors, failures = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failures.append((response.status, response.url)) if response.status >= 400 and not response.url.endswith('favicon.ico') else None)
    page.goto(os.environ.get('PETTOWN_URL', 'http://127.0.0.1:5500'), wait_until='networkidle')
    page.locator('#loading').wait_for(state='hidden')
    result = page.evaluate(r"""async () => {
      const {Renderer}=await import('/src/renderer.js');
      const {loadAssets}=await import('/src/assets.js');
      const {FOREGROUND,OUTSKIRTS}=await import('/src/world.js');
      const {DEFAULT_SETTINGS}=await import('/src/config.js');
      const assert=(condition,message)=>{if(!condition)throw Error(message);};
      const images=await loadAssets();
      const canvas=document.createElement('canvas');
      const renderer=new Renderer(canvas,images,{...DEFAULT_SETTINGS,zoom:1});
      const read=(canvas,x,y)=>[...canvas.getContext('2d').getImageData(x,y,1,1).data];
      const alphaAt=(layer,scene,x,y)=>{
        const mask=renderer.foregroundImage(layer,scene);
        if(x<mask.x||x>=mask.x+mask.width||y<mask.y||y>=mask.y+mask.height)return 0;
        return read(mask.canvas,x-mask.x,y-mask.y)[3];
      };
      const townTree=FOREGROUND.find(layer=>layer.name==='Cây Đông Nam trái');
      assert(alphaAt(townTree,'city',1300,666)===0,'Town tree must not mask empty space');
      assert(alphaAt(townTree,'city',1315,750)>200,'Town canopy must retain its silhouette');
      const harborTree=OUTSKIRTS['out-harbor'].foreground.find(layer=>layer.name==='Cây cạnh tượng trái');
      assert(alphaAt(harborTree,'out-harbor',840,375)===0,'Harbor dirt path must stay transparent');
      assert(alphaAt(harborTree,'out-harbor',880,400)>200,'Harbor canopy remains opaque');
      for(const direction of ['north','south']){
        assert(images.frames[direction]===4,'Vertical walk needs four frames');
        const a=images['player_'+direction+'_0'].getContext('2d').getImageData(0,45,57,32).data;
        const b=images['player_'+direction+'_2'].getContext('2d').getImageData(0,45,57,32).data;
        let changes=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changes++;
        assert(changes>100,direction+' walking frames must change legs, not just duplicate idle');
        for(let frame=0;frame<4;frame++)assert(images.bounds['player_'+direction+'_'+frame].bottom===72,'Walk feet anchor must remain stable');
      }
      for(const name of ['elder','evolution','items','storage','ferryman','pet-shop'])assert(images['npc_'+name],'Missing independent NPC sprite '+name);
      const floor=document.createElement('canvas');floor.width=1536;floor.height=1024;
      const f=floor.getContext('2d');f.fillStyle='rgb(214,182,128)';f.fillRect(0,0,1536,1024);f.fillStyle='rgb(20,120,60)';f.fillRect(100,40,20,30);
      const avatar=document.createElement('canvas');avatar.width=20;avatar.height=40;
      const a=avatar.getContext('2d');a.fillStyle='rgb(50,80,240)';a.fillRect(0,0,20,40);
      const test=new Renderer(document.createElement('canvas'),{map:floor,player_south_0:avatar,bounds:{player_south_0:{centerX:10,bottom:40}}},{...DEFAULT_SETTINGS,playerScale:1,zoom:1});
      const layer={name:'Synthetic tree',contactY:100,foliage:true,polygon:[[80,30],[150,30],[150,80],[80,80]]};
      const actor={x:110,y:90,facing:'south',moving:false};
      test.ctx.drawImage(floor,0,0);test.drawActor('player',actor);test.drawForeground(layer,'city');
      assert(read(test.canvas,110,60)[2]===60,'Canopy should cover the actor behind it');
      test.drawOccludedHint({kind:'player',data:actor},[layer],'city');
      assert(read(test.canvas,110,60)[2]>100,'Head-only overlap must retain a visible actor hint');
      assert(read(test.canvas,110,80)[2]>230,'Empty foreground pixels must not erase the actor');
      return {masks:'PASS',verticalWalk:'PASS',npcSprites:6,headOnlyOcclusion:'PASS'};
    }""")
    for scene, x, y in [('city', 1320, 745), ('out-west', 890, 675), ('out-west-south', 840, 560), ('out-harbor', 880, 400), ('west-cottage', 470, 400), ('orange-shop', 400, 730), ('mine-tunnel', 480, 520), ('out-north', 480, 400), ('out-south', 480, 250), ('out-east', 300, 320)]:
        page.evaluate('([scene,x,y])=>window.__PetTownDebug.moveTo(scene,x,y)', [scene, x, y])
        page.wait_for_timeout(100)
        assert page.locator('#game').is_visible()
    assert not errors, errors
    assert not failures, failures
    print('PASS: real canvas masks, vertical walk poses, NPC sprites, head-only visibility, all 10 scenes; no browser or asset errors.', result)
    browser.close()
