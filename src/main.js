import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createDiamondArm } from './diamondArm.js';
import { createMerlionPark, isMerlionRoute } from './merlionPark.js';
import './style.css';
import screenUrl from '../assets/screen-background.png';
import guangzhouPosterUrl from '../assets/guangzhou-thank-you-poster.png';
const mediaBase=`${import.meta.env.BASE_URL}media/`;
const mediaReady=navigator.serviceWorker.register(`${import.meta.env.BASE_URL}media-sw.js`,{scope:import.meta.env.BASE_URL})
  .then(async()=>{
    await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
  });

const app = document.querySelector('#app');
app.innerHTML = `<div id="hud"><h1>虚拟演唱会场馆 · 机关样板</h1><p>W 前进 · S 后退 · A 向左 · D 向右 · 鼠标转视角 · Shift 加速 · V 切换视角</p><p>1 出生点 · 2 舞台大屏幕前 · 3 俯视舞台 · 4 全场布局 · 5 场馆地下一层 · 6 场馆外观 · 7 鱼尾狮公园 · R 回出生点。按 Esc 释放鼠标可调控制面板。</p><p id="status">选择出生位置后进入游览</p></div><details id="controls"><summary>灯光与转台控制</summary><div class="control-body"><strong>舞台黄色边缘灯</strong><label><span>开启</span><input id="stageOn" type="checkbox" checked></label><label><span>亮度</span><input id="stagePower" type="range" min="0" max="2" step="0.05" value="1"></label><label><span>颜色</span><input id="stageColor" type="color" value="#ffb967"></label><label><span>效果</span><select id="stageMode"><option value="steady">常亮</option><option value="pulse">呼吸</option><option value="chase">流动</option></select></label><strong>观众荧光棒</strong><label><span>开启</span><input id="sticksOn" type="checkbox" checked></label><label><span>亮度</span><input id="sticksPower" type="range" min="0" max="2" step="0.05" value="1"></label><label><span>颜色</span><input id="sticksColor" type="color" value="#a8c9ff"></label><label><span>效果</span><select id="sticksMode"><option value="steady">常亮</option><option value="pulse">呼吸</option><option value="wave">波浪</option></select></label><strong>钢琴转盘</strong><label><span>速度</span><input id="turnSpeed" type="range" min="0.25" max="3" step="0.25" value="1"></label><div class="buttons"><button id="rotateBtn">开始旋转</button><button id="descendBtn">停转并下降</button><button id="resetBtn">升起复位</button></div><p id="mechanismStatus">转台静止，台面平齐</p><strong>钢琴井圆形围挡</strong><div class="buttons"><button id="shaftOpenBtn">打开围挡</button><button id="shaftCloseBtn">关闭围挡</button></div><p id="shaftStatus">围挡闭合</p><strong>狮子出场升降台</strong><div class="buttons"><button id="lionDownBtn">退场并复位屏幕</button><button id="lionUpBtn">开始出场</button></div><p id="lionLiftStatus">屏幕完整显示，升降台在工作区待命</p></div></details><div id="spawn-picker"><label for="spawn-select">出生位置</label><select id="spawn-select"><option value="left">左侧通道上方最高看台</option><option value="right">右侧通道上方最高看台</option><option value="rear">舞台正对面最高看台</option></select><button id="start">进入游览</button></div>`;
document.querySelector('#mechanismStatus').insertAdjacentHTML('afterend', '<strong>箭头舞台小升降台</strong><div class="buttons"><button id="singerDownBtn">下降至工作区</button><button id="singerUpBtn">升起复位</button></div><p id="singerLiftStatus">小升降台与舞台齐平</p>');
document.querySelector('#singerLiftStatus').insertAdjacentHTML('afterend', '<strong>主舞台长方形升降台</strong><div class="buttons"><button id="stageRectDownBtn">下降至工作区</button><button id="stageRectUpBtn">升起复位</button></div><p id="stageRectStatus">长方形升降台与舞台齐平</p>');
document.querySelector('#stageRectStatus').insertAdjacentHTML('afterend', '<strong>钻石臂机构（钻石待建）</strong><div class="buttons diamond-controls"><button id="diamondArmDoorBtn">① 向上翻平前端门</button><button id="diamondArmConnectorBtn">② 从门下伸出连接头</button><button id="diamondArmInstallBtn">③ 确认人工安装</button><button id="diamondArmHighBtn">④ 整体抬至最高点</button><button id="diamondArmForwardBtn">⑤ 沿轨道前进</button><button id="diamondArmInBtn">收回并复位</button></div><p id="diamondArmStatus">三层阶梯通向低平台；中间机械臂收纳，前端门向下盖合</p>');
document.querySelector('#sticksMode').closest('label').insertAdjacentHTML('afterend','<div class="buttons"><button id="hideAudienceBtn">隐藏观众</button><button id="showAudienceBtn">显示观众</button></div>');
document.querySelector('#stageMode').closest('label').insertAdjacentHTML('beforebegin','<strong>全场亮度</strong><label><span>亮度</span><input id="venueBrightness" type="range" min="0.15" max="2" step="0.05" value="0.15"></label><strong>大屏幕</strong><label><span>画面</span><select id="screenContent"><option value="poster">广州感谢海报</option><option value="original">多远都要在一起</option><option value="part1" selected>part1</option><option value="part2">part2</option></select></label><div class="buttons"><button id="screenPlay">播放并开启声音</button><button id="screenPause">暂停</button></div><label><span>音量</span><input id="screenVolume" type="range" min="0" max="1" step="0.01" value="0.8"></label><label><span>进度</span><input id="screenProgress" type="range" min="0" max="1000" step="1" value="0"></label><div id="screenTime">00:00 / 00:00</div>');
app.insertAdjacentHTML('beforeend','<button id="uiToggle" type="button" aria-pressed="false">隐藏界面 · H</button>');
const uiToggle=document.querySelector('#uiToggle');
const toggleUi=()=>{const hidden=app.classList.toggle('ui-hidden');uiToggle.textContent=hidden?'显示界面 · H':'隐藏界面 · H';uiToggle.setAttribute('aria-pressed',String(hidden));};
uiToggle.addEventListener('click',toggleUi);
document.addEventListener('keydown',event=>{if(event.code==='KeyH'&&!event.repeat&&!(event.target instanceof HTMLInputElement)&&!(event.target instanceof HTMLSelectElement))toggleUi();});
const status = document.querySelector('#status');
app.querySelector('#hud p:nth-of-type(2)').textContent='1 出生点 · 2 舞台大屏幕前 · 3 俯视舞台 · 4 全场布局 · 5 场馆地下一层 · 6 场馆外观 · 7 鱼尾狮公园 · R 回出生点。按 Esc 释放鼠标可调控制面板。';
const start = document.querySelector('#start');
const spawnPicker = document.querySelector('#spawn-picker');
const spawnSelect = document.querySelector('#spawn-select');
spawnSelect.insertAdjacentHTML('beforeend','<option value="field">舞台大屏幕前</option><option value="merlion">鱼尾狮公园观景点</option>');
spawnSelect.value='rear';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.0019);
const camera = new THREE.PerspectiveCamera(67, innerWidth / innerHeight, 0.3, 900);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35*0.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0x8b9dcc, 0x171423, 2.2));
const moon = new THREE.DirectionalLight(0xcad8ff, 1.5);
moon.position.set(-30, 70, 25);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -85; moon.shadow.camera.right = 85;
moon.shadow.camera.top = 85; moon.shadow.camera.bottom = -85;
scene.add(moon);

const mat = (color, roughness = 0.8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const black = mat(0x090b0e, 0.86);
const floorMat = mat(0x13272b, 0.98);
const seatMats = [0x164575, 0x1b5e8e, 0x126c72, 0x293c7a, 0x694486].map(c => mat(c));
const humanMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.88});
const humanBaseScale=3,humanHeightScale=humanBaseScale*2,humanWidthScale=humanBaseScale*1.5,humanDepthScale=humanBaseScale*1.5;
const makeHumanGeometry=(clothes,seated)=>{
  const parts=[];
  const add=(geometry,color,x,y,z)=>{
    geometry.translate(x,y,z);
    const c=new THREE.Color(color),colors=new Float32Array(geometry.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(geometry);
  };
  const boxPart=(w,h,d,color,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),color,x,y,z);
  const head=(x,y,z)=>add(new THREE.SphereGeometry(0.18,8,6),0xb98e82,x,y,z);
  const hair=(x,y,z)=>{const geo=new THREE.SphereGeometry(0.19,8,6);geo.scale(1,0.46,1);add(geo,0x191a22,x,y,z);};
  if(seated){
    boxPart(0.42,0.7,0.25,clothes,0,0.55,-0.07);
    boxPart(0.4,0.18,0.32,clothes,0,0.09,0);
    for(const side of [-1,1]){
      boxPart(0.13,0.5,0.17,clothes,side*0.3,0.57,0);
      boxPart(0.17,0.17,0.48,clothes,side*0.13,0.08,0.25);
      boxPart(0.16,0.19,0.16,clothes,side*0.13,-0.025,0.43);
      boxPart(0.2,0.05,0.2,0x202127,side*0.13,-0.115,0.43);
    }
    head(0,1.06,-0.08);hair(0,1.17,-0.08);
    for(const side of [-1,1])boxPart(0.035,0.035,0.02,0x18191f,side*0.06,1.07,0.092);
  }else{
    boxPart(0.45,0.73,0.27,clothes,0,1.02,0);
    for(const side of [-1,1]){
      boxPart(0.17,0.78,0.2,clothes,side*0.13,0.48,0);
      boxPart(0.13,0.65,0.17,clothes,side*0.32,1.02,0);
      boxPart(0.22,0.14,0.29,0x202127,side*0.13,0.07,0.04);
    }
    head(0,1.37,0);hair(0,1.47,0);
    for(const side of [-1,1])boxPart(0.035,0.035,0.02,0x18191f,side*0.06,1.38,0.17);
  }
  const geometry=mergeGeometries(parts);
  geometry.computeBoundingSphere();return geometry;
};
const box = (w, h, d, material, x, y, z, parent = scene) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.receiveShadow = true; parent.add(m); return m;
};
const cyl = (r1, r2, h, material, x, y, z, parent = scene, sides = 12) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, sides), material);
  m.position.set(x, y, z); parent.add(m); return m;
};
const line = (points, color, radius = 0.045, parent = scene) => {
  for (let i = 1; i < points.length; i++) {
    const a = new THREE.Vector3(...points[i - 1]), b = new THREE.Vector3(...points[i]);
    const diff = b.clone().sub(a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, diff.length(), 6), new THREE.MeshBasicMaterial({ color }));
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.normalize());
    parent.add(mesh);
  }
};

// A general oval stadium, scaled from the supplied photos rather than a surveyed venue plan.
const areaLinearScale=Math.sqrt(1.3);
const stageAnchorHalfWidth=34*1.4*areaLinearScale;
const narrowX=x=>stageAnchorHalfWidth+(x-stageAnchorHalfWidth)*0.5;
const fieldHalfWidth=narrowX(94),fieldAspect=130/fieldHalfWidth;
const grass = new THREE.Mesh(new THREE.PlaneGeometry(360, 640), floorMat);
grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
const trackMat = mat(0x6d3836, 1);
for (let i = 0; i < 5; i++) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(narrowX(94+i*1.65),narrowX(94.7+i*1.65),160),trackMat);
  ring.rotation.x = -Math.PI / 2;
  ring.scale.set(1.0,fieldAspect,1);
  ring.position.y = 0.014;
  scene.add(ring);
}
const innerMat = mat(0x1c2d31);
const inner = new THREE.Mesh(new THREE.CircleGeometry(fieldHalfWidth,160), innerMat);
inner.rotation.x = -Math.PI / 2; inner.scale.set(1.0,fieldAspect,1); inner.position.y = 0.02; scene.add(inner);
const blueApron=new THREE.Mesh(new THREE.RingGeometry(narrowX(101.6),narrowX(105.5),192),mat(0x08758f,0.95));
blueApron.rotation.x=-Math.PI/2;blueApron.scale.set(1.0,fieldAspect,1);blueApron.position.y=0.018;scene.add(blueApron);

