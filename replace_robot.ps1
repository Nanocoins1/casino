$filePath = "C:\Users\PC\casino\public\index.html"
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

$startMarker = "function RobotHero()"
$endMarker = "function App(){"

$startIdx = $content.IndexOf($startMarker)
$endIdx = $content.IndexOf($endMarker)

if ($startIdx -lt 0) { Write-Error "Could not find 'function RobotHero()'"; exit 1 }
if ($endIdx -lt 0) { Write-Error "Could not find 'function App(){'"; exit 1 }

Write-Host "Found 'function RobotHero()' at index: $startIdx"
Write-Host "Found 'function App(){' at index: $endIdx"

$newComponent = @'
function RobotHero() {
  const mountRef = React.useRef(null);
  React.useEffect(()=>{
    if(!mountRef.current || typeof THREE==='undefined') return;
    const W=260,H=360;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(45,W/H,0.1,100);
    camera.position.set(0,0.5,5.5); camera.lookAt(0,0,0);
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
    renderer.setSize(W,H); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    mountRef.current.appendChild(renderer.domElement);
    const gold=new THREE.MeshStandardMaterial({color:0xc9a84c,metalness:0.95,roughness:0.15});
    const goldB=new THREE.MeshStandardMaterial({color:0xf0c060,metalness:0.9,roughness:0.1});
    const dark=new THREE.MeshStandardMaterial({color:0x080602,metalness:0.8,roughness:0.3});
    const visor=new THREE.MeshStandardMaterial({color:0x001133,metalness:0.9,roughness:0.05,emissive:new THREE.Color(0x0044cc),emissiveIntensity:0.7});
    const emit=new THREE.MeshStandardMaterial({color:0xffd700,metalness:0.8,roughness:0.1,emissive:new THREE.Color(0xffaa00),emissiveIntensity:0.5});
    const B=(w,h,d,m,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);return mesh;};
    const C=(rt,rb,h,m,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,20),m);mesh.position.set(x,y,z);return mesh;};
    const S=(r,m,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),m);mesh.position.set(x,y,z);return mesh;};
    const robot=new THREE.Group(); scene.add(robot);
    const head=new THREE.Group(); head.position.y=1.75; robot.add(head);
    head.add(B(0.72,0.68,0.68,gold)); head.add(B(0.54,0.16,0.05,visor,0,0.05,0.35));
    head.add(B(0.56,0.18,0.03,emit,0,0.05,0.33));
    head.add(C(0.025,0.03,0.22,gold,0,0.45,0)); head.add(S(0.045,emit,0,0.57,0));
    [-0.4,0.4].forEach(function(x){var e=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.07,16),emit);e.rotation.z=Math.PI/2;e.position.set(x,0,0);head.add(e);});
    robot.add(C(0.11,0.14,0.18,dark,0,1.3,0));
    const torso=new THREE.Group(); torso.position.y=0.45; robot.add(torso);
    torso.add(B(0.92,1.08,0.54,gold)); torso.add(B(0.42,0.34,0.06,dark,0,0.12,0.28));
    torso.add(B(0.38,0.30,0.04,emit,0,0.12,0.30)); torso.add(B(0.28,0.18,0.06,dark,0,-0.22,0.28));
    [-0.52,0.52].forEach(function(x){torso.add(S(0.165,goldB,x,0.44,0));});
    [-1,1].forEach(function(side){
      var arm=new THREE.Group(); arm.position.set(side*0.67,0.36,0); torso.add(arm);
      arm.add(C(0.12,0.10,0.52,gold,0,-0.26,0)); arm.add(S(0.115,goldB,0,-0.53,0));
      arm.add(C(0.095,0.085,0.42,gold,0,-0.77,0)); arm.add(S(0.095,emit,0,-1.0,0));
      arm.add(C(0.105,0.105,0.055,emit,0,-0.13,0));
    });
    robot.add(B(0.76,0.19,0.48,dark,0,-0.13,0));
    [-0.235,0.235].forEach(function(x){
      var leg=new THREE.Group(); leg.position.set(x,-0.38,0); robot.add(leg);
      leg.add(C(0.15,0.13,0.62,gold,0,-0.31,0)); leg.add(S(0.145,goldB,0,-0.63,0));
      leg.add(C(0.115,0.095,0.58,gold,0,-0.95,0));
      leg.add(B(0.22,0.11,0.40,dark,0,-1.3,0.06));
      leg.add(B(0.18,0.07,0.055,emit,0,-1.3,-0.14));
      leg.add(C(0.16,0.16,0.05,emit,0,-0.63,0));
    });
    var plat=new THREE.Mesh(new THREE.CylinderGeometry(0.85,1.05,0.07,32),new THREE.MeshStandardMaterial({color:0x1a1200,metalness:0.9,roughness:0.3}));
    plat.position.y=-2.2; scene.add(plat);
    var ring=new THREE.Mesh(new THREE.TorusGeometry(0.95,0.022,8,32),emit);
    ring.position.y=-2.18; ring.rotation.x=Math.PI/2; scene.add(ring);
    var coins=[]; var coinMat=new THREE.MeshStandardMaterial({color:0xffd700,metalness:0.9,roughness:0.1,emissive:new THREE.Color(0xffaa00),emissiveIntensity:0.3});
    for(var i=0;i<20;i++){
      var c=new THREE.Mesh(new THREE.CylinderGeometry(0.065,0.065,0.014,12),coinMat);
      c.position.set((Math.random()-0.5)*3.2,Math.random()*5-2.5,(Math.random()-0.5)*2-0.5);
      c.rotation.set(Math.random()*Math.PI,0,Math.random()*Math.PI);
      c.userData={vy:0.008+Math.random()*0.013,vr:0.025+Math.random()*0.04,ox:(Math.random()-0.5)*3.2,oz:(Math.random()-0.5)*2-0.5};
      coins.push(c); scene.add(c);
    }
    scene.add(new THREE.AmbientLight(0x221100,0.9));
    var key=new THREE.DirectionalLight(0xfff5e0,2.5); key.position.set(3,5,4); scene.add(key);
    var glow=new THREE.PointLight(0xffd700,4,8); glow.position.set(0,1,3); scene.add(glow);
    var rim=new THREE.PointLight(0x7b3ff2,2,6); rim.position.set(-3,0,-2); scene.add(rim);
    scene.add(new THREE.PointLight(0xffa500,1.5,5)).position.set(0,-3,2);
    var raf,t=0;
    var animate=function(){
      raf=requestAnimationFrame(animate); t+=0.008;
      robot.rotation.y=t*0.4; robot.position.y=Math.sin(t*1.2)*0.08;
      head.rotation.y=Math.sin(t*0.7)*0.12;
      torso.children.forEach(function(ch){if(ch.isGroup){var s=ch.position.x>0?1:-1;ch.rotation.z=Math.sin(t+s*Math.PI)*0.07;}});
      coins.forEach(function(c){c.position.y+=c.userData.vy;c.rotation.y+=c.userData.vr;c.rotation.x+=c.userData.vr*0.5;if(c.position.y>3){c.position.y=-2.5;c.position.x=c.userData.ox+(Math.random()-0.5)*0.4;c.position.z=c.userData.oz;}});
      glow.intensity=3.5+Math.sin(t*3)*0.8;
      renderer.render(scene,camera);
    };
    animate();
    return function(){cancelAnimationFrame(raf);renderer.dispose();if(mountRef.current&&renderer.domElement.parentNode===mountRef.current)mountRef.current.removeChild(renderer.domElement);};
  },[]);
  return React.createElement('div',{ref:mountRef,style:{width:'260px',height:'360px',flexShrink:0,borderRadius:'16px',overflow:'hidden',position:'relative',zIndex:2}});
}

'@

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)
$newContent = $before + $newComponent + $after

[System.IO.File]::WriteAllText($filePath, $newContent, [System.Text.Encoding]::UTF8)

$fileInfo = Get-Item $filePath
Write-Host "SUCCESS: File written. Size: $($fileInfo.Length) bytes"
Write-Host "New 'function RobotHero()' starts at index: $startIdx"
Write-Host "Preserved 'function App(){' at new index: $($before.Length + $newComponent.Length)"
