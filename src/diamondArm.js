import * as THREE from 'three';

export function createDiamondArm({scene,box,cyl,mat,stageH,arrowTipZ,getPlayerPos,showNotice}){
  const black=mat(0x090b0e,0.86),steel=mat(0x171c22,0.56,0.42);
  const silver=mat(0xb8bec4,0.43,0.35),railMat=mat(0x666d75,0.5,0.5);
  const width=8.4*0.8,centerWidth=width/3,stepDepth=1.55,lowH=stageH/2;
  const stairStart=arrowTipZ-0.15,deckStart=stairStart+3*stepDepth;
  const deckLength=7.5*1.5*1.5,deckFront=deckStart+deckLength,doorLength=1.5;
  const stepDrop=(stageH-lowH)/3;

  // Three descending treads lead from the arrow tip to the low front platform.
  box(width,stageH,0.35,black,0,stageH/2,arrowTipZ-0.12);
  for(let i=0;i<3;i++){
    const top=stageH-stepDrop*(i+1);
    box(width,top,stepDepth,black,0,top/2,stairStart+(i+0.5)*stepDepth);
  }
  const sideWidth=(width-centerWidth)/2;
  for(const side of [-1,1])box(sideWidth,lowH,deckLength,black,side*(centerWidth+sideWidth)/2,lowH/2,deckStart+deckLength/2);

  // The centre third is a separate moving stage section. Its two outer thirds stay on the low plane.
  const carriage=new THREE.Group();scene.add(carriage);
  const moving=new THREE.Group();moving.position.set(0,lowH,deckStart);carriage.add(moving);
  for(const side of [-1,1]){
    box(0.55,0.18,deckLength,black,side*(centerWidth/2-0.275),-0.09,deckLength/2,moving);
    box(0.18,0.48,deckLength,steel,side*(centerWidth/2-0.2),-0.33,deckLength/2,moving);
  }
  box(centerWidth-1.1,0.13,deckLength,steel,0,-0.46,deckLength/2,moving);

  // The door initially hangs downward over the front opening, then rotates up 90 degrees to lie flush.
  const doorHinge=new THREE.Group();doorHinge.position.z=deckLength;moving.add(doorHinge);
  box(centerWidth,0.14,doorLength,black,0,-0.07,doorLength/2,doorHinge);
  for(const side of [-1,1]){
    const pin=cyl(0.16,0.16,0.3,silver,side*(centerWidth/2-0.22),-0.08,0,doorHinge,16);
    pin.rotation.z=Math.PI/2;
  }

  // A nested beam runs within the central stage section; only its empty diamond connector extends.
  const outerBeamLength=deckLength-0.8;
  box(1.18,0.42,outerBeamLength,steel,0,-0.31,0.1+outerBeamLength/2,moving);
  for(const side of [-1,1])box(0.14,0.55,deckLength-1.7,steel,side*0.73,-0.31,0.1+(deckLength-1.7)/2,moving);
  const innerBeamLength=4.3*1.5,extensionLength=2.8*1.5;
  const innerBeamRestZ=deckLength-innerBeamLength/2-0.2,connectorRestZ=deckLength+0.1;
  const innerBeam=box(0.82,0.29,innerBeamLength,steel,0,-0.3,innerBeamRestZ,moving);
  const connector=new THREE.Group();connector.position.set(0,-0.22,connectorRestZ);moving.add(connector);
  box(centerWidth-0.1,0.22,0.68,silver,0,0,0.12,connector);
  for(const side of [-1,1]){
    const forkX=centerWidth/2-0.15;
    box(0.24,0.55,1.0,silver,side*forkX,0.11,0.4,connector);
    const pin=cyl(0.16,0.16,0.28,steel,side*forkX,0.12,0.8,connector,16);pin.rotation.z=Math.PI/2;
  }

  // Rails continue past the low platform; the central stage section and arm travel on one carriage.
  const travel=24,railStart=deckStart+0.35,railEnd=Math.max(24,deckFront+travel+5.8);
  box(3.2,0.07,railEnd-railStart,steel,0,0.055,(railStart+railEnd)/2);
  for(let z=railStart+0.5;z<railEnd;z+=1.45)box(2.9,0.11,0.27,steel,0,0.14,z);
  for(const side of [-1,1])box(0.18,0.2,railEnd-railStart,railMat,side*1.15,0.24,(railStart+railEnd)/2);
  box(2.55,0.34,3.2,steel,0,0.44,deckStart+0.9,carriage);
  for(const side of [-1,1])for(const z of [deckStart+0.15,deckStart+1.65]){
    const wheel=cyl(0.27,0.27,0.2,railMat,side*1.15,0.36,z,carriage,16);wheel.rotation.z=Math.PI/2;
  }

  let phase='stowed',door=0,extension=0,rise=0,rail=0,installed=false;
  let pendingExtension=false,pendingInstall=false,pendingRaise=false;
  const preview=new URLSearchParams(location.search).get('arm');
  if(['load','mount','high','out','forward'].includes(preview)){
    door=1;extension=preview==='load'?0:1;
    installed=['high','out','forward'].includes(preview);
    rise=installed?1:0;rail=preview==='forward'?1:0;
    phase=preview==='load'?'doorOpen':preview==='mount'?'mountReady':preview==='forward'?'forward':'high';
  }
  const status=document.querySelector('#diamondArmStatus');
  const step=(value,target,speed,dt)=>Math.abs(target-value)<=speed*dt?target:value+Math.sign(target-value)*speed*dt;
  const update=(dt)=>{
    if(phase==='opening'){
      door=step(door,1,0.36,dt);
      if(door===1){phase=pendingExtension?'extending':'doorOpen';pendingExtension=false;}
    }
    else if(phase==='extending'){
      extension=step(extension,1,0.22,dt);
      if(extension===1){
        phase='mountReady';
        if(pendingInstall){
          pendingInstall=false;
          installed=true;phase=pendingRaise?'raising':'installed';
        }
        pendingRaise=false;
      }
    }
    else if(phase==='raising'){rise=step(rise,1,0.16,dt);if(rise===1)phase='high';}
    else if(phase==='rolling'){rail=step(rail,1,0.1,dt);if(rail===1)phase='forward';}
    else if(phase==='rollingBack'){rail=step(rail,0,0.13,dt);if(rail===0)phase='lowering';}
    else if(phase==='lowering'){rise=step(rise,0,0.2,dt);if(rise===0)phase='retracting';}
    else if(phase==='retracting'){extension=step(extension,0,0.26,dt);if(extension===0)phase='closing';}
    else if(phase==='closing'){door=step(door,0,0.36,dt);if(door===0){installed=false;phase='stowed';}}
    doorHinge.rotation.x=(1-door)*Math.PI/2;
    innerBeam.position.z=innerBeamRestZ+extension*extensionLength;
    connector.position.z=connectorRestZ+extension*extensionLength;
    connector.visible=extension>0.03;
    moving.rotation.x=-rise*0.75;
    carriage.position.z=rail*travel;
    const labels={stowed:'三层阶梯通向低平台；中间机械臂收纳，前端门向下盖合',opening:'前端门正在向上翻转 90°',doorOpen:'门已与低平台齐平；可伸出下方连接头',extending:'连接头正在从门下方伸出',mountReady:'连接头已就位；等待工作人员从钢琴升降台运来钻石并手动安装',installed:'已确认人工安装；等待邓紫棋登乘后抬升',raising:'中间台段、门和机械臂正作为整体抬升',high:'整体已升到最高点；可沿轨道前进',rolling:'整体正沿轨道向前移动',forward:'已到轨道最远位置',rollingBack:'整体正沿轨道返回',lowering:'中间台段、门和机械臂正整体下降',retracting:'连接头正在收回',closing:'前端门正在向下盖合'};
    status.textContent=labels[phase];
  };
  const inMechanism=(p)=>Math.abs(p.x)<width/2+0.4&&p.z>stairStart-0.4&&p.z<deckFront+doorLength+0.4&&p.y>lowH-0.3;
  document.querySelector('#diamondArmDoorBtn').addEventListener('click',()=>{
    if(phase!=='stowed')return;
    if(inMechanism(getPlayerPos())){showNotice('玩家在机械臂台段上，请先离开');return;}
    phase='opening';
  });
  document.querySelector('#diamondArmConnectorBtn').addEventListener('click',()=>{
    if(phase==='doorOpen')phase='extending';
    else if(phase==='opening')pendingExtension=true;
    else if(phase==='stowed')showNotice('请先铺平前端门');
  });
  document.querySelector('#diamondArmInstallBtn').addEventListener('click',()=>{
    if(phase==='extending'||phase==='opening'){pendingExtension=true;pendingInstall=true;return;}
    if(phase!=='mountReady')return;
    installed=true;phase=pendingRaise?'raising':'installed';pendingRaise=false;
  });
  document.querySelector('#diamondArmHighBtn').addEventListener('click',()=>{
    if(phase==='installed')phase='raising';
    else if(pendingInstall)pendingRaise=true;
    else if(phase==='mountReady')showNotice('请先确认工作人员已手动安装钻石');
    else showNotice('请依次翻开前端门、伸出连接头并确认安装');
  });
  document.querySelector('#diamondArmForwardBtn').addEventListener('click',()=>{if(phase==='high')phase='rolling';else if(phase==='installed')showNotice('请先升至最高点');});
  document.querySelector('#diamondArmInBtn').addEventListener('click',()=>{
    if(phase==='forward')phase='rollingBack';
    else if(phase==='high')phase='lowering';
    else if(phase==='installed'||phase==='mountReady')phase='retracting';
    else if(phase==='doorOpen')phase='closing';
  });
  const floorHeight=(x,z)=>{
    if(Math.abs(x)>=width/2)return null;
    if(z>=stairStart&&z<deckStart){const i=Math.floor((z-stairStart)/stepDepth);return stageH-stepDrop*(i+1);}
    if(z>=deckStart&&z<deckFront){if(Math.abs(x)<centerWidth/2&&rise>0.03)return 0;return lowH;}
    if(Math.abs(x)<centerWidth/2&&z>=deckFront&&z<deckFront+doorLength&&door>0.99&&rise<0.03&&rail<0.03)return lowH;
    return null;
  };
  update(0);
  return {update,floorHeight};
}