// Stage dimensions and the floor-seat shift also position the adjacent passages.
const stageScale=1.4*areaLinearScale;
const stageH=2.376*stageScale;
const serviceFloor=-4.2;
const stageHalfWidth=34*stageScale;
const stageRearZ=-59.25,baseStageDepth=9.5*stageScale,stageDepth=baseStageDepth*1.2,stageFrontZ=stageRearZ+stageDepth;
const arrowResize=1.3;
// Preserve the existing connector length before enlarging the stage footprint.
const targetRunwayLength=11.07*areaLinearScale;
const floorRowPitch=2.5*areaLinearScale;
const floorAudienceStarts=[-29.5];
floorAudienceStarts.push(floorAudienceStarts[0]+8*floorRowPitch+4*areaLinearScale);
floorAudienceStarts.push(floorAudienceStarts[1]+12*floorRowPitch+4*areaLinearScale);
floorAudienceStarts.push(floorAudienceStarts[2]+8*floorRowPitch+4*areaLinearScale);
const floorAudienceRearZ=floorAudienceStarts[3]+12*floorRowPitch;
const standTiers=[
  {inner:[narrowX(115),140],outer:[narrowX(135),160],height:[0.3,11],seat:[narrowX(116),141,0.7],step:[1.125,2.25,1.23],rows:9,perRow:170},
  {inner:[narrowX(138),163],outer:[narrowX(174),199],height:[13.5,28],seat:[narrowX(139),164,14],step:[1.55,3.1,1.25],rows:12,perRow:210},
  {inner:[narrowX(178),203],outer:[narrowX(232.2),258.7],height:[31,66.08],seat:[narrowX(179),204,31.6],step:[1.725,3.45,2.23],rows:16,perRow:250}
];
// The screen-side pair stays near the main stage; the other pair meets the field midpoint.
const floorAudienceMidZ=(floorAudienceStarts[0]+floorAudienceRearZ)/2;
const screenPortalAngle=Math.asin((stageRearZ-20)/standTiers[0].inner[1]);
const midFieldPortalAngle=Math.asin(floorAudienceMidZ/standTiers[0].inner[1]);
const portalAngles=[-Math.PI-screenPortalAngle,screenPortalAngle,Math.PI-midFieldPortalAngle,midFieldPortalAngle];
const portalHalfAngle=0.052*1.5,portalHeight=13.0;
const angleDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const inStandPortal=(angle)=>portalAngles.some(a=>angleDistance(angle,a)<portalHalfAngle);
const inPortalSeatClearance=(angle)=>portalAngles.some(a=>angleDistance(angle,a)<portalHalfAngle+0.035);
// Continuous concrete seating bowl; the far end remains built even when concert seating is empty.
const ovalBand=(ai,bi,ao,bo,yi,yo,material,skipRearUpper=false,skipSidePortals=false)=>{
  const verts=[],indices=[],segments=384;
  for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
    verts.push(ai*c,yi,bi*s,ao*c,yo,bo*s);
  }
  for(let i=0;i<segments;i++){
    const mid=(i+0.5)/segments*Math.PI*2;
    const behindScreen=(bi+bo)*0.5*Math.sin(mid)<-95&&Math.abs((ai+ao)*0.5*Math.cos(mid))<46;
    const sidePortal=skipSidePortals&&inStandPortal(mid);
    if(!skipRearUpper||!behindScreen){
      if(!sidePortal){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
      else if(yi<portalHeight&&yo>portalHeight){
        // Keep the upper seating slope over the taller passageway.
        const t=(portalHeight-yi)/(yo-yi),a0=i/segments*Math.PI*2,a1=(i+1)/segments*Math.PI*2;
        const k=verts.length/3;
        verts.push((ai+(ao-ai)*t)*Math.cos(a0),portalHeight,(bi+(bo-bi)*t)*Math.sin(a0),ao*Math.cos(a0),yo,bo*Math.sin(a0));
        verts.push((ai+(ao-ai)*t)*Math.cos(a1),portalHeight,(bi+(bo-bi)*t)*Math.sin(a1),ao*Math.cos(a1),yo,bo*Math.sin(a1));
        indices.push(k,k+1,k+2,k+1,k+3,k+2);
      }
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;scene.add(mesh);return mesh;
};
for(let tier=0;tier<standTiers.length;tier++){
  const t=standTiers[tier];
  ovalBand(...t.inner,...t.outer,...t.height,mat([0x5d6473,0x666d7b,0x656c7a][tier]),tier>0,tier===0);
  const next=standTiers[tier+1];
  if(next){
    ovalBand(...t.outer,...next.inner,t.height[1],t.height[1]+0.08,mat(0x929aa7),tier>0,tier===0);
    ovalBand(...next.inner,next.inner[0]+0.18,next.inner[1]+0.18,t.height[1]+0.08,next.height[0],mat(0x48505e),tier>0);
  }else ovalBand(...t.outer,t.outer[0]+3,t.outer[1]+3,t.height[1],t.height[1]+0.35,mat(0x8c939f),true);
}

const seatGeo = new THREE.BoxGeometry(0.72, 0.45, 0.62);
const seats = seatMats.map(m => new THREE.InstancedMesh(seatGeo, m, 5600));
const counts = [0, 0, 0, 0, 0];
const dummy = new THREE.Object3D();
const standFans = new THREE.InstancedMesh(makeHumanGeometry(0x333646,true),humanMat,10000);
const standSticks=[];
let standFanCount=0;
for (let tier = 0; tier < 3; tier++) {
  const spec=standTiers[tier],rows=spec.rows;
  for (let row = 0; row < rows; row++) {
    const a=spec.seat[0]+row*spec.step[0],b=spec.seat[1]+row*spec.step[1];
    const n=spec.perRow;
    for (let k = 0; k < n; k++) {
      const angle = k / n * Math.PI * 2;
      const aislePhase = angle % (Math.PI / 8);
      const rearFlank= tier>0&&(angleDistance(angle,11*Math.PI/8)<0.06||angleDistance(angle,13*Math.PI/8)<0.06);
      if ((aislePhase < 0.024 || aislePhase > Math.PI / 8 - 0.024)&&!rearFlank) continue;
      const x = a * Math.cos(angle), z = b * Math.sin(angle);
      if(tier>0&&z<-85&&Math.abs(x)<-z*0.37)continue; // The marked rear fan excludes the low rows below its lower edge.
      const y=spec.seat[2]+row*spec.step[2];
      if(tier===0&&inPortalSeatClearance(angle))continue;
      const sector = Math.floor(angle / (Math.PI / 6));
      const idx = [0,1,2,3,4,3,2,1,0,1,3,4][sector];
      const mesh = seats[idx]; if (counts[idx] >= mesh.count) continue;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, -angle - Math.PI / 2, 0);
       dummy.scale.setScalar(3);
      dummy.updateMatrix(); mesh.setMatrixAt(counts[idx]++, dummy.matrix);
      // Seats behind the side drapes or with a blocked stage view stay empty.
      const goodView=z>-26;
      if(goodView&&standFanCount<standFans.count&&Math.random()<0.56){
         dummy.position.set(x,y+0.675+0.115*(humanHeightScale-humanBaseScale),z);
         dummy.scale.set(humanWidthScale,humanHeightScale,humanDepthScale);dummy.updateMatrix();
        standFans.setMatrixAt(standFanCount++,dummy.matrix);
         if(Math.random()<0.42)standSticks.push(x,y+8.4,z);
      }
    }
  }
}
seats.forEach((m, i) => { m.count = counts[i]; m.instanceMatrix.needsUpdate = true; scene.add(m); });
standFans.count=standFanCount;standFans.instanceMatrix.needsUpdate=true;scene.add(standFans);

// Four ground-level passages open below the first concourse.
for(const angle of portalAngles){
  const corners=[];
  for(const offset of [-portalHalfAngle,portalHalfAngle])for(const [rx,rz] of [[narrowX(113),138],standTiers[1].inner]){
    const a=angle+offset;corners.push([rx*Math.cos(a),rz*Math.sin(a)]);
  }
  const makeQuad=(points,material)=>{
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    geo.setIndex([0,1,2,1,3,2]);geo.computeVertexNormals();
    scene.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:material,roughness:0.9,side:THREE.DoubleSide})));
  };
  makeQuad([[corners[0][0],0.055,corners[0][1]],[corners[1][0],0.055,corners[1][1]],[corners[2][0],0.055,corners[2][1]],[corners[3][0],0.055,corners[3][1]]],0x41444b);
  for(const side of [0,2]){
    const a=corners[side],b=corners[side+1];
    makeQuad([[a[0],0.06,a[1]],[b[0],0.06,b[1]],[a[0],portalHeight,a[1]],[b[0],portalHeight,b[1]]],0x9c263b);
  }
  makeQuad([[corners[0][0],portalHeight,corners[0][1]],[corners[1][0],portalHeight,corners[1][1]],[corners[2][0],portalHeight,corners[2][1]],[corners[3][0],portalHeight,corners[3][1]]],0x555b65);
}

// Aisle strips follow each slope and leave a visible break at both concourses.
const aisleMat = mat(0x838b9b, 0.8);
for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
  if (Math.sin(a) > 0.85 && Math.abs(Math.cos(a)) < 0.11) continue;
  for(const t of standTiers)line([
    [t.inner[0]*Math.cos(a),t.height[0]+0.12,t.inner[1]*Math.sin(a)],
    [t.outer[0]*Math.cos(a),t.height[1]+0.12,t.outer[1]*Math.sin(a)]
  ],0x8d91a0,0.12);
}
// The two opposing, wave-edged roof leaves are the venue's defining silhouette.
const roofTop=new THREE.MeshStandardMaterial({color:0xb8bec5,roughness:0.48,metalness:0.24,side:THREE.DoubleSide});
const roofEdge=0xd6dce0;
const roofHalfArc=1.52;
const roofPoint=(side,t,r)=>{
  const angle=side===1?t:Math.PI-t;
  const wave=2.2*Math.sin((t+roofHalfArc)/(2*roofHalfArc)*Math.PI)+1.1*Math.sin(2.3*t+0.2);
  const x=(narrowX(151)+(narrowX(241)-narrowX(151))*r)*Math.cos(angle);
  const z=(171+(279-171)*r)*Math.sin(angle);
  return [x,82+wave+2*r,z];
};
for(const side of [-1,1]){
  const vertices=[],indices=[],N=72,M=12;
  for(let i=0;i<=N;i++)for(let j=0;j<=M;j++)vertices.push(...roofPoint(side,-roofHalfArc+i/N*2*roofHalfArc,j/M));
  for(let i=0;i<N;i++)for(let j=0;j<M;j++){
    const a=i*(M+1)+j,b=a+M+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  const shell=new THREE.Mesh(geo,roofTop);shell.receiveShadow=true;scene.add(shell);
  for(const radius of [0,1]){
    const edge=[];for(let i=0;i<=N;i++)edge.push(roofPoint(side,-roofHalfArc+i/N*2*roofHalfArc,radius));
    line(edge,roofEdge,0.2);
  }
  for(let i=0;i<=N;i+=6){
    const t=-roofHalfArc+i/N*2*roofHalfArc,rib=[];
    for(let j=0;j<=M;j+=3){const p=roofPoint(side,t,j/M);rib.push([p[0],p[1]-0.12,p[2]]);}
    line(rib,0x919aa4,0.07);
  }
  for(const t of [-1.08,-0.55,0.05,0.62,1.14]){
    const p=roofPoint(side,t,0.77);
    line([[p[0],66.0,p[2]],[p[0],p[1]-0.3,p[2]]],0x9ca8b0,0.34);
  }
  const facadeVerts=[],facadeIndices=[];
  for(let i=0;i<=N;i++){
    const t=-roofHalfArc+i/N*2*roofHalfArc,a=side===1?t:Math.PI-t;
    const x=narrowX(236)*Math.cos(a),z=263*Math.sin(a);
    facadeVerts.push(x,8.0,z,x,66.5,z);
    if(i<N){const j=i*2;facadeIndices.push(j,j+1,j+2,j+1,j+3,j+2);}
    if(i%8===0)line([[x,8.0,z],[x,66.5,z]],0x8797a2,0.11);
  }
  const facadeGeo=new THREE.BufferGeometry();facadeGeo.setAttribute('position',new THREE.Float32BufferAttribute(facadeVerts,3));facadeGeo.setIndex(facadeIndices);facadeGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(facadeGeo,new THREE.MeshStandardMaterial({color:0x376072,roughness:0.32,metalness:0.35,transparent:true,opacity:0.42,side:THREE.DoubleSide})));
}

createMerlionPark(scene);

