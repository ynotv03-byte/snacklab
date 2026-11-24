// Schematic motion references drawn locally on a canvas. Angles are illustrative.
const p = (x,y) => [x,y];
const lerp = (a,b,t) => a+(b-a)*t;
const lineBetween = (a,b,t) => [lerp(a[0],b[0],t),lerp(a[1],b[1],t)];
const pair = (x,y) => [p(160-x,y),p(160+x,y)];
const front = ({ headY=36, neckY=52, hipY=105, elbows=pair(26,81), hands=pair(27,112),
  knees=pair(13,134),feet=pair(16,163), seated=false }={}) => ({
  head:p(160,headY), shoulders:pair(18,neckY), hips:pair(10,hipY), elbows, hands, knees, feet, front:true, seated
});
const side = ({ h,n,i,e,w,k,a }) => ({
  head:h, shoulders:[n,p(n[0]+7,n[1]-4)], hips:[i,p(i[0]+5,i[1]-3)], elbows:[e,p(e[0]+7,e[1]-3)], hands:[w,p(w[0]+7,w[1]-2)],
  knees:[k,p(k[0]+8,k[1]-3)], feet:[a,p(a[0]+9,a[1]-1)]
});

const rig = {
  bench: t => side({h:p(210,104),n:p(184,107),i:p(122,115),e:p(171-t*7,114-t*37),w:p(174-t*2,91-t*51),k:p(83,135),a:p(87,162)}),
  incline: t => side({h:p(199,69),n:p(175,80),i:p(124,120),e:p(151+t*14,93-t*40),w:p(162+t*10,73-t*50),k:p(95,130),a:p(91,163)}),
  machinePress: t => side({h:p(133,59),n:p(130,78),i:p(125,118),e:p(132+t*26,96-t*14),w:p(154+t*33,85),k:p(162,125),a:p(155,162)}),
  fly: t => {
    const arms = front({headY:90,neckY:105,hipY:136,elbows:pair(22+t*26,72+t*31),hands:pair(10+t*62,44+t*57),
      knees:pair(18,153),feet:pair(22,163)});
    return arms;
  },
  pushup: t => side({h:p(202,83+t*27),n:p(181,90+t*29),i:p(121,123+t*12),e:p(176-t*15,122+t*11),w:p(180,161),k:p(86,142+t*6),a:p(57,162)}),
  shoulder: t => front({headY:50,neckY:66,hipY:117,seated:true,elbows:pair(32-t*9,74-t*36),hands:pair(32-t*11,53-t*41),feet:pair(19,162)}),
  lateral: t => front({elbows:pair(26+24*t,83-29*t),hands:pair(27+47*t,111-58*t)}),
  face: t => side({h:p(139,43),n:p(135,60),i:p(128,107),e:p(162-18*t,64),w:p(190-41*t,60-10*t),k:p(129,136),a:p(124,162)}),
  pulldown: t => front({headY:55,neckY:72,hipY:121,seated:true,elbows:pair(29+5*t,49+54*t),hands:pair(40,22+63*t),feet:pair(18,163)}),
  row: t => side({h:p(108,70),n:p(112,86),i:p(112,130),e:p(145-42*t,102+4*t),w:p(178-41*t,113),k:p(151,130),a:p(191,151)}),
  singleRow: t => {
    const pose = side({h:p(189,77),n:p(170,94),i:p(127,107),e:p(169-30*t,120-21*t),w:p(172-35*t,146-29*t),k:p(108,128),a:p(98,162)});
    pose.elbows[1]=p(190,111);pose.hands[1]=p(204,132);pose.knees[1]=p(144,132);pose.feet[1]=p(115,145);
    return pose;
  },
  pullup: t => front({headY:62-25*t,neckY:78-25*t,hipY:123-25*t,elbows:pair(31+7*t,48+19*t),hands:pair(34,29),
    knees:pair(13,145-25*t),feet:pair(15,165-25*t)}),
  assisted: t => rig.pullup(t),
  curl: t => front({elbows:pair(23,84),hands:pair(24-9*t,110-48*t)}),
  hammer: t => side({h:p(154,35),n:p(152,55),i:p(151,108),e:p(158,81),w:p(159+13*t,109-48*t),k:p(150,134),a:p(146,163)}),
  preacher: t => side({h:p(134,59),n:p(137,78),i:p(124,119),e:p(157,101),w:p(180-23*t,118-43*t),k:p(154,125),a:p(144,163)}),
  pushdown: t => front({elbows:pair(18,84),hands:pair(13+12*t,66+44*t)}),
  overhead: t => side({h:p(161,46),n:p(157,65),i:p(154,115),e:p(163,38),w:p(166-22*t,14+47*t),k:p(151,141),a:p(153,163)}),
  dip: t => side({h:p(158+6*t,47+23*t),n:p(151+6*t,64+23*t),i:p(149+6*t,108+20*t),e:p(149-12*t,87+3*t),w:p(151,108),k:p(151,135+11*t),a:p(137,151+7*t)}),
  squat: t => side({h:p(157+17*t,36+36*t),n:p(151+12*t,54+38*t),i:p(149-22*t,100+27*t),e:p(164+11*t,68+36*t),w:p(152+12*t,52+38*t),k:p(150+21*t,131-1*t),a:p(153,161)}),
  split: t => {
    const pose=side({h:p(152+9*t,43+27*t),n:p(150+9*t,60+27*t),i:p(149+9*t,109+25*t),e:p(155+9*t,81+27*t),w:p(155+9*t,108+26*t),k:p(176+11*t,135-3*t),a:p(185,162)});
    pose.knees[1]=p(127+9*t,136+15*t);pose.feet[1]=p(111,162);
    return pose;
  },
  legPress: t => side({h:p(82,99),n:p(96,115),i:p(132,140),e:p(113,137),w:p(131,137),k:p(161+21*t,106+7*t),a:p(170+45*t,104-14*t)}),
  legExtend: t => side({h:p(126,56),n:p(129,75),i:p(132,119),e:p(132,101),w:p(143,119),k:p(172,121),a:p(171+41*t,160-34*t)}),
  legCurl: t => side({h:p(126,56),n:p(129,75),i:p(132,119),e:p(133,101),w:p(151,119),k:p(173,121),a:p(210-43*t,123+39*t)}),
  hinge: t => side({h:p(157+30*t,38+57*t),n:p(151+18*t,55+44*t),i:p(146-24*t,105-2*t),e:p(153+16*t,78+44*t),w:p(159+7*t,104+39*t),k:p(149+3*t,134),a:p(151,163)}),
  thrust: t => side({h:p(111,103-15*t),n:p(130,118-12*t),i:p(167,143-32*t),e:p(144,133-8*t),w:p(165,141-30*t),k:p(207,121-2*t),a:p(219,161)}),
  calf: t => side({h:p(156,43-10*t),n:p(151,58-10*t),i:p(145,109-10*t),e:p(146,82-10*t),w:p(148,111-10*t),k:p(149,137-10*t),a:p(151+4*t,157-11*t)}),
  plank: t => side({h:p(202,107-t*1.5),n:p(180,116-t*1.5),i:p(121,131-t*1.5),e:p(177,164),w:p(204,164),k:p(88,147),a:p(58,163)}),
  crunch: t => side({h:p(201-11*t,154-32*t),n:p(179-5*t,156-28*t),i:p(139,160),e:p(179-15*t,143-27*t),w:p(198-12*t,149-30*t),k:p(113,129),a:p(86,163)})
};

