import * as THREE from 'three';
import bayPanoramaUrl from '../assets/marina-bay-night-panorama.jpg';
import cityPanoramaUrl from '../assets/marina-bay-city-panorama.jpg';
import sandsFrontalUrl from '../assets/marina-bay-sands-frontal-night.jpg';

const routeSegments=[[[83,34],[110,46]],[[110,46],[150,80]]];
export function isMerlionRoute(x,z){
  if(x>=140.5&&x<=179.5&&z>=54&&z<=132)return true;
  return routeSegments.some(([a,b])=>{
    const dx=b[0]-a[0],dz=b[1]-a[1];
    const t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
    return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<5.8;
  });
}

export function createMerlionPark(scene){
  const pavingCanvas=document.createElement('canvas');
  pavingCanvas.width=pavingCanvas.height=512;
  const ctx=pavingCanvas.getContext('2d');
  ctx.fillStyle='#777980';ctx.fillRect(0,0,512,512);
  let seed=71;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<3600;i++){
    const shade=Math.round(95+random()*65);
    ctx.fillStyle=`rgba(${shade},${shade},${shade+2},0.16)`;
    ctx.fillRect(random()*512,random()*512,1+random()*4,1+random()*4);
  }
  ctx.strokeStyle='rgba(27,29,34,0.35)';ctx.lineWidth=2;
  for(let y=0;y<=512;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke();}
  for(let row=0;row<8;row++)for(let x=(row%2)*32;x<=512;x+=64){ctx.beginPath();ctx.moveTo(x,row*64);ctx.lineTo(x,(row+1)*64);ctx.stroke();}
  const pavingTexture=new THREE.CanvasTexture(pavingCanvas);
  pavingTexture.colorSpace=THREE.SRGBColorSpace;
  pavingTexture.wrapS=pavingTexture.wrapT=THREE.RepeatWrapping;
  pavingTexture.repeat.set(6,6);
  pavingTexture.anisotropy=4;
  const paving=new THREE.MeshStandardMaterial({map:pavingTexture,roughness:0.94,side:THREE.DoubleSide});
  const addPavement=(a,b,width)=>{
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),px=-dz/length*width/2,pz=dx/length*width/2;
    const vertices=[a[0]-px,0.07,a[1]-pz,a[0]+px,0.07,a[1]+pz,b[0]-px,0.07,b[1]-pz,b[0]+px,0.07,b[1]+pz];
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,length/width,1,length/width],2));
    geo.setIndex([0,1,2,1,3,2]);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,paving);mesh.receiveShadow=true;scene.add(mesh);
  };
  for(const [a,b] of routeSegments)addPavement(a,b,12);
  const plaza=new THREE.Mesh(new THREE.PlaneGeometry(39,78),paving);
  plaza.rotation.x=-Math.PI/2;plaza.position.set(160,0.075,93);plaza.receiveShadow=true;scene.add(plaza);
  // Close the exposed outer edge between the ground-level promenade and B1.
  const foundation=new THREE.Mesh(
    new THREE.BoxGeometry(0.4,4.2,78),
    new THREE.MeshStandardMaterial({color:0x222a34,roughness:1})
  );
  foundation.position.set(179.6,-2.1,93);scene.add(foundation);
  const railMat=new THREE.MeshStandardMaterial({color:0xa8a9a6,roughness:0.4,metalness:0.72});
  const beam=(a,b,radius)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),8),railMat);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());scene.add(mesh);
  };
  for(let z=54;z<=132;z+=6)beam([179,0.1,z],[179,3.1,z],0.075);
  for(const y of [1.35,3.1])beam([179,y,54],[179,y,132],0.065);
  // Broad real-photo panoramas wrap the horizon; the nearer stadium masks the rear.
  const loadImage=(url)=>new Promise((resolve,reject)=>{
    const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;
  });
  Promise.all([loadImage(bayPanoramaUrl),loadImage(cityPanoramaUrl),loadImage(sandsFrontalUrl)]).then(([bay,city,sands])=>{
    const panorama=document.createElement('canvas');panorama.width=8192;panorama.height=1400;
    const pctx=panorama.getContext('2d');
    pctx.fillStyle='#080d1b';pctx.fillRect(0,0,8192,1400);
    const frontStart=2314,frontWidth=4950,rearWidth=8192-frontWidth,blend=350;
    // Crop the city image past its Marina Bay Sands view, avoiding a duplicate hotel.
    // The panorama is seen from inside, so source pixels left of the blue-logo
    // tower appear to its right on screen, behind the stadium seating.
    const rearCropX=city.width*0.21,rearCropW=city.width-rearCropX;
    const rearStart=frontStart+frontWidth-blend,rearSpan=rearWidth+2*blend;
    const cityKeepSourceX=2475;
    const cityKeepOffset=(cityKeepSourceX-rearCropX)/rearCropW*rearSpan;
    const cityKeepWidth=(city.width-cityKeepSourceX)/rearCropW*rearSpan;
    const drawRear=(x)=>pctx.drawImage(city,cityKeepSourceX,0,city.width-cityKeepSourceX,city.height,x+cityKeepOffset,110,cityKeepWidth,1400);
    drawRear(rearStart);drawRear(rearStart-8192);
    const front=document.createElement('canvas');front.width=frontWidth;front.height=1400;
    const fctx=front.getContext('2d');
    fctx.drawImage(bay,0,0,frontWidth,1400);
    // The hotel in the wide panorama was photographed obliquely. Replace only
    // that landmark with a frontal photo, preserving its aspect ratio and
    // fading every edge into the surrounding 360-degree night view.
    const hotelPatch=document.createElement('canvas');hotelPatch.width=1400;hotelPatch.height=800;
    const hctx=hotelPatch.getContext('2d');
    hctx.drawImage(sands,sands.width*50/1280,0,sands.width*982/1280,sands.height,0,0,1400,800);
    const surroundingSky=fctx.getImageData(0,320,1400,800).data;
    const pixels=hctx.getImageData(0,0,1400,800);
    for(let x=0;x<1400;x++){
      const sideFade=Math.min(1,x/210,(1400-x)/210);
      for(let y=0;y<800;y++){
        const index=(y*1400+x)*4;
        const roofY=143+(x-255)*42/785;
        const aboveRoof=y<roofY-8;
        const outsideHotel=(x<375||x>1055)&&y>220&&y<450;
        const betweenTowers=((x>540&&x<645)||(x>785&&x<880))&&y>210&&y<550;
        if(aboveRoof||outsideHotel||betweenTowers){
          const skyIndex=(y*1400+Math.floor(x*0.9))*4;
          pixels.data[index]=surroundingSky[skyIndex];
          pixels.data[index+1]=surroundingSky[skyIndex+1];
          pixels.data[index+2]=surroundingSky[skyIndex+2];
        }
        const topFade=THREE.MathUtils.clamp(y/48,0,1);
        const bottomFade=THREE.MathUtils.clamp((800-y)/120,0,1);
        pixels.data[index+3]*=sideFade*topFade*bottomFade;
      }
    }
    hctx.putImageData(pixels,0,0);
    fctx.drawImage(hotelPatch,1136,320);
    fctx.globalCompositeOperation='destination-in';
    const fade=fctx.createLinearGradient(0,0,frontWidth,0);
    fade.addColorStop(0,'rgba(255,255,255,0)');
    fade.addColorStop(0.07,'rgba(255,255,255,1)');
    fade.addColorStop(0.93,'rgba(255,255,255,1)');
    fade.addColorStop(1,'rgba(255,255,255,0)');
    fctx.fillStyle=fade;fctx.fillRect(0,0,frontWidth,1400);
    // Remove the dark tail of the city photo before placing the Gardens
    // panorama over it, so this mask cannot erase the Gardens edge.
    const cityTailStart=2110,cityTailEnd=2670;
    const cityTailIn=pctx.createLinearGradient(cityTailStart,0,cityTailStart+100,0);
    cityTailIn.addColorStop(0,'rgba(0,0,0,0)');
    cityTailIn.addColorStop(1,'rgba(0,0,0,1)');
    pctx.fillStyle=cityTailIn;pctx.fillRect(cityTailStart,0,100,980);
    pctx.fillStyle='#000000';pctx.fillRect(cityTailStart+100,0,cityTailEnd-cityTailStart-100,980);
    const cityTailOut=pctx.createLinearGradient(cityTailEnd,0,cityTailEnd+100,0);
    cityTailOut.addColorStop(0,'rgba(0,0,0,1)');
    cityTailOut.addColorStop(1,'rgba(0,0,0,0)');
    pctx.fillStyle=cityTailOut;pctx.fillRect(cityTailEnd,0,100,980);
    pctx.drawImage(front,frontStart,0);
    // Hide the photographed skyline on the visual left of Marina Bay Sands,
    // following the hotel's lower mall so the landmark remains intact.
    const hotelLeftEdge=frontStart+2210;
    const leftVistaEnd=rearStart+700;
    for(let y=0;y<1400;y++){
      const edge=hotelLeftEdge+325*THREE.MathUtils.smoothstep(y,470,1030);
      const leftFade=pctx.createLinearGradient(edge-20,0,edge+20,0);
      leftFade.addColorStop(0,'rgba(0,0,0,0)');
      leftFade.addColorStop(1,'rgba(0,0,0,1)');
      pctx.fillStyle=leftFade;pctx.fillRect(edge-20,y,40,1);
      pctx.fillStyle='#000000';pctx.fillRect(edge+20,y,leftVistaEnd-160-edge-20,1);
    }
    const returnFade=pctx.createLinearGradient(leftVistaEnd-160,0,leftVistaEnd,0);
    returnFade.addColorStop(0,'rgba(0,0,0,1)');
    returnFade.addColorStop(1,'rgba(0,0,0,0)');
    pctx.fillStyle=returnFade;pctx.fillRect(leftVistaEnd-160,0,160,1400);
    // Turn the photographed dusk sky into a black concert-night sky while
    // retaining the lit architecture.
    const night=pctx.getImageData(0,0,8192,980);
    const px=night.data;
    const stride=8192*4;
    for(let y=0;y<980;y++)for(let x=0;x<8192;x++){
      const i=y*stride+x*4,r=px[i],g=px[i+1],b=px[i+2];
      const max=Math.max(r,g,b),min=Math.min(r,g,b);
      if(b<r*0.8||b<g*0.8||max>238||max-min>105)continue;
      if(y<980){
        px[i]=px[i+1]=px[i+2]=0;
      }
    }
    pctx.putImageData(night,0,0);
    // Clear isolated lights from the source photo above the hotel's roof.
    // The replacement roof starts below y=460 in this panorama.
    pctx.fillStyle='#000000';
    pctx.fillRect(frontStart+1050,0,1650,445);
    // A few original roof lights sit just beyond the replacement's right tip.
    pctx.fillRect(frontStart+850,0,570,560);
    // Two source-photo reflections remain between the hotel support and
    // ArtScience Museum. Remove only those small sky patches.
    pctx.fillRect(3809,758,21,20);
    pctx.fillRect(3658,814,21,25);
    const skyFade=pctx.createLinearGradient(0,0,0,220);
    skyFade.addColorStop(0,'rgba(0,0,0,1)');
    skyFade.addColorStop(0.55,'rgba(0,0,0,0.65)');
    skyFade.addColorStop(1,'rgba(0,0,0,0)');
    pctx.fillStyle=skyFade;pctx.fillRect(0,0,8192,220);
    // The source panoramas include photographed water below the waterfront.
    // Keep the buildings and quays, then make the entire lower 360-degree band black.
    pctx.fillStyle='#000000';
    pctx.fillRect(0,980,8192,420);
    // The frontal hotel photo reaches the water a little above the wide view.
    pctx.fillRect(frontStart+1136+190,955,1020,25);
    const texture=new THREE.CanvasTexture(panorama);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=THREE.RepeatWrapping;
    // Keep buildings at their original vertical scale and extend the top-row
    // night sky upward so looking around never exposes the cylinder's rim.
    texture.repeat.set(1,650/233);
    texture.anisotropy=4;
    const backdrop=new THREE.Mesh(
      new THREE.CylinderGeometry(350,350,650,128,1,true),
      new THREE.MeshBasicMaterial({map:texture,toneMapped:false,fog:false,side:THREE.BackSide})
    );
    backdrop.position.set(160,255,93);
    backdrop.rotation.y=-Math.PI/2;
    backdrop.visible=!scene.userData.panoramaHidden;
    scene.userData.panoramaBackdrop=backdrop;
    scene.add(backdrop);
  }).catch(error=>console.error('Unable to load Marina Bay panorama',error));
  for(const z of [69,116]){
    const lamp=new THREE.PointLight(0xffe7ba,11,21);lamp.position.set(165,5.5,z);scene.add(lamp);
  }
}