// The standing avatar uses the same doubled height as the spectators.
// Keep the main stage and LED layout fixed; resize the arrow and piano around the larger figures.
// The screen-front lift occupies the marked central rectangle in the main stage.
const stageRectW=8.8*stageScale,stageRectD=5*stageScale,stageRectZ=-54.75;
const stageRectRearZ=stageRectZ-stageRectD/2,stageRectFrontZ=stageRectZ+stageRectD/2;
const stageRectFloorHole=()=>{
  const hole=new THREE.Path();
  hole.moveTo(-stageRectW/2,-stageRectFrontZ);
  hole.lineTo(-stageRectW/2,-stageRectRearZ);
  hole.lineTo(stageRectW/2,-stageRectRearZ);
  hole.lineTo(stageRectW/2,-stageRectFrontZ);
  hole.closePath();return hole;
};
// Cut the same opening through both field layers beneath the main stage.
const grassShape=new THREE.Shape();
grassShape.moveTo(-180,-320);grassShape.lineTo(180,-320);grassShape.lineTo(180,320);grassShape.lineTo(-180,320);grassShape.closePath();
grassShape.holes.push(stageRectFloorHole());grass.geometry.dispose();grass.geometry=new THREE.ShapeGeometry(grassShape);
const innerShape=new THREE.Shape();innerShape.absellipse(0,0,fieldHalfWidth,130,0,Math.PI*2,false);
innerShape.holes.push(stageRectFloorHole());inner.geometry.dispose();inner.geometry=new THREE.ShapeGeometry(innerShape);inner.scale.set(1,1,1);
const stageSideW=stageHalfWidth-stageRectW/2;
for(const side of [-1,1])box(stageSideW,stageH,stageDepth,black,side*(stageRectW/2+stageSideW/2),stageH/2,(stageRearZ+stageFrontZ)/2);
box(stageRectW,stageH,stageRectRearZ-stageRearZ,black,0,stageH/2,(stageRearZ+stageRectRearZ)/2);
box(stageRectW,stageH,stageFrontZ-stageRectFrontZ,black,0,stageH/2,(stageRectFrontZ+stageFrontZ)/2);
const stageRectLift=new THREE.Group();stageRectLift.position.set(0,stageH,stageRectZ);scene.add(stageRectLift);
box(stageRectW,0.16,stageRectD,black,0,-0.08,0,stageRectLift);
const stageRectFlushCap=new THREE.Mesh(new THREE.PlaneGeometry(stageHalfWidth*2,stageDepth),black);
stageRectFlushCap.rotation.x=-Math.PI/2;stageRectFlushCap.position.set(0,stageH+0.006,(stageRearZ+stageFrontZ)/2);
stageRectFlushCap.receiveShadow=true;scene.add(stageRectFlushCap);
const stageRectBottom=serviceFloor+0.03;
const onStageRectLift=(x,z)=>Math.abs(x)<stageRectW/2&&z>stageRectRearZ&&z<stageRectFrontZ;
// Black side drapes span from the rectangular stage to the inner seating bowl.
const curtainMat=new THREE.MeshStandardMaterial({color:0x030304,roughness:1,side:THREE.DoubleSide});
const drapeZ=stageFrontZ+0.4;
const drapeOuterX=standTiers[0].inner[0]*Math.sqrt(1-Math.pow(drapeZ/standTiers[0].inner[1],2))+0.6;
const drapeWidth=drapeOuterX-stageHalfWidth;
const drapeHeight=(stageH+1.5)*2;
for(const side of [-1,1]){
  const drape=box(drapeWidth,drapeHeight,0.35,curtainMat,side*(stageHalfWidth+drapeWidth/2),drapeHeight/2,drapeZ);
  drape.castShadow=true;
  for(let offset=0.7;offset<drapeWidth;offset+=1.05){
    const x=side*(stageHalfWidth+offset);
    line([[x,0,drapeZ+0.19],[x,drapeHeight,drapeZ+0.19]],0x0a0a0b,0.025);
  }
}
const arrowShift=stageFrontZ-0.35+targetRunwayLength+39.5+4*1.8*arrowResize;
const liftX=0,liftZ=-39.5+arrowShift,liftR=6.8*arrowResize*areaLinearScale;
const arrowPts=[[-3.7,-43.5],[3.7,-43.5],[3.7,-42],[4.5,-42],[8.5,-39.5],[0,-34.5],[-8.5,-39.5],[-4.5,-42],[-3.7,-42]].map(([x,z])=>[x*stageScale*arrowResize,liftZ+(z+arrowShift-liftZ)*1.8*arrowResize]);
const runwayRearZ=stageFrontZ-0.35,runwayFrontZ=arrowPts[0][1];
const runwayHalfWidth=3.7*stageScale*arrowResize;
const runway = box(runwayHalfWidth*2, stageH, runwayFrontZ-runwayRearZ, black, 0, stageH / 2, (runwayRearZ+runwayFrontZ)/2);
const liftTravel=stageH-serviceFloor;
const pianoFloorHole=()=>{const hole=new THREE.Path();hole.absarc(liftX,-liftZ,liftR+0.2,0,Math.PI*2,true);return hole;};
grassShape.holes.push(pianoFloorHole());grass.geometry.dispose();grass.geometry=new THREE.ShapeGeometry(grassShape);
innerShape.holes.push(pianoFloorHole());inner.geometry.dispose();inner.geometry=new THREE.ShapeGeometry(innerShape);
const shape = new THREE.Shape();
shape.moveTo(arrowPts[0][0], arrowPts[0][1]);
for (let i = 1; i < arrowPts.length; i++) shape.lineTo(...arrowPts[i]);
shape.closePath();
const liftHole = new THREE.Path();
liftHole.absarc(liftX,liftZ,liftR+0.045,0,Math.PI*2,true);
shape.holes.push(liftHole);
const arrow = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: stageH, bevelEnabled: false }), black);
arrow.rotation.x = Math.PI / 2; arrow.position.y = stageH;
arrow.castShadow = true; arrow.receiveShadow = true; scene.add(arrow);
const diamondArm=createDiamondArm({scene,box,cyl,mat,stageH,arrowTipZ:arrowPts[5][1],getPlayerPos:()=>pos,showNotice:message=>showNotice(message)});
// Straight, mirrored crowd barriers follow the marked stage and arrow outline.
const crowdFenceMat=mat(0xe9edf0,0.55);
const addCrowdFence=(points)=>{
  for(let i=0;i<points.length-1;i++){
    const [x1,z1]=points[i],[x2,z2]=points[i+1];
    const dx=x2-x1,dz=z2-z1,length=Math.hypot(dx,dz);
    const angle=-Math.atan2(dz,dx);
    for(const height of [3.0,6.0]){
      const rail=box(length,0.13,0.13,crowdFenceMat,(x1+x2)/2,height,(z1+z2)/2);
      rail.rotation.y=angle;
    }
    const posts=Math.ceil(length/2.2);
    for(let j=0;j<=posts;j++){
      const t=j/posts;
      box(0.14,6.16,0.14,crowdFenceMat,x1+dx*t,3.08,z1+dz*t);
    }
  }
};
const frontFenceX=12.8*stageScale,centerFenceX=4.5*stageScale;
const frontFenceZ=stageFrontZ+5.0;
const angledFenceStartZ=liftZ+0.6,angledFenceEndZ=arrowPts[5][1]+0.55;
const fenceInnerXAtZ=z=>THREE.MathUtils.lerp(frontFenceX,centerFenceX,THREE.MathUtils.clamp((z-angledFenceStartZ)/(angledFenceEndZ-angledFenceStartZ),0,1));
for(const side of [-1,1])addCrowdFence([
  [side*stageHalfWidth,stageFrontZ+0.4],
  [side*stageHalfWidth,frontFenceZ],
  [side*frontFenceX,frontFenceZ],
  [side*frontFenceX,angledFenceStartZ],
  [side*centerFenceX,angledFenceEndZ],
  [side*centerFenceX,floorAudienceRearZ+0.7]
]);
// Each cross aisle starts where it meets the angled or straight inner fence.
for(const side of [-1,1])for(const z of [0,1,2].map(i=>floorAudienceStarts[i]+(i%2===0?8:12)*floorRowPitch+2)){
  addCrowdFence([[side*fenceInnerXAtZ(z),z],[side*46*areaLinearScale,z]]);
}
// A side entrance at the main stage keeps the compact arrow silhouette intact.
const rampGeo = new THREE.BufferGeometry();
const rampRearZ=stageFrontZ-3.25,rampFrontZ=stageFrontZ-1.25;
const rv = new Float32Array([stageHalfWidth,stageH,rampRearZ, stageHalfWidth+5,0,rampRearZ, stageHalfWidth,stageH,rampFrontZ, stageHalfWidth+5,0,rampRearZ, stageHalfWidth+5,0,rampFrontZ, stageHalfWidth,stageH,rampFrontZ]);
rampGeo.setAttribute('position', new THREE.BufferAttribute(rv, 3)); rampGeo.computeVertexNormals();
const ramp = new THREE.Mesh(rampGeo, new THREE.MeshStandardMaterial({ color:0x111318, side:THREE.DoubleSide }));
scene.add(ramp);