export function samplePose(motion,t) {
  return rig[motion]?.(Math.max(0,Math.min(t,1))) ?? front();
}

const gear = {
  bench:'flat', incline:'incline', machinePress:'upright', fly:'fly', shoulder:'seat', face:'cableHigh', pulldown:'cableDown',
  row:'row', singleRow:'shortBench', pullup:'pull', assisted:'assisted', preacher:'preacher', pushdown:'cableDown',
  dip:'dip', legPress:'sled', legExtend:'upright', legCurl:'upright', thrust:'hipBench', calf:'step'
};

const dumbbellKeys = new Set(['incline','fly','shoulder','lateral','singleRow','curl','hammer','preacher','overhead','split','calf']);
const bars = new Set(['bench','squat','hinge','thrust','pulldown']);
const ropes = new Set(['face','row','pushdown','pulldown']);

function path(ctx, points, color,width=4) {
  ctx.strokeStyle=color;
  ctx.lineWidth=width;
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.stroke();
}
function circle(ctx, point, radius,color) {
  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.arc(...point,radius,0,Math.PI*2);
  ctx.fill();
}
function gearFrame(ctx,motion,pose) {
  const steel='#749484', pad='#4e7463';
  const beam=(points,w=4)=>path(ctx,points,steel,w);
  const seat=(points)=>path(ctx,points,pad,10);
  switch (gear[motion]) {
    case 'flat': seat([p(106,124),p(215,124)]);beam([p(126,130),p(126,168)]);beam([p(199,130),p(199,168)]);break;
    case 'incline': seat([p(115,126),p(130,124),p(182,81)]);beam([p(128,132),p(128,168),p(183,168)]);beam([p(182,87),p(177,163)]);break;
    case 'fly': seat([p(151,100),p(151,151)]);seat([p(169,100),p(169,151)]);break;
    case 'shortBench': seat([p(112,137),p(213,137)]);beam([p(125,141),p(125,168)]);beam([p(197,141),p(197,168)]);break;
    case 'hipBench': seat([p(87,124),p(135,124)]);beam([p(97,130),p(97,168)]);beam([p(129,130),p(129,168)]);break;
    case 'upright': seat([p(117,70),p(117,123),p(167,123)]);beam([p(133,128),p(133,168)]);
      if (motion!=='machinePress') beam([p(170,123),pose.feet[0]],4);
      else beam([p(118,155),p(109,52),p(200,52),p(202,155)],4);
      break;
    case 'preacher': seat([p(108,124),p(150,124)]);seat([p(136,82),p(163,104)]);beam([p(120,131),p(120,168),p(165,168),p(151,101)]);break;
    case 'seat': seat([p(142,123),p(179,123)]);beam([p(160,132),p(160,168)]);break;
    case 'cableDown':
    case 'cableHigh': {
      const hook=gear[motion]==='cableHigh'?p(224,53):p(160,13);
      beam([p(224,168),p(224,14),p(107,14)],4);
      path(ctx,[hook,lineBetween(pose.hands[0],pose.hands[1],.5)],'#a25234',2);
      if (motion==='pulldown') {seat([p(143,128),p(178,128)]);beam([p(160,138),p(160,168)]);}
      break;
    }
    case 'row': seat([p(90,137),p(138,137)]);beam([p(107,143),p(107,166),p(230,166),p(231,108)]);
      path(ctx,[p(227,113),pose.hands[0]],'#a25234',2);beam([p(185,152),p(203,139)],8);break;
    case 'pull':
    case 'assisted':
      beam([p(106,168),p(106,29),p(214,29),p(214,168)],5);
      if (motion==='assisted') seat([p(140,pose.knees[0][1]+7),p(180,pose.knees[1][1]+7)]);
      break;
    case 'dip': beam([p(128,168),p(130,111),p(186,111)],6);beam([p(171,168),p(171,108),p(220,108)],4);break;
    case 'sled': beam([p(112,163),p(243,67)],9);seat([p(72,106),p(130,148),p(155,148)]);
      seat([p(pose.feet[0][0]+6,pose.feet[0][1]-19),p(pose.feet[0][0]+12,pose.feet[0][1]+14)]);break;
    case 'step':seat([p(152,162),p(183,162)]);break;
  }
}
function drawBody(ctx, pose) {
  const skin='#b67758', shorts='#425d56', shirt='#235747', outline='#1b4337', shoe='#242f2a';
  const {head,shoulders,hips,elbows,hands,knees,feet,front:isFront}=pose;
  path(ctx,[hips[1],knees[1],feet[1]],'#537968',7);
  path(ctx,[hips[0],knees[0]],shorts,12);
  path(ctx,[knees[0],feet[0]],skin,8);
  if (isFront) {
    path(ctx,[hips[1],knees[1]],shorts,12);
    path(ctx,[knees[1],feet[1]],skin,8);
  }
  for (const foot of [...feet].reverse()) path(ctx,[p(foot[0]-5,foot[1]),p(foot[0]+8,foot[1])],shoe,6);
  const torso = lineBetween(shoulders[0],shoulders[1],.5);
  const waist = lineBetween(hips[0],hips[1],.5);
  path(ctx,[shoulders[1],elbows[1],hands[1]],isFront?skin:'#926249',7);
  path(ctx,[torso,waist],shirt,isFront?26:19);
  if (isFront) path(ctx,shoulders,shirt,12);
  path(ctx,[head,torso],skin,7);
  circle(ctx,head,11,skin);
  path(ctx,[p(head[0]-8,head[1]-6),p(head[0],head[1]-9),p(head[0]+7,head[1]-5)],outline,5);
  path(ctx,[shoulders[0],elbows[0],hands[0]],skin,7);
  for (const hand of hands) circle(ctx,hand,4,skin);
}