const posterTexture=new THREE.TextureLoader().load(guangzhouPosterUrl);
const originalScreenTexture=new THREE.TextureLoader().load(screenUrl);
const part1Video=document.createElement('video');
part1Video.preload='metadata';
part1Video.playsInline=true;
part1Video.muted=true;
part1Video.volume=0.8;
const part1Texture=new THREE.VideoTexture(part1Video);
part1Texture.colorSpace=THREE.SRGBColorSpace;
part1Texture.minFilter=THREE.LinearFilter;
part1Texture.magFilter=THREE.LinearFilter;
part1Texture.generateMipmaps=false;
const part2Video=document.createElement('video');
part2Video.preload='metadata';
part2Video.playsInline=true;
part2Video.muted=true;
part2Video.volume=0.8;
const part2Texture=new THREE.VideoTexture(part2Video);
part2Texture.colorSpace=THREE.SRGBColorSpace;
part2Texture.minFilter=THREE.LinearFilter;
part2Texture.magFilter=THREE.LinearFilter;
part2Texture.generateMipmaps=false;
const screenVideos={part1:{video:part1Video,texture:part1Texture},part2:{video:part2Video,texture:part2Texture}};
mediaReady.then(()=>{
  for(const [name,entry] of Object.entries(screenVideos))entry.video.src=`${mediaBase}${name}.mp4`;
  part1Video.play().catch(()=>{});
}).catch(error=>{console.error('Online media could not start',error);document.querySelector('#screenTime').textContent='视频加载失败，请刷新页面';});
const playScreenVideo=entry=>mediaReady.then(()=>{entry.video.muted=false;return entry.video.play();}).catch(error=>console.error('Video playback failed',error));
const selectedScreenVideo=()=>screenVideos[document.querySelector('#screenContent').value];
posterTexture.colorSpace=originalScreenTexture.colorSpace=THREE.SRGBColorSpace;
posterTexture.minFilter=THREE.LinearMipmapNearestFilter;
originalScreenTexture.minFilter=THREE.LinearMipmapNearestFilter;
// Leave a centered service portal beneath the LED for the lion's wheeled exit.
const lionPortalWidth=7.2*1.5*2*0.8,lionPortalHeight=5.6*1.5*2*0.8*1.2;
const lionPanelRise=lionPortalHeight+0.3;
const screenW=50*stageScale,screenH=screenW/3;
const cueCanvas=document.createElement('canvas');cueCanvas.width=1024;cueCanvas.height=512;
const cueContext=cueCanvas.getContext('2d');
cueContext.fillStyle='#000000';cueContext.fillRect(0,0,1024,512);
const cueTexture=new THREE.CanvasTexture(cueCanvas);cueTexture.colorSpace=THREE.SRGBColorSpace;
const ledPanels=[];
const addLedPanel=(x,y,w,h,u,v)=>{
  const crop=source=>{const texture=source.clone();texture.repeat.set(w/screenW,h/screenH);texture.offset.set(u,v);texture.needsUpdate=true;return texture;};
  const poster=crop(posterTexture),original=crop(originalScreenTexture),cue=crop(cueTexture);
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:poster,toneMapped:false,fog:false}));
  panel.position.set(x,y,-58.6);scene.add(panel);ledPanels.push({panel,poster,original,cue});return panel;
};
addLedPanel(0,stageH+lionPortalHeight+(screenH-lionPortalHeight)/2,screenW,screenH-lionPortalHeight,0,lionPortalHeight/screenH);
const ledSideWidth=(screenW-lionPortalWidth)/2;
for(const side of [-1,1])addLedPanel(side*(lionPortalWidth+ledSideWidth)/2,stageH+lionPortalHeight/2,ledSideWidth,lionPortalHeight,side<0?0:(ledSideWidth+lionPortalWidth)/screenW,0);
const lionScreenPanel=addLedPanel(0,stageH+lionPortalHeight/2,lionPortalWidth,lionPortalHeight,ledSideWidth/screenW,0);
const videoBacking=new THREE.Mesh(new THREE.PlaneGeometry(screenW,screenH),new THREE.MeshBasicMaterial({color:0x000000,fog:false}));
videoBacking.position.set(0,stageH+screenH/2,-58.4);scene.add(videoBacking);
const videoScreen=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:part1Texture,toneMapped:false,fog:false}));
videoScreen.position.set(0,stageH+screenH/2,-58.2);scene.add(videoScreen);
videoScreen.scale.set(screenW,screenH,1);
const fitScreenVideo=({video,texture},bottomTrim=0,horizontalShift=0,extraZoom=1)=>{
  if(!video.videoWidth||!video.videoHeight)return;
  const sourceAspect=video.videoWidth/video.videoHeight,screenAspect=screenW/screenH;
  const zoom=extraZoom*(horizontalShift?1.04:1);
  const cropW=Math.min(1,screenAspect/sourceAspect)/zoom;
  const cropH=Math.min(1,sourceAspect/screenAspect)/zoom;
  texture.repeat.set(cropW,cropH);
  texture.offset.set(THREE.MathUtils.clamp((1-cropW)/2+horizontalShift,0,1-cropW),Math.min(bottomTrim,1-cropH));
};
part1Video.addEventListener('loadedmetadata',()=>fitScreenVideo(screenVideos.part1,0.17,0.02,0.97));
const fitPart2Video=()=>{
  // Rotate only the picture slightly counterclockwise in the screen plane.
  // The small zoom keeps the corners covered; the screen mesh stays fixed.
  fitScreenVideo(screenVideos.part2,0,0,1.02);
  part2Texture.center.set(0.5,0.5);
  part2Texture.offset.set(0.006,0);
  part2Texture.rotation=THREE.MathUtils.degToRad(1);
};
part2Video.addEventListener('loadedmetadata',fitPart2Video);
fitScreenVideo(screenVideos.part1,0.17,0.02,0.97);
fitPart2Video();
const lionScreenHomeY=lionScreenPanel.position.y,lionScreenHomeZ=lionScreenPanel.position.z;
// A single front surface hides the moving panel joints while the screen is closed.
const fullScreenFacade=new THREE.Mesh(new THREE.PlaneGeometry(screenW,screenH),new THREE.MeshBasicMaterial({map:posterTexture,toneMapped:false,fog:false}));
fullScreenFacade.position.set(0,stageH+screenH/2,-58.25);scene.add(fullScreenFacade);
let cueScreenActive=false;
const setCueScreen=(active)=>{
  cueScreenActive=active;
  const screenContent=document.querySelector('#screenContent').value;
  fullScreenFacade.visible=!active&&!screenVideos[screenContent];
  videoBacking.visible=videoScreen.visible=!active&&!!screenVideos[screenContent];
  for(const entry of ledPanels){
    entry.panel.visible=active||!screenVideos[screenContent];
    entry.panel.material.map=active?entry.cue:entry[screenContent]||entry.poster;
    entry.panel.material.needsUpdate=true;
  }
};
document.querySelector('#screenContent').addEventListener('change',event=>{
  const selected=event.target.value;
  for(const entry of Object.values(screenVideos))entry.video.pause();
  fullScreenFacade.material.map=selected==='original'?originalScreenTexture:posterTexture;
  fullScreenFacade.material.needsUpdate=true;
  const selectedVideo=selectedScreenVideo();
  // For part2, lean the top edge away from the audience. Keep the backing
  // parallel and the picture ahead of the stage panels at every corner.
  videoScreen.rotation.x=selected==='part2'?-THREE.MathUtils.degToRad(2):0;
  videoScreen.rotation.y=0;
  videoBacking.rotation.x=videoScreen.rotation.x;
  videoBacking.rotation.y=0;
  videoScreen.position.z=selected==='part2'?-57.9:-58.2;
  videoBacking.position.z=selected==='part2'?-58.1:-58.4;
  videoScreen.scale.set(screenW*(selected==='part2'?1.04:1),screenH*(selected==='part2'?1.02:1),1);
  videoBacking.scale.x=selected==='part2'?1.02:1;
  if(selectedVideo){videoScreen.material.map=selectedVideo.texture;videoScreen.material.needsUpdate=true;}
  setCueScreen(cueScreenActive);
  refreshScreenTime();
  if(selectedVideo)playScreenVideo(selectedVideo);
});
const screenProgress=document.querySelector('#screenProgress');
const screenTime=document.querySelector('#screenTime');
const formatScreenTime=seconds=>{const n=Math.floor(Number.isFinite(seconds)?seconds:0);return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};
const refreshScreenTime=()=>{const video=selectedScreenVideo()?.video;const duration=video?.duration;screenProgress.value=video&&Number.isFinite(duration)&&duration>0?Math.round(video.currentTime/duration*1000):0;screenTime.textContent=`${formatScreenTime(video?.currentTime)} / ${formatScreenTime(duration)}`;};
for(const entry of Object.values(screenVideos))for(const event of ['loadedmetadata','timeupdate','ended'])entry.video.addEventListener(event,refreshScreenTime);
screenProgress.addEventListener('input',()=>{const video=selectedScreenVideo()?.video;if(video&&Number.isFinite(video.duration)&&video.duration>0)video.currentTime=video.duration*Number(screenProgress.value)/1000;});
document.querySelector('#screenPlay').addEventListener('click',()=>{const entry=selectedScreenVideo();if(entry)playScreenVideo(entry);});
document.querySelector('#screenPause').addEventListener('click',()=>selectedScreenVideo()?.video.pause());
document.querySelector('#screenVolume').addEventListener('input',event=>{for(const entry of Object.values(screenVideos)){entry.video.volume=Number(event.target.value);entry.video.muted=entry.video.volume===0;}});
document.querySelector('#venueBrightness').addEventListener('input',event=>{renderer.toneMappingExposure=1.35*Number(event.target.value);});
const screenBackingW=screenW+2;
const portalInnerBlack=new THREE.MeshBasicMaterial({color:0x000000});
box(screenBackingW,screenH-lionPortalHeight,0.7,portalInnerBlack,0,stageH+lionPortalHeight+(screenH-lionPortalHeight)/2,-59.2);
for(const side of [-1,1])box((screenBackingW-lionPortalWidth)/2,lionPortalHeight,0.7,portalInnerBlack,side*(screenBackingW+lionPortalWidth)/4,stageH+lionPortalHeight/2,-59.2);
// Frame only the outer edge so no vertical bars cross the picture.
const screenFrameMat=mat(0x080a0d,0.78,0.28),screenTopY=stageH+screenH;
box(screenW+0.9,0.4,0.82,screenFrameMat,0,screenTopY+0.2,-58.35);
for(const side of [-1,1]){
  box(0.48,screenH+0.4,0.78,screenFrameMat,side*(screenW/2+0.22),stageH+screenH/2,-58.36);
}
const lionTentMat=mat(0x111318,1);
const lionTentZ=-70.25,lionTentWidth=lionPortalWidth+4,lionTentDepth=21,lionTentHeight=lionPortalHeight+1.6;
for(const side of [-1,1])box(0.22,lionTentHeight,lionTentDepth,lionTentMat,side*lionTentWidth/2,stageH+lionTentHeight/2,lionTentZ);
box(lionTentWidth,lionTentHeight,0.22,lionTentMat,0,stageH+lionTentHeight/2,lionTentZ-lionTentDepth/2);
const lionTentRoof=new THREE.Mesh(new THREE.PlaneGeometry(lionTentWidth,lionTentDepth),new THREE.MeshBasicMaterial({color:0x000000,side:THREE.DoubleSide}));
lionTentRoof.rotation.x=-Math.PI/2;
lionTentRoof.position.set(0,stageH+lionTentHeight,lionTentZ);
scene.add(lionTentRoof);
const lionServiceFloor=serviceFloor;
const lionLiftTravel=stageH-lionServiceFloor;
const lionLiftWidth=14,lionLiftDepth=20;
// Join the lift and stage edge-to-edge; overlapping top faces flicker at stage height.
const lionBridgeRear=lionTentZ+lionLiftDepth/2;
box(lionPortalWidth,0.2,stageRearZ-lionBridgeRear,black,0,stageH-0.1,(lionBridgeRear+stageRearZ)/2);
const lionLiftAssembly=new THREE.Group();lionLiftAssembly.position.set(0,lionServiceFloor,lionTentZ);scene.add(lionLiftAssembly);
box(lionLiftWidth,0.25,lionLiftDepth,mat(0x181a1f,0.92),0,-0.125,0,lionLiftAssembly);
// Temporary four-wheel deck stands in for the lion and stays on the lift until the exit opens.
const lionBoard=new THREE.Group();lionBoard.position.set(0,lionServiceFloor,lionTentZ);scene.add(lionBoard);
const lionBoardScale=1.5,lionBoardLengthScale=1.8;lionBoard.scale.set(lionBoardScale*2,lionBoardScale*2,lionBoardScale*lionBoardLengthScale);
box(3,0.22,7.2,mat(0x73777d,0.8),0,0.59,0,lionBoard);
box(2.58,0.035,6.5,mat(0x9da1a6,0.8),0,0.72,0,lionBoard);
const lionBoardWheels=[];
for(const x of [-1.18,1.18])for(const z of [-2.75,2.75]){
  const wheel=cyl(0.25,0.25,0.26,mat(0x292c31,0.95),x,0.29,z,lionBoard,20);
  wheel.rotation.z=Math.PI/2;lionBoardWheels.push(wheel);
}
const lionBoardDestination=liftZ-liftR-7.2*lionBoardScale*lionBoardLengthScale/2-0.5;
const lionWheelAxis=new THREE.Vector3(1,0,0);
const lionShaftMat=mat(0x252a31,1);
for(const side of [-1,1])box(0.18,lionLiftTravel,lionLiftDepth+0.2,lionShaftMat,side*(lionLiftWidth/2+0.12),(stageH+lionServiceFloor)/2,lionTentZ);
box(lionLiftWidth+0.3,lionLiftTravel,0.18,lionShaftMat,0,(stageH+lionServiceFloor)/2,lionTentZ-lionLiftDepth/2-0.1);
const trussMat = mat(0x101014, 0.45, 0.6);
const trussTopY=stageH+screenH+1;
for (const x of [-(screenW/2+1.6),screenW/2+1.6]) {
  box(1.2,trussTopY,1.2,trussMat,x,trussTopY/2,-58);
  for (let y = 3; y < trussTopY-1; y += 2) line([[x-0.6,y,-57.4],[x+0.6,y+1,-58.6]],0x25252b,0.05);
}
box(screenW+6,1.15,1.3,trussMat,0,trussTopY,-58);
// Layered front and rear trusses, cross braces and a shallow segmented roof match the visible touring rig.
for(const z of [-56.8,-60.5])for(const y of [trussTopY+0.35,trussTopY+1.35])box(screenW+8,0.2,0.22,trussMat,0,y,z);
for(let x=-screenW/2-3;x<=screenW/2+3;x+=3.4){
  box(0.16,1.18,0.22,trussMat,x,trussTopY+0.85,-56.8);
  line([[x,trussTopY+0.35,-56.7],[x+2.5,trussTopY+1.35,-56.7]],0x32363b,0.045);
  box(0.16,0.2,3.7,trussMat,x,trussTopY+1.35,-58.65);
}
const canopyMat=mat(0x777e86,0.83,0.16),canopyCount=10,canopySlice=(screenW+8)/canopyCount;
for(let i=0;i<canopyCount;i++){
  const x=(i+0.5-canopyCount/2)*canopySlice;
  const arch=0.65*(1-Math.pow(x/(screenW/2+4),2));
  const panel=box(canopySlice-0.12,0.15,5.3,canopyMat,x,trussTopY+2.0+arch,-59.7);
  panel.rotation.x=-0.055;
}
for(const side of [-1,1]){
  const sx=side*screenW*0.255;
  line([[sx,trussTopY+1.25,-56.8],[sx,screenTopY-0.8,-56.8]],0x3d424a,0.08);
  for(let i=0;i<8;i++){
    const speaker=box(1.45,0.72,1.15,trussMat,sx,screenTopY-1.1-i*0.73,-56.55+i*0.035);
    speaker.rotation.x=-0.06-i*0.012;
  }
  const towerX=side*(screenW/2+2.8);
  box(1.35,screenH+1.7,1.5,trussMat,towerX,stageH+(screenH+1.7)/2,-57.7);
}
const lampMat = new THREE.MeshBasicMaterial({ color:0xffb967, toneMapped:false });
const lampGeo = new THREE.SphereGeometry(0.095, 6, 5);
const lampPositions = [];
// Light the full front edge up to the central runway opening.
for(let x=-stageHalfWidth+1.4;x<=stageHalfWidth-1.4+0.001;x+=1.6)
  if(Math.abs(x)>runwayHalfWidth+0.05)lampPositions.push([x,stageH+0.06,stageFrontZ-0.2]);
// Only the exposed boundary gets lamps; the runway and arrow overlap internally.
for (const x of [-runwayHalfWidth,runwayHalfWidth]) for(let z=stageFrontZ+0.2;z<=runwayFrontZ;z+=0.7) lampPositions.push([x-Math.sign(x)*0.025,stageH*0.5,z]);
for(let i=1;i<=8;i++){
  const a=arrowPts[i],b=arrowPts[(i+1)%arrowPts.length];
  const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.5);
  for(let k=0;k<n;k++){
    const x=a[0]+(b[0]-a[0])*k/n,z=a[1]+(b[1]-a[1])*k/n;
    const dx=-x,dz=liftZ-0.5-z,length=Math.hypot(dx,dz);
    lampPositions.push([x+dx/length*0.025,stageH*0.5,z+dz/length*0.025]);
  }
}
const lampMeshes=[];
for(const p of lampPositions){const m=new THREE.Mesh(lampGeo,lampMat.clone());m.position.set(...p);scene.add(m);lampMeshes.push(m);}

// Match the piano platform to the arrow floor without a visible circular outline.
const liftAssembly=new THREE.Group();liftAssembly.position.set(liftX,serviceFloor,liftZ);scene.add(liftAssembly);
// Keep the piano centered; the one-person lift stays on the arrow's centreline while the piano turns.
const singerLiftR=1.7;
const singerLiftOffsetZ=4.4*1.4;
const singerLiftAssembly=new THREE.Group();singerLiftAssembly.position.set(liftX,stageH,liftZ+singerLiftOffsetZ);scene.add(singerLiftAssembly);
let singerPassenger=false;
const singerLiftCenter=()=>({x:liftX,z:liftZ+singerLiftOffsetZ});
const onSingerLift=(x,z)=>{const center=singerLiftCenter();return Math.hypot(x-center.x,z-center.z)<singerLiftR;};
const singerDeck=new THREE.Mesh(new THREE.CircleGeometry(singerLiftR+0.008,72),black);
singerDeck.rotation.x=-Math.PI/2;singerDeck.position.y=0.008;singerDeck.receiveShadow=true;singerLiftAssembly.add(singerDeck);
// Leave a rear access opening in the well so the lowered platform joins the work corridor.
const shaftStart=Math.PI+0.53,shaftHalfArc=(Math.PI*2-1.06)/2;
const shaftPanels=[-1,1].map((side,index)=>{
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(liftR+0.045,liftR+0.045,liftTravel,72,1,true,shaftStart+index*shaftHalfArc,shaftHalfArc),new THREE.MeshStandardMaterial({color:0x050507,side:THREE.DoubleSide,roughness:1}));
  mesh.position.set(liftX,(stageH+serviceFloor)/2,liftZ);scene.add(mesh);return {mesh,side};
});
const liftShape=new THREE.Shape();liftShape.absarc(0,0,liftR+0.08,0,Math.PI*2,false);
const singerHole=new THREE.Path();singerHole.absarc(0,-singerLiftOffsetZ,singerLiftR+0.005,0,Math.PI*2,true);liftShape.holes.push(singerHole);
const lift = new THREE.Mesh(new THREE.ShapeGeometry(liftShape,72), black);
lift.rotation.x=-Math.PI/2;lift.position.set(0,0.003,0);lift.receiveShadow=true;liftAssembly.add(lift);
// The two stage surfaces share the arrow outline; one leaves the singer's opening free.
const makeArrowCapGeometry=(holeCenter)=>{
  const capShape=new THREE.Shape();
  capShape.moveTo(arrowPts[0][0],-arrowPts[0][1]);
  for(let i=1;i<arrowPts.length;i++)capShape.lineTo(arrowPts[i][0],-arrowPts[i][1]);
  capShape.closePath();
  if(holeCenter){const hole=new THREE.Path();hole.absarc(holeCenter.x,-holeCenter.z,singerLiftR+0.005,0,Math.PI*2,true);capShape.holes.push(hole);}
  return new THREE.ShapeGeometry(capShape);
};
const makeClosedStagePlugGeometry=(holeCenter)=>{
  const plugShape=new THREE.Shape();plugShape.absarc(liftX,liftZ,liftR+0.06,0,Math.PI*2,false);
  const hole=new THREE.Path();hole.absarc(holeCenter.x,holeCenter.z,singerLiftR+0.005,0,Math.PI*2,true);plugShape.holes.push(hole);
  return new THREE.ExtrudeGeometry(plugShape,{depth:stageH+0.01,bevelEnabled:false});
};
const closedStageCap=new THREE.Mesh(makeArrowCapGeometry(),black);
closedStageCap.rotation.x=-Math.PI/2;closedStageCap.position.y=stageH+0.008;closedStageCap.receiveShadow=true;closedStageCap.visible=false;scene.add(closedStageCap);
const openSingerStageCap=new THREE.Mesh(makeArrowCapGeometry(singerLiftCenter()),black);
openSingerStageCap.rotation.x=-Math.PI/2;openSingerStageCap.position.y=stageH+0.008;openSingerStageCap.receiveShadow=true;openSingerStageCap.visible=false;scene.add(openSingerStageCap);
const closedStagePlug=new THREE.Mesh(makeClosedStagePlugGeometry(singerLiftCenter()),black);
closedStagePlug.rotation.x=Math.PI/2;closedStagePlug.position.y=stageH+0.005;scene.add(closedStagePlug);
closedStagePlug.visible=false;
// Two dark semicircular leaves slide over the well after the piano clears the stage floor.
const coverShape=new THREE.Shape();
coverShape.moveTo(0,-liftR);
coverShape.absarc(0,0,liftR,-Math.PI/2,Math.PI/2,false);
coverShape.lineTo(0,-liftR);
const pianoCoverLeaves=[-1,1].map(side=>{
  const leaf=new THREE.Mesh(new THREE.ShapeGeometry(coverShape,48),new THREE.MeshStandardMaterial({color:0x090b0e,roughness:0.86,side:THREE.DoubleSide}));
  leaf.rotation.x=-Math.PI/2;leaf.scale.x=side;
  leaf.position.set(side*(liftR+0.16),stageH-0.08,liftZ);
  leaf.visible=false;
  leaf.receiveShadow=true;scene.add(leaf);return {leaf,side};
});
let pianoCoverProgress=1,pianoCoverTarget=1;
// The B1 service level follows the complete stadium footprint. The original
// screen and piano bays remain part of this connected floor.
const serviceMat=mat(0x343d47,0.95),serviceWall=mat(0x515b66,0.9);
const basementFloorShape=new THREE.Shape();
basementFloorShape.absellipse(0,0,narrowX(255),280,0,Math.PI*2,false);
const lionFloorHole=new THREE.Path();
const lionFloorHalfWidth=lionLiftWidth/2+0.02,lionFloorHalfDepth=lionLiftDepth/2+0.02;
lionFloorHole.moveTo(-lionFloorHalfWidth,-lionTentZ-lionFloorHalfDepth);
lionFloorHole.lineTo(-lionFloorHalfWidth,-lionTentZ+lionFloorHalfDepth);
lionFloorHole.lineTo(lionFloorHalfWidth,-lionTentZ+lionFloorHalfDepth);
lionFloorHole.lineTo(lionFloorHalfWidth,-lionTentZ-lionFloorHalfDepth);
lionFloorHole.closePath();
basementFloorShape.holes.push(lionFloorHole);
const basementFloor=new THREE.Mesh(new THREE.ShapeGeometry(basementFloorShape,160),serviceMat);
basementFloor.rotation.x=-Math.PI/2;basementFloor.position.y=serviceFloor;scene.add(basementFloor);
const basementWall=new THREE.Mesh(new THREE.CylinderGeometry(1,1,4.1,160,1,true),new THREE.MeshStandardMaterial({color:0x515b66,roughness:0.9,side:THREE.DoubleSide}));
basementWall.scale.set(narrowX(255),1,280);basementWall.position.y=-2.13;scene.add(basementWall);
const basementCeilingShape=new THREE.Shape();basementCeilingShape.absellipse(0,0,narrowX(255),280,0,Math.PI*2,false);
const pianoCeilingHole=new THREE.Path();pianoCeilingHole.absarc(0,-liftZ,liftR+0.2,0,Math.PI*2,true);
const stageRectCeilingHole=stageRectFloorHole();
const lionCeilingHalfWidth=lionLiftWidth/2+0.1,lionCeilingHalfDepth=lionLiftDepth/2+0.1;
const lionCeilingHole=new THREE.Path();
lionCeilingHole.moveTo(-lionCeilingHalfWidth,-lionTentZ-lionCeilingHalfDepth);
lionCeilingHole.lineTo(-lionCeilingHalfWidth,-lionTentZ+lionCeilingHalfDepth);
lionCeilingHole.lineTo(lionCeilingHalfWidth,-lionTentZ+lionCeilingHalfDepth);
lionCeilingHole.lineTo(lionCeilingHalfWidth,-lionTentZ-lionCeilingHalfDepth);
lionCeilingHole.closePath();
basementCeilingShape.holes.push(pianoCeilingHole,stageRectCeilingHole,lionCeilingHole);
const basementCeiling=new THREE.Mesh(new THREE.ShapeGeometry(basementCeilingShape,160),new THREE.MeshStandardMaterial({color:0x222a34,roughness:1,side:THREE.DoubleSide}));
basementCeiling.rotation.x=-Math.PI/2;basementCeiling.position.y=-0.11;scene.add(basementCeiling);
const basementConcourse=new THREE.Mesh(new THREE.RingGeometry(0.72,0.94,160),mat(0x4c5965,0.94));
basementConcourse.rotation.x=-Math.PI/2;basementConcourse.scale.set(narrowX(255),280,1);basementConcourse.position.y=serviceFloor+0.015;scene.add(basementConcourse);
// Clear cross corridors connect the stage area to the far end and both flanks.
line([[0,serviceFloor+0.05,-261],[0,serviceFloor+0.05,261]],0x66829a,0.08);
line([[-narrowX(239),serviceFloor+0.05,0],[narrowX(239),serviceFloor+0.05,0]],0x66829a,0.08);
for(let i=0;i<12;i++){
  const a=i*Math.PI/6,x=narrowX(239)*Math.cos(a),z=260*Math.sin(a);
  const lamp=new THREE.PointLight(0xb9d9f1,30,35);lamp.position.set(x,-1.55,z);scene.add(lamp);
  box(1.4,0.05,0.35,new THREE.MeshBasicMaterial({color:0xa9d9ee}),x,-0.22,z);
  if(i%2===0){
    const bay=new THREE.Group();bay.position.set(narrowX(225)*Math.cos(a),serviceFloor,244*Math.sin(a));bay.rotation.y=-a;scene.add(bay);
    box(7,1.7,2.4,mat(0x29323d),0,0.85,0,bay);
    for(const dx of [-2.2,0,2.2])box(1.25,0.62,0.07,new THREE.MeshBasicMaterial({color:0x70a7be}),dx,1.15,1.24,bay);
  }
}
// The central opening connects the under-stage lift bay to rear-screen workstations.
for(const x of [-14,14])box(20,3.7,0.22,serviceWall,x,-2.1,-58.7);
// Split the rear-screen ceiling around the new lift shaft.
const lionCeilingSideWidth=24-lionCeilingHalfWidth;
for(const side of [-1,1])box(lionCeilingSideWidth,0.12,13,mat(0x1a1e23,1),side*(24+lionCeilingHalfWidth)/2,-0.06,lionTentZ);
const serviceCeiling=mat(0x1b2027,1);
const pianoShaftRearZ=liftZ-liftR-0.2;
for(const side of [-1,1]){
  box(20.6,0.12,stageRectRearZ+59,serviceCeiling,side*13.7,-0.06,(-59+stageRectRearZ)/2);
  box(24-stageRectW/2,0.12,stageRectD,serviceCeiling,side*(24+stageRectW/2)/2,-0.06,stageRectZ);
  box(20.6,0.12,pianoShaftRearZ-stageRectFrontZ,serviceCeiling,side*13.7,-0.06,(stageRectFrontZ+pianoShaftRearZ)/2);
  box(24-liftR-0.3,0.12,-30-pianoShaftRearZ,serviceCeiling,side*(24+liftR+0.3)/2,-0.06,(pianoShaftRearZ-30)/2);
}
box(6.8,0.12,stageRectRearZ+59,serviceCeiling,0,-0.06,(-59+stageRectRearZ)/2);
box(6.8,0.12,pianoShaftRearZ-stageRectFrontZ,serviceCeiling,0,-0.06,(stageRectFrontZ+pianoShaftRearZ)/2);
for(const z of [-35+arrowShift,-46,-63,-69]){
  const light=new THREE.PointLight(0xd7e7ff,35,24);light.position.set(0,-1.25,z);scene.add(light);
  box(0.9,0.05,0.28,new THREE.MeshBasicMaterial({color:0xd5eaff}),0,-1.1,z);
}
for(const x of [-11,11]){
  for(const z of [-64,-68]){
    box(2.2,2.7,0.8,mat(0x111921,0.55),x,-2.8,z);
    for(let y=-3.7;y<-1.8;y+=0.45)box(1.5,0.06,0.05,new THREE.MeshBasicMaterial({color:0x67a8d2}),x,y,z+0.43);
  }
  box(3.2,1,1.1,mat(0x181d24),x,-3.65,-61.5);
  box(2.5,0.65,0.08,new THREE.MeshBasicMaterial({color:0x6ca7bb}),x,-3.05,-60.91);
}
for(const [x,z] of [[-8,-55],[8,-53],[-8,-64],[8,-67]]){
  cyl(0.2,0.2,0.9,mat(0x191b20),x,serviceFloor+0.62,z);
  cyl(0.16,0.16,0.3,mat(0xa18475),x,serviceFloor+1.24,z);
  for(const dx of [-0.12,0.12])box(0.11,0.52,0.15,mat(0x15171a),x+dx,serviceFloor+0.27,z);
}
line([[0,serviceFloor+0.13,liftZ],[0,serviceFloor+0.13,-57],[2,serviceFloor+0.13,-64]],0x344e67,0.06);
// Low-detail piano establishes the scale; the ornate asset is a later confirmation stage.
const pianoGroup=new THREE.Group();pianoGroup.scale.set(2.2*1.3*areaLinearScale,1.65*1.35*areaLinearScale,2*1.8*areaLinearScale);liftAssembly.add(pianoGroup);
const ivory=mat(0xe8dfd1,0.27,0.12),gold=mat(0xd9b478,0.28,0.48);
const pianoBody=box(3.4,0.62,2.2,ivory,0,1.16,0,pianoGroup);
pianoBody.rotation.y=-0.15;
const lid=box(3.55,0.11,2.23,gold,0.05,1.67,-0.28,pianoGroup);
lid.rotation.z=-0.25;
for(const x of [-1.35,1.3]) for(const z of [-0.75,0.8]) cyl(0.08,0.12,1.05,ivory,x,0.53,z,pianoGroup);
box(0.9,0.55,0.46,ivory,-2.15,0.55,0.9,pianoGroup);
const spotlight=new THREE.SpotLight(0xffc8ef,110,65,0.42,0.35);
spotlight.position.set(-15,23,-10);spotlight.target.position.set(liftX,stageH,liftZ);scene.add(spotlight,spotlight.target);
const spotlight2=new THREE.SpotLight(0x99aaff,65,70,0.6,0.5);
spotlight2.position.set(15,22,5);spotlight2.target.position.set(0,stageH,liftZ);scene.add(spotlight2,spotlight2.target);