export function drawExercise(canvas,motion,phase=0) {
  const ctx=canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(canvas.width/320,0,0,canvas.height/184,0,0);
  const back=ctx.createLinearGradient(0,0,320,184);
  back.addColorStop(0,'#f4efe4');back.addColorStop(1,'#e1ebd8');
  ctx.fillStyle=back;ctx.fillRect(0,0,320,184);
  circle(ctx,p(266,43),30,'#ebedda');
  path(ctx,[p(18,168),p(301,168)],'#9aaf99',1);
  const pose=samplePose(motion,phase);
  gearFrame(ctx,motion,pose);
  drawBody(ctx,pose);
  if (dumbbellKeys.has(motion)) {
    for (const hand of motion==='overhead'||motion==='singleRow' ? [pose.hands[0]] : pose.hands) {
      const [x,y]=hand;
      path(ctx,[p(x-6,y),p(x+6,y)],'#574237',4);
      path(ctx,[p(x-6,y-4),p(x-6,y+4)],'#985437',4);
      path(ctx,[p(x+6,y-4),p(x+6,y+4)],'#985437',4);
    }
  }
  if (bars.has(motion)) {
    const [x,y]=pose.hands[0];
    if (motion==='pulldown') path(ctx,[p(108,y),p(212,y)],'#574237',4);
    else {
      path(ctx,[p(x-15,y),p(x+15,y)],'#574237',4);
      circle(ctx,p(x-11,y),5,'#985437');
      circle(ctx,p(x+10,y),5,'#985437');
    }
  }
  if (ropes.has(motion) && motion!=='pulldown') {
    path(ctx,pose.hands,'#574237',4);
  }
}