// Ordered floor seating blocks follow the supplied official schematic's zoning.
// The drawing is not dimensioned, so these rows are a walkable approximation.
const peopleColors=[0x343849,0x555760,0x5a426a];
const floorAudienceHeight=1.56*humanHeightScale;
const floorAudienceEyeHeight=floorAudienceHeight*0.9;
const people=peopleColors.map(c=>new THREE.InstancedMesh(makeHumanGeometry(c,true),humanMat,2600));
const peopleCount=[0,0,0];
const chairSeatGeo=new THREE.BoxGeometry(0.62,0.09,0.55);
const chairBackGeo=new THREE.BoxGeometry(0.62,0.52,0.08);
chairBackGeo.translate(0,0.31,0.28);
const chairGeo=mergeGeometries([chairSeatGeo,chairBackGeo]);
const chair=new THREE.InstancedMesh(chairGeo,mat(0xf4f4f0,0.78),5200);
const chairFrameParts=[];
for(const side of [-1,1]){
  for(const front of [-1,1]){
    const leg=new THREE.BoxGeometry(0.035,0.29,0.035);
    leg.rotateX(front*0.12);
    leg.translate(side*0.265,-0.18,front*0.225);
    chairFrameParts.push(leg);
  }
  const brace=new THREE.BoxGeometry(0.028,0.028,0.44);
  brace.translate(side*0.265,-0.105,0);
  chairFrameParts.push(brace);
}
const chairFrame=new THREE.InstancedMesh(mergeGeometries(chairFrameParts),mat(0xc7cbd0,0.52,0.4),5200);
let chairCount=0;
const sticks=[...standSticks];
// Preserve chair size and spectator foot positions while setting row spacing.
// Front to back: 7, 10, 7, 10 rows, with the existing cross-aisle widths.
const floorSeatPitch=2.55;
const blocks=[
  [-46*areaLinearScale,-9*areaLinearScale,floorAudienceStarts[0],9], [9*areaLinearScale,46*areaLinearScale,floorAudienceStarts[0],9],
  [-46*areaLinearScale,-10*areaLinearScale,floorAudienceStarts[1],13], [10*areaLinearScale,46*areaLinearScale,floorAudienceStarts[1],13],
  [-46*areaLinearScale,-9*areaLinearScale,floorAudienceStarts[2],9], [9*areaLinearScale,46*areaLinearScale,floorAudienceStarts[2],9],
  [-46*areaLinearScale,-9*areaLinearScale,floorAudienceStarts[3],13], [9*areaLinearScale,46*areaLinearScale,floorAudienceStarts[3],13]
];
for(const [x1,x2,zStart,rowCount] of blocks){
  for(let row=0;row<rowCount;row++)for(let xOffset=floorSeatPitch/2;xOffset<x2-x1-0.74;xOffset+=floorSeatPitch){
    const z=zStart+row*floorRowPitch;
    const x=x1+x2<0?x2-xOffset:x1+xOffset;
    // Match the rear blocks' column grid, then leave space beside the arrow fence.
    if(Math.abs(x)<fenceInnerXAtZ(z)+2.2)continue;
    if(Math.abs(Math.abs(x)-23*areaLinearScale)<0.9)continue;
    if(x*x/(70*70)+z*z/(118*118)>0.96)continue;
    if(chairCount>=5200)continue;
    dummy.position.set(x,1.05,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(3);dummy.updateMatrix();chair.setMatrixAt(chairCount,dummy.matrix);chairFrame.setMatrixAt(chairCount++,dummy.matrix);
    if(Math.random()<0.83){
      const color=Math.random()<0.08?2:Math.random()<0.47?1:0;
      const mesh=people[color];
      if(peopleCount[color]<2600){
        dummy.position.set(x,0.45+0.115*(humanHeightScale-humanBaseScale),z);
        dummy.rotation.y=Math.PI;dummy.scale.set(humanWidthScale,humanHeightScale,humanDepthScale);
        dummy.updateMatrix();mesh.setMatrixAt(peopleCount[color]++,dummy.matrix);
      }
      if(Math.random()<0.62)sticks.push(x+0.54,8.4+Math.random()*0.2,z);
    }
  }
}
chair.count=chairFrame.count=chairCount;chair.instanceMatrix.needsUpdate=chairFrame.instanceMatrix.needsUpdate=true;scene.add(chair,chairFrame);
people.forEach((mesh,i)=>{mesh.count=peopleCount[i];mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);});
const stickGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(sticks,3));
const stickColors=new THREE.BufferAttribute(new Float32Array(sticks.length),3);
stickGeometry.setAttribute('color',stickColors);
const stickPoints=new THREE.Points(stickGeometry,new THREE.PointsMaterial({vertexColors:true,size:0.28,sizeAttenuation:true,transparent:true,opacity:0.9,toneMapped:false}));
scene.add(stickPoints);
let audienceVisible=false;
standFans.visible=false;
people.forEach(mesh=>{mesh.visible=false;});
stickPoints.visible=false;
document.querySelector('#hideAudienceBtn').addEventListener('click',()=>{audienceVisible=false;standFans.visible=false;people.forEach(mesh=>{mesh.visible=false;});stickPoints.visible=false;});
document.querySelector('#showAudienceBtn').addEventListener('click',()=>{audienceVisible=true;standFans.visible=true;people.forEach(mesh=>{mesh.visible=true;});stickPoints.visible=ui.sticksOn.checked&&Number(ui.sticksPower.value)>0;});

// The walkable character uses the same mesh and height as the floor audience.
const avatar=new THREE.Group();scene.add(avatar);
avatar.visible=false;
const avatarBody=new THREE.Mesh(makeHumanGeometry(peopleColors[0],false),humanMat);
avatarBody.scale.set(humanWidthScale,humanHeightScale,humanDepthScale);avatar.add(avatarBody);
const eyeHeight=()=>backstageMode?Math.min(floorAudienceEyeHeight,-serviceFloor-0.3):floorAudienceEyeHeight;

const keys=new Set();
let yaw=Math.PI,pitch=0.23,firstPerson=true,aerial=false,layout=false,exterior=false,backstageMode=false;
const layoutFocus=new THREE.Vector3(0,10,0);
let layoutAzimuth=0,layoutElevation=Math.atan2(215,195);
const layoutDistance=Math.hypot(215,195);
const exteriorFocus=new THREE.Vector3(0,35,0);
let exteriorAzimuth=Math.atan2(245,365),exteriorElevation=Math.atan2(210,Math.hypot(245,365));
let exteriorDistance=Math.hypot(245,210,365),exteriorDragging=false,exteriorLastX=0,exteriorLastY=0;
const pos=new THREE.Vector3(0,6.2,57);
let selectedSpawn=spawnSelect.value;
const topSideTier=standTiers[2];
const sideSpawnSlope=0.76,sideSpawnAngle=0.27;
const sideSpawnX=THREE.MathUtils.lerp(topSideTier.inner[0],topSideTier.outer[0],sideSpawnSlope)*Math.cos(sideSpawnAngle);
const sideSpawnZ=THREE.MathUtils.lerp(topSideTier.inner[1],topSideTier.outer[1],sideSpawnSlope)*Math.sin(sideSpawnAngle);
const sideSpawnY=THREE.MathUtils.lerp(topSideTier.height[0],topSideTier.height[1],sideSpawnSlope);
const sideViewOffset=0.43,sideViewPitch=0.77;
const spawnPoints={
  field:{x:0,y:0,z:12,yaw:Math.PI,pitch:0.18},
  merlion:{x:165,y:0,z:92,yaw:Math.PI/2,pitch:0.08},
  left:{x:-sideSpawnX,y:sideSpawnY,z:sideSpawnZ,yaw:Math.atan2(sideSpawnX,stageFrontZ-sideSpawnZ)-sideViewOffset,pitch:sideViewPitch},
  right:{x:sideSpawnX,y:sideSpawnY,z:sideSpawnZ,yaw:Math.atan2(-sideSpawnX,stageFrontZ-sideSpawnZ)+sideViewOffset,pitch:sideViewPitch},
  rear:{x:0,y:55,z:237,yaw:Math.PI,pitch:0.16}
};
const setView=(view)=>{
  singerPassenger=false;
  exteriorDragging=false;
  if(view==='stand')view='rear';
  aerial=view==='aerial';
  layout=view==='layout';
  exterior=view==='exterior';
  scene.userData.panoramaHidden=exterior||layout;
  if(scene.userData.panoramaBackdrop)scene.userData.panoramaBackdrop.visible=!scene.userData.panoramaHidden;
  backstageMode=view==='backstage';
  firstPerson=backstageMode||(view in spawnPoints);
  if((exterior||layout)&&document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();
  if(aerial||layout||exterior)return;
  if(backstageMode){pos.set(0,serviceFloor,-53);yaw=Math.PI;pitch=-0.08;avatar.rotation.y=yaw;camera.position.set(0,serviceFloor+eyeHeight(),-53);return;}
  if(view in spawnPoints){
    const spawn=spawnPoints[view];
    pos.set(spawn.x,spawn.y,spawn.z);yaw=spawn.yaw;pitch=spawn.pitch;
  }else{pos.set(0,0,30);yaw=Math.PI;pitch=0.18;}
  avatar.rotation.y=yaw;camera.position.set(pos.x,pos.y+eyeHeight(),pos.z);
};
const requestedView=new URLSearchParams(location.search).get('view');
if(requestedView in spawnPoints){selectedSpawn=requestedView;spawnSelect.value=requestedView;}
setView(requestedView==='stage'?'field':requestedView||selectedSpawn);
const insideArrow=(x,z)=>{
  let c=false;
  for(let i=0,j=arrowPts.length-1;i<arrowPts.length;j=i++){
    const [xi,zi]=arrowPts[i],[xj,zj]=arrowPts[j];
    if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))c=!c;
  }
  return c;
};
const floorHeight=(x,z)=>{
  if(backstageMode)return serviceFloor;
  // The park's ground-level route passes beneath the right-hand upper stand.
  // Keep elevated spectators on the stand instead of snapping them to ground.
  if(isMerlionRoute(x,z)&&pos.y<12)return 0;
  const armFloor=diamondArm.floorHeight(x,z);
  if(armFloor!==null)return armFloor;
  if(onSingerLift(x,z))return singerPassenger||singerLiftAssembly.position.y>stageH-0.35?singerLiftAssembly.position.y:stageH;
  if(onStageRectLift(x,z))return stageRectLift.position.y;
  if(Math.abs(x)<lionLiftWidth/2&&z>=lionTentZ-lionLiftDepth/2&&z<lionTentZ+lionLiftDepth/2)return lionLiftAssembly.position.y;
  if(Math.abs(x)<lionPortalWidth/2&&z>=lionTentZ+lionLiftDepth/2&&z<stageRearZ)return stageH;
  if(Math.abs(x)<stageHalfWidth&&z>stageRearZ&&z<stageFrontZ)return stageH;
  if(Math.abs(x)<runwayHalfWidth&&z>=runwayRearZ&&z<=runwayFrontZ)return stageH;
  if(insideArrow(x,z))return stageH;
  if(x>stageHalfWidth&&x<stageHalfWidth+5&&z>rampRearZ&&z<rampFrontZ)return stageH*(stageHalfWidth+5-x)/5;
  const lower=standTiers[0];
  if(Math.hypot(x/lower.inner[0],z/lower.inner[1])>0.96&&
     Math.hypot(x/standTiers[1].inner[0],z/standTiers[1].inner[1])<1.02&&
     inStandPortal(Math.atan2(z/lower.inner[1],x/lower.inner[0])))return 0;
  for(let tier=0;tier<standTiers.length;tier++){
    const t=standTiers[tier];
    const innerR=Math.hypot(x/t.inner[0],z/t.inner[1]);
    const outerR=Math.hypot(x/t.outer[0],z/t.outer[1]);
    if(innerR>=1&&outerR<=1){
      let low=0,high=1;
      for(let i=0;i<10;i++){
        const middle=(low+high)/2;
        const a=t.inner[0]+(t.outer[0]-t.inner[0])*middle;
        const b=t.inner[1]+(t.outer[1]-t.inner[1])*middle;
        if(Math.hypot(x/a,z/b)>1)low=middle;else high=middle;
      }
      return THREE.MathUtils.lerp(t.height[0],t.height[1],(low+high)/2);
    }
    const next=standTiers[tier+1];
    if(next&&outerR>1&&Math.hypot(x/next.inner[0],z/next.inner[1])<1)return t.height[1];
  }
  return 0;
};
const ui={
  stageOn:document.querySelector('#stageOn'),stagePower:document.querySelector('#stagePower'),
  stageColor:document.querySelector('#stageColor'),stageMode:document.querySelector('#stageMode'),
  sticksOn:document.querySelector('#sticksOn'),sticksPower:document.querySelector('#sticksPower'),
  sticksColor:document.querySelector('#sticksColor'),sticksMode:document.querySelector('#sticksMode'),
  turnSpeed:document.querySelector('#turnSpeed'),mechanismStatus:document.querySelector('#mechanismStatus')
};
let mechanismPhase='down',stopTime=0,notice='',noticeUntil=0;
let singerLiftTarget=0;
const singerLiftStatus=document.querySelector('#singerLiftStatus');
let stageRectTarget=0;
const stageRectStatus=document.querySelector('#stageRectStatus');
let shaftOpen=1,shaftTarget=1;
const shaftStatus=document.querySelector('#shaftStatus');
let lionCuePhase='closed';
const lionLiftStatus=document.querySelector('#lionLiftStatus');
const demoParams=new URLSearchParams(location.search);
if(demoParams.has('controls'))document.querySelector('#controls').open=true;
if(demoParams.get('demo')==='down'){
  mechanismPhase='down';liftAssembly.position.y=serviceFloor;shaftTarget=1;
  pianoCoverProgress=pianoCoverTarget=1;
  for(const {leaf} of pianoCoverLeaves){leaf.position.x=liftX;leaf.position.y=stageH+0.026;leaf.visible=true;}
}
const showNotice=(message)=>{notice=message;noticeUntil=clock.elapsedTime+2.5;};
const stageTint=new THREE.Color(),stickTint=new THREE.Color();
const updateLights=(time)=>{
  stageTint.set(ui.stageColor.value);
  stickTint.set(ui.sticksColor.value);
  const stagePower=ui.stageOn.checked?Number(ui.stagePower.value)*Number(document.querySelector('#venueBrightness').value):0;
  for(let i=0;i<lampMeshes.length;i++){
    lampMeshes[i].visible=stagePower>0;
    let effect=1;
    if(ui.stageMode.value==='pulse')effect=0.55+0.45*(0.5+0.5*Math.sin(time*2.4));
    if(ui.stageMode.value==='chase')effect=0.25+0.75*Math.max(0,Math.sin(time*4-i*0.38));
    lampMeshes[i].material.color.copy(stageTint).multiplyScalar(stagePower*effect);
  }
  const sticksPower=ui.sticksOn.checked?Number(ui.sticksPower.value):0;
  stickPoints.visible=audienceVisible&&sticksPower>0;
  if(!stickPoints.visible)return;
  for(let i=0;i<stickColors.count;i++){
    const x=sticks[i*3],z=sticks[i*3+2];
    let effect=1;
    if(ui.sticksMode.value==='pulse')effect=0.42+0.58*(0.5+0.5*Math.sin(time*2));
    if(ui.sticksMode.value==='wave')effect=0.3+0.7*(0.5+0.5*Math.sin(time*3-x*0.19-z*0.06));
    const whiteMix=i%9===0?0.44:0;
    const scale=sticksPower*effect;
    stickColors.setXYZ(i,(stickTint.r*(1-whiteMix)+whiteMix)*scale,(stickTint.g*(1-whiteMix)+whiteMix)*scale,(stickTint.b*(1-whiteMix)+whiteMix)*scale);
  }
  stickColors.needsUpdate=true;
};
const updateMechanism=(dt,lionDt)=>{
  diamondArm.update(lionDt);
  const rectGoal=stageRectTarget?stageRectBottom:stageH;
  stageRectLift.position.y=THREE.MathUtils.clamp(stageRectLift.position.y+Math.sign(rectGoal-stageRectLift.position.y)*lionDt*0.85,stageRectBottom,stageH);
  if(Math.abs(stageRectLift.position.y-rectGoal)<0.01)stageRectLift.position.y=rectGoal;
  stageRectFlushCap.visible=stageRectLift.position.y>=stageH-0.01;
  stageRectStatus.textContent=stageRectLift.position.y===stageH?'长方形升降台与舞台齐平':stageRectLift.position.y===stageRectBottom?'长方形升降台已到工作区':stageRectTarget?'长方形升降台正在下降':'长方形升降台正在升起';
  const singerGoal=singerLiftTarget?serviceFloor:stageH;
  singerLiftAssembly.position.y=THREE.MathUtils.clamp(singerLiftAssembly.position.y+Math.sign(singerGoal-singerLiftAssembly.position.y)*lionDt*0.85,serviceFloor,stageH);
  if(Math.abs(singerLiftAssembly.position.y-singerGoal)<0.01)singerLiftAssembly.position.y=singerGoal;
  singerLiftStatus.textContent=singerLiftAssembly.position.y===stageH?'小升降台与舞台齐平':singerLiftAssembly.position.y===serviceFloor?'小升降台已到工作区':singerLiftTarget?'小升降台正在下降':'小升降台正在升起';
  shaftOpen=THREE.MathUtils.clamp(shaftOpen+Math.sign(shaftTarget-shaftOpen)*lionDt*0.28,0,1);
  if(Math.abs(shaftOpen-shaftTarget)<0.01)shaftOpen=shaftTarget;
  for(const {mesh} of shaftPanels){
    mesh.position.y=(stageH+serviceFloor)/2-shaftOpen*liftTravel;
    mesh.visible=shaftOpen<1;
  }
  shaftStatus.textContent=shaftOpen===0?'围挡闭合':shaftOpen===1?'围挡已打开，可搬运钢琴':shaftTarget>shaftOpen?'围挡正在打开':'围挡正在关闭';
  const previousBoardZ=lionBoard.position.z;
  if(lionCuePhase==='raiseLift'){
    lionLiftAssembly.position.y=Math.min(stageH,lionLiftAssembly.position.y+lionDt*0.95);
    if(lionLiftAssembly.position.y>=stageH){setCueScreen(true);lionCuePhase='retract';}
  }else if(lionCuePhase==='retract'){
    lionScreenPanel.position.z=Math.max(-60.2,lionScreenPanel.position.z-lionDt*1.1);
    if(lionScreenPanel.position.z<=-60.2)lionCuePhase='raisePanel';
  }else if(lionCuePhase==='raisePanel'){
    lionScreenPanel.position.y=Math.min(lionScreenHomeY+lionPanelRise,lionScreenPanel.position.y+lionDt*1.2);
    // Once the opening clears the board, bring it up to the doorway while the panel finishes rising.
    if(lionScreenPanel.position.y>=lionScreenHomeY+3)
      lionBoard.position.z=Math.min(lionTentZ+1.2,lionBoard.position.z+lionDt*2.4);
    if(lionScreenPanel.position.y>=lionScreenHomeY+lionPanelRise)lionCuePhase='rollOut';
  }else if(lionCuePhase==='rollOut'){
    lionBoard.position.z=Math.min(lionBoardDestination,lionBoard.position.z+lionDt*3.6);
    if(lionBoard.position.z>=lionBoardDestination)lionCuePhase='open';
  }else if(lionCuePhase==='rollBack'){
    lionBoard.position.z=Math.max(lionTentZ,lionBoard.position.z-lionDt*3.6);
    if(lionBoard.position.z<=lionTentZ)lionCuePhase='restore';
  }else if(lionCuePhase==='restore'){
    lionLiftAssembly.position.y=Math.max(lionServiceFloor,lionLiftAssembly.position.y-lionDt*0.95);
    lionScreenPanel.position.y=Math.max(lionScreenHomeY,lionScreenPanel.position.y-lionDt*1.2);
    if(lionScreenPanel.position.y<=lionScreenHomeY)lionScreenPanel.position.z=Math.min(lionScreenHomeZ,lionScreenPanel.position.z+lionDt*1.1);
    if(lionLiftAssembly.position.y<=lionServiceFloor&&lionScreenPanel.position.z>=lionScreenHomeZ){lionCuePhase='closed';setCueScreen(false);}
  }
  lionBoard.position.y=lionLiftAssembly.position.y;
  const boardTravel=lionBoard.position.z-previousBoardZ;
  if(boardTravel!==0)for(const wheel of lionBoardWheels)wheel.rotateOnWorldAxis(lionWheelAxis,boardTravel/(0.25*lionBoardScale*2));
  const lionLabels={closed:'屏幕完整显示，升降台与滑板在地下工作区待命',raiseLift:'升降台先升至舞台，屏幕保持闭合',retract:'升降台已到位，中央屏幕正在后退',raisePanel:'中央屏幕正在缓缓上移',rollOut:'四轮滑板正缓慢驶向钢琴转盘后方',open:'滑板已到达钢琴转盘后方，等待退场',rollBack:'四轮滑板正缓慢退回升降台',restore:'滑板已归位，升降台下降且屏幕同步复原'};
  lionLiftStatus.textContent=lionLabels[lionCuePhase];
  const angularSpeed=Number(ui.turnSpeed.value)*Math.PI*2/60;
  if(mechanismPhase==='rotating')liftAssembly.rotation.y+=angularSpeed*lionDt;
  if(mechanismPhase==='stopping'){
    stopTime+=lionDt;
    liftAssembly.rotation.y+=angularSpeed*lionDt*Math.max(0,1-stopTime/1.2);
    if(stopTime>=1.2)mechanismPhase='descending';
  }
  if(mechanismPhase==='descending'){
    liftAssembly.position.y=Math.max(stageH-liftTravel,liftAssembly.position.y-lionDt*0.82);
    if(liftAssembly.position.y<=stageH-liftTravel/2)pianoCoverTarget=1;
    if(liftAssembly.position.y<=serviceFloor+0.001){mechanismPhase='down';shaftTarget=1;}
  }
  // Counter-rotate the otherwise plain deck so its opening remains aligned with the fixed singer lift.
  lift.rotation.z=-liftAssembly.rotation.y;
  const singerCenter=singerLiftCenter();
  singerLiftAssembly.position.x=singerCenter.x;singerLiftAssembly.position.z=singerCenter.z;
  pianoCoverProgress=THREE.MathUtils.clamp(pianoCoverProgress+Math.sign(pianoCoverTarget-pianoCoverProgress)*lionDt*0.28,0,1);
  if(Math.abs(pianoCoverProgress-pianoCoverTarget)<0.01)pianoCoverProgress=pianoCoverTarget;
  const stageClosed=pianoCoverProgress===1&&liftAssembly.position.y<=-0.1;
  const stageReady=stageClosed||liftAssembly.position.y>=stageH-0.01;
  const singerFlush=singerLiftAssembly.position.y>=stageH-0.01;
  const singerFloorRestored=singerLiftAssembly.position.y<=stageH-0.35;
  closedStageCap.visible=stageReady&&(singerFlush||singerFloorRestored);
  openSingerStageCap.visible=stageReady&&!singerFlush&&!singerFloorRestored;
  if(singerFlush)singerPassenger=false;
  closedStagePlug.visible=stageClosed;
  for(const {leaf,side} of pianoCoverLeaves){
    leaf.position.x=liftX+side*(liftR+0.16)*(1-pianoCoverProgress);
    leaf.position.y=stageH-0.08+0.106*pianoCoverProgress;
    leaf.visible=pianoCoverProgress>0&&!stageClosed&&singerFlush;
  }
  if(mechanismPhase==='openingCover'&&pianoCoverProgress===0)mechanismPhase='rising';
  if(mechanismPhase==='rising'){
    liftAssembly.position.y=Math.min(stageH,liftAssembly.position.y+lionDt*0.95);
    if(liftAssembly.position.y>=stageH-0.001)mechanismPhase='idle';
  }
  const labels={idle:'转台静止，台面平齐',rotating:'转台旋转中',stopping:'正在减速停转',descending:pianoCoverTarget?'钢琴已降过半，地面盖板正在合拢':'钢琴正在下降',down:pianoCoverProgress===1?'钢琴已降至台下，地面已复原':'钢琴已降至台下，地面盖板正在合拢',openingCover:'地面盖板正在打开，准备升起钢琴',rising:'钢琴正在升起'};
  ui.mechanismStatus.textContent=clock.elapsedTime<noticeUntil?notice:labels[mechanismPhase];
};
document.querySelector('#rotateBtn').addEventListener('click',()=>{
  if(singerLiftTarget||singerLiftAssembly.position.y<stageH-0.01){showNotice('请先升起箭头舞台小升降台');return;}
  if(liftAssembly.position.y<stageH-0.02){showNotice('请先升起转台');return;}
  mechanismPhase='rotating';
});
document.querySelector('#descendBtn').addEventListener('click',()=>{
  if(Math.hypot(pos.x-liftX,pos.z-liftZ)<liftR+0.3&&pos.y>stageH-0.3){showNotice('玩家在转盘上，请先离开');return;}
  if(mechanismPhase==='down'||mechanismPhase==='descending')return;
  stopTime=0;mechanismPhase=singerLiftAssembly.position.y<stageH-0.01?'descending':'stopping';
});
document.querySelector('#resetBtn').addEventListener('click',()=>{shaftTarget=0;pianoCoverTarget=0;mechanismPhase=pianoCoverProgress>0?'openingCover':'rising';});
document.querySelector('#singerDownBtn').addEventListener('click',()=>{
  if(mechanismPhase==='rotating'||mechanismPhase==='stopping'){mechanismPhase='idle';stopTime=0;}
  singerPassenger=onSingerLift(pos.x,pos.z)&&pos.y>stageH-0.3;
  singerLiftTarget=1;
});
document.querySelector('#singerUpBtn').addEventListener('click',()=>{
  singerLiftTarget=0;
  if(backstageMode&&onSingerLift(pos.x,pos.z)){backstageMode=false;firstPerson=true;singerPassenger=true;}
});
document.querySelector('#stageRectDownBtn').addEventListener('click',()=>{
  if(lionCuePhase!=='closed'){showNotice('请先让狮子滑板返回工作区');return;}
  stageRectTarget=1;
});
document.querySelector('#stageRectUpBtn').addEventListener('click',()=>{
  stageRectTarget=0;
  if(backstageMode&&onStageRectLift(pos.x,pos.z)){backstageMode=false;firstPerson=true;}
});
document.querySelector('#shaftOpenBtn').addEventListener('click',()=>{if(liftAssembly.position.y>serviceFloor+0.05){showNotice('请先将钢琴降至地下一层');return;}shaftTarget=1;});
document.querySelector('#shaftCloseBtn').addEventListener('click',()=>{shaftTarget=0;});
document.querySelector('#lionDownBtn').addEventListener('click',()=>{if(lionCuePhase==='open')lionCuePhase='rollBack';});
document.querySelector('#lionUpBtn').addEventListener('click',()=>{
  if(stageRectTarget||stageRectLift.position.y<stageH-0.01){showNotice('请先升起主舞台长方形升降台');return;}
  if(lionCuePhase==='closed')lionCuePhase='raiseLift';
});
function tick(){
  requestAnimationFrame(tick);
  const now=performance.now();
  if(selectedScreenVideo()?.video.paused===false&&now-lastRenderedAt<32)return;
  lastRenderedAt=now;
  const frameDelta=clock.getDelta(),dt=Math.min(frameDelta,0.05);
  updateMechanism(dt,Math.min(frameDelta,0.5));
  updateLights(clock.elapsedTime);
  if(!backstageMode&&singerLiftAssembly.position.y<=serviceFloor+0.01&&pos.y<serviceFloor+0.25&&onSingerLift(pos.x,pos.z))backstageMode=true;
  if(!backstageMode&&stageRectLift.position.y<=stageRectBottom+0.01&&pos.y<serviceFloor+0.25&&onStageRectLift(pos.x,pos.z))backstageMode=true;
  const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
  const r=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  if((f||r)&&(aerial||layout||exterior))setView(selectedSpawn);
  if(f||r){
    const v=new THREE.Vector3(Math.sin(yaw)*f-Math.cos(yaw)*r,0,Math.cos(yaw)*f+Math.sin(yaw)*r).normalize();
    const candidate=pos.clone().addScaledVector(v,dt*(keys.has('ShiftLeft')?12:6));
    const pianoWellOpen=liftAssembly.position.y<stageH-0.06&&pianoCoverProgress<0.999;
    const singerLowered=singerLiftAssembly.position.y<stageH-0.06;
    const onSinger=onSingerLift(pos.x,pos.z);
    const enteringSinger=onSingerLift(candidate.x,candidate.z);
    const singerWellOpen=singerLiftAssembly.position.y>stageH-0.35||singerPassenger;
    const crossesSingerWell=singerLowered&&!backstageMode&&singerWellOpen&&onSinger!==enteringSinger&&(!onSinger||singerLiftAssembly.position.y>serviceFloor+0.06);
    const rectLowered=stageRectLift.position.y<stageH-0.06;
    const onRect=onStageRectLift(pos.x,pos.z),enteringRect=onStageRectLift(candidate.x,candidate.z);
    const crossesRectWell=rectLowered&&!backstageMode&&onRect!==enteringRect&&(!onRect||stageRectLift.position.y>stageRectBottom+0.06);
    const hitsDrape=Math.abs(candidate.x)>stageHalfWidth&&Math.abs(candidate.x)<drapeOuterX&&Math.abs(candidate.z-drapeZ)<0.5;
    const hitsPartition=backstageMode&&Math.abs(candidate.z+58.7)<0.28&&Math.abs(candidate.x)>3.8;
    const insideBasement=!backstageMode||Math.hypot(candidate.x/narrowX(251),candidate.z/276)<1;
    if(insideBasement&&!hitsDrape&&!hitsPartition&&!crossesSingerWell&&!crossesRectWell&&(!pianoWellOpen||backstageMode||Math.hypot(candidate.x-liftX,candidate.z-liftZ)>liftR+0.12))pos.copy(candidate);
    pos.x=THREE.MathUtils.clamp(pos.x,backstageMode?-narrowX(251):-narrowX(260),backstageMode?narrowX(251):179);
    pos.z=THREE.MathUtils.clamp(pos.z,backstageMode?-276:-285,backstageMode?276:285);
    avatar.rotation.y=Math.atan2(v.x,v.z);
  }
  const h=floorHeight(pos.x,pos.z);pos.y=THREE.MathUtils.damp(pos.y,h,12,dt);
  if(backstageMode&&!onSingerLift(pos.x,pos.z))singerPassenger=false;
  avatar.position.copy(pos);avatar.visible=!firstPerson&&!aerial&&!layout&&!exterior;
  const focus=new THREE.Vector3(pos.x,pos.y+eyeHeight(),pos.z);
  const distance=firstPerson?0.04:5.6;
  const target=new THREE.Vector3(focus.x-Math.sin(yaw)*distance*Math.cos(pitch),focus.y+distance*Math.sin(pitch),focus.z-Math.cos(yaw)*distance*Math.cos(pitch));
  if(!firstPerson&&!backstageMode)target.y=Math.max(target.y,floorHeight(target.x,target.z)+2.0);
  if(aerial){camera.position.lerp(new THREE.Vector3(0,80,0),1-Math.exp(-7*dt));camera.lookAt(0,12,-40);}
  else if(layout){
    const horizontal=layoutDistance*Math.cos(layoutElevation);
    camera.position.lerp(new THREE.Vector3(
      layoutFocus.x+horizontal*Math.sin(layoutAzimuth),
      layoutFocus.y+layoutDistance*Math.sin(layoutElevation),
      layoutFocus.z+horizontal*Math.cos(layoutAzimuth)
    ),1-Math.exp(-7*dt));
    camera.lookAt(layoutFocus);
  }
  else if(exterior){
    const horizontal=exteriorDistance*Math.cos(exteriorElevation);
    const orbitPosition=new THREE.Vector3(
      exteriorFocus.x+horizontal*Math.sin(exteriorAzimuth),
      exteriorFocus.y+exteriorDistance*Math.sin(exteriorElevation),
      exteriorFocus.z+horizontal*Math.cos(exteriorAzimuth)
    );
    camera.position.lerp(orbitPosition,1-Math.exp(-7*dt));
    camera.lookAt(exteriorFocus);
  }
  else{camera.position.lerp(target,1-Math.exp(-10*dt));camera.lookAt(focus.x+Math.sin(yaw)*8,focus.y-Math.sin(pitch)*3,focus.z+Math.cos(yaw)*8);}
  status.textContent=exterior?'场馆外观：按住鼠标拖动可环绕 360° 查看，按 R 回出生点':layout?'俯视检查：按住鼠标拖动可环绕查看，按方向键或 WASD 回到角色视角':aerial?'俯视检查：按方向键或 WASD 回到角色视角并移动':`位置 x ${pos.x.toFixed(1)} · z ${pos.z.toFixed(1)} · ${backstageMode?'地下一层工作区':isMerlionRoute(pos.x,pos.z)&&pos.y<12?'鱼尾狮公园步道':h>0.5?'舞台/看台区域':'内场区域'}`;
  renderer.render(scene,camera);
}
const clock=new THREE.Clock();let lastRenderedAt=0;tick();
function lock(){if(!exterior&&!layout)renderer.domElement.requestPointerLock?.();}
spawnSelect.addEventListener('change',()=>{selectedSpawn=spawnSelect.value;setView(selectedSpawn);});
start.addEventListener('click',()=>{const entry=selectedScreenVideo();if(entry)playScreenVideo(entry);setView(selectedSpawn);start.blur();lock();});renderer.domElement.addEventListener('click',lock);
document.addEventListener('pointerlockchange',()=>{spawnPicker.style.display=document.pointerLockElement?'none':'grid';});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==renderer.domElement)return;yaw-=e.movementX*0.0024;pitch=THREE.MathUtils.clamp(pitch+e.movementY*0.002,-0.2,0.9);});
renderer.domElement.addEventListener('pointerdown',e=>{
  if((!exterior&&!layout)||e.button!==0)return;
  exteriorDragging=true;exteriorLastX=e.clientX;exteriorLastY=e.clientY;
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',e=>{
  if((!exterior&&!layout)||!exteriorDragging)return;
  if(layout){
    layoutAzimuth-=(e.clientX-exteriorLastX)*0.005;
    layoutElevation=THREE.MathUtils.clamp(layoutElevation+(e.clientY-exteriorLastY)*0.004,0.5,1.48);
  }else{
    exteriorAzimuth-=(e.clientX-exteriorLastX)*0.005;
    exteriorElevation=THREE.MathUtils.clamp(exteriorElevation+(e.clientY-exteriorLastY)*0.004,0.04,1.25);
  }
  exteriorLastX=e.clientX;exteriorLastY=e.clientY;
});
const endExteriorDrag=()=>{exteriorDragging=false;};
renderer.domElement.addEventListener('pointerup',endExteriorDrag);
renderer.domElement.addEventListener('pointercancel',endExteriorDrag);
const movementKeys=new Set(['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
document.addEventListener('keydown',e=>{
  if(e.code==='KeyR'){
    e.preventDefault();
    if(!e.repeat){keys.clear();selectedSpawn='rear';spawnSelect.value='rear';setView('rear');}
    return;
  }
  if(e.code==='Digit6'){
    e.preventDefault();
    if(!e.repeat)setView('exterior');
    return;
  }
  if(!document.pointerLockElement&&e.target instanceof HTMLElement&&e.target.closest('#controls, #spawn-picker'))return;
  if(movementKeys.has(e.code)&&(aerial||layout||exterior))setView(selectedSpawn);
  keys.add(e.code);
  if(movementKeys.has(e.code)||e.code==='Space')e.preventDefault();
  if(e.code==='KeyV'&&!e.repeat)firstPerson=!firstPerson;
  if(e.code==='Digit1')setView(selectedSpawn);
  if(e.code==='Digit2')setView('field');
  if(e.code==='Digit3')setView('aerial');
  if(e.code==='Digit4')setView('layout');
  if(e.code==='Digit5')setView('backstage');
  if(e.code==='Digit7')setView('merlion');
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>keys.clear());
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});






