const ROWS=20,COLS=20;
const menu=document.getElementById("menu"),game=document.getElementById("game"),
boardEl=document.getElementById("board"),scoreEl=document.getElementById("score"),
bestScoreEl=document.getElementById("bestScore"),livesEl=document.getElementById("lives"),
levelEl=document.getElementById("level"),overlay=document.getElementById("overlay"),
overlayTitle=document.getElementById("overlayTitle"),overlayMsg=document.getElementById("overlayMsg"),
retryBtn=document.getElementById("retryBtn"),menuOverlayBtn=document.getElementById("menuOverlayBtn");
const saveBtn=document.getElementById("saveBtn"),restartBtn=document.getElementById("restartBtn"),
resetBtn=document.getElementById("resetBtn"),menuBtn=document.getElementById("menuBtn"),
pauseBtn=document.getElementById("pauseBtn"),resumeBtn=document.getElementById("resumeBtn");
const joystickWrap=document.getElementById("joystickWrap"),joystickBase=document.getElementById("joystickBase"),
joystickStick=document.getElementById("joystickStick");

let layout=[],cells=[],pacPos=0,score=0,lives=3,level=1,collectedDots=0,totalDots=0;
let ghosts=[],ghostTimer=null,ghostSpeed=700,paused=false,mode="easy";
const ghostColors=["red","blue","green","purple","orange","cyan","pink","gray"];
let moveInterval=null,currentDirection=null,inputLock=false;

document.getElementById("easyBtn").onclick=()=>startGame("easy");
document.getElementById("hardBtn").onclick=()=>startGame("hard");
function updateBest(){const b=localStorage.getItem("kq_best")||0;bestScoreEl.textContent=`🏆 Best Score: ${b}`;}
updateBest();

function startGame(selected){
  mode=selected;ghostSpeed=mode==="easy"?700:400;
  overlay.classList.add("hidden");menu.classList.add("hidden");game.classList.remove("hidden");
  joystickWrap.classList.remove("hidden");initGame();
}
function initGame(){
  clearInterval(ghostTimer);
  score=0;lives=3;level=1;collectedDots=0;
  scoreEl.textContent=score;updateLives();levelEl.textContent=`Level: ${level}`;
  buildLayout();renderBoard();placePacAndGhosts();
  paused=false;ghostTimer=setInterval(moveGhosts,ghostSpeed);
  setupJoystick();
}

/* =============== HARDER OBSTACLE BUILDER =============== */
function buildLayout(){
  layout=Array(ROWS*COLS).fill(0);

  // outer walls
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const i=r*COLS+c;
    if(r===0||c===0||r===ROWS-1||c===COLS-1)layout[i]=1;
  }

  // generate a maze-like pattern
  // fill every other row/column with random walls to form corridors
  for(let r=2;r<ROWS-2;r+=2){
    for(let c=2;c<COLS-2;c+=2){
      const i=r*COLS+c;
      if(Math.random()<0.8)layout[i]=1; // make core walls
      // connect to a random neighbor to create branches
      if(Math.random()<0.7){
        const dir=[[0,1],[0,-1],[1,0],[-1,0]][Math.floor(Math.random()*4)];
        const rr=r+dir[0],cc=c+dir[1];
        if(rr>0&&cc>0&&rr<ROWS-1&&cc<COLS-1)layout[rr*COLS+cc]=1;
      }
    }
  }

  // Clear a few random paths to keep solvable
  for(let i=0;i<40;i++){
    const idx=Math.floor(Math.random()*layout.length);
    if(layout[idx]===1)layout[idx]=0;
  }

  // avoid spawn & center areas
  [COLS+1,COLS*10+10,COLS*5+5,COLS*15+15].forEach(i=>layout[i]=0);

  // mark remaining empty spaces as dots
  layout.forEach((v,i)=>{if(v===0)layout[i]=2;});
  totalDots=layout.filter(x=>x===2).length;
}

/* =========================================== */
function renderBoard(){
  boardEl.innerHTML="";cells=[];
  layout.forEach(v=>{
    const cell=document.createElement("div");
    cell.classList.add("cell");
    if(v===1)cell.classList.add("wall");
    else if(v===2){const dot=document.createElement("div");dot.className="dot";cell.appendChild(dot);}
    boardEl.appendChild(cell);cells.push(cell);
  });
}
function placePacAndGhosts(){
  pacPos=COLS+1;const count=mode==="easy"?5:8;
  ghosts=[];for(let i=0;i<count;i++)ghosts.push({pos:COLS*(5+i)+(5+(i%5)),color:ghostColors[i%ghostColors.length]});
  draw();
}
function draw(){
  boardEl.querySelectorAll(".pac,.ghost").forEach(n=>n.remove());
  const p=document.createElement("div");p.className="pac";p.textContent="😋";cells[pacPos].appendChild(p);
  ghosts.forEach(g=>{const gh=document.createElement("div");gh.className="ghost "+g.color;gh.textContent="👻";cells[g.pos].appendChild(gh);});
}
function movePac(key){
  if(paused)return;
  let newPos=pacPos;
  if(key==="ArrowLeft")newPos--;
  else if(key==="ArrowRight")newPos++;
  else if(key==="ArrowUp")newPos-=COLS;
  else if(key==="ArrowDown")newPos+=COLS;
  if(!cells[newPos]||layout[newPos]===1)return;
  pacPos=newPos;
  if(layout[pacPos]===2){layout[pacPos]=0;const d=cells[pacPos].querySelector(".dot");if(d)d.remove();score+=10;collectedDots++;scoreEl.textContent=score;checkProgress();}
  if(ghosts.some(g=>g.pos===pacPos))loseLife();
  draw();
}
function moveGhosts(){
  if(paused)return;
  ghosts.forEach(g=>{
    const dirs=[-1,1,-COLS,COLS];
    const np=g.pos+dirs[Math.floor(Math.random()*4)];
    if(!cells[np]||layout[np]===1)return;
    g.pos=np;
  });
  if(ghosts.some(g=>g.pos===pacPos))loseLife();
  draw();
}
function loseLife(){lives--;updateLives();if(lives<=0)return endGame();pacPos=COLS+1;}
function updateLives(){livesEl.innerHTML="❤️ ".repeat(lives);}
function checkProgress(){
  if(collectedDots>=totalDots){level++;ghostSpeed=Math.max(150,ghostSpeed-100);
    clearInterval(ghostTimer);ghostTimer=setInterval(moveGhosts,ghostSpeed);
    buildLayout();renderBoard();placePacAndGhosts();collectedDots=0;score+=500;levelEl.textContent=`Level: ${level}`;}
}
function endGame(){
  clearInterval(ghostTimer);
  const best=localStorage.getItem("kq_best")||0;
  if(score>best)localStorage.setItem("kq_best",score);
  updateBest();overlay.classList.remove("hidden");
  overlayTitle.textContent="Game Over!";overlayMsg.textContent=`Your score: ${score}`;
  retryBtn.onclick=()=>startGame(mode);menuOverlayBtn.onclick=goToMenu;
}

/* JOYSTICK with FIXES */
function setupJoystick(){
  const baseRect=()=>joystickBase.getBoundingClientRect();const maxDist=45;
  let active=null;let origin={x:0,y:0};
  function start(x,y,id){if(active)return;active=id||"touch";const r=baseRect();origin={x:r.left+r.width/2,y:r.top+r.height/2};update(x,y);}
  function move(x,y){if(!active)return;update(x,y);}
  function end(){active=null;joystickStick.style.transform="translate(0,0)";stopMove();currentDirection=null;}
  function update(x,y){
    const dx=x-origin.x,dy=y-origin.y;const dist=Math.sqrt(dx*dx+dy*dy);
    const lim=Math.min(dist,maxDist);const nx=dx/(dist||1),ny=dy/(dist||1);
    joystickStick.style.transform=`translate(${nx*lim}px,${ny*lim}px)`;
    if(dist<12){stopMove();currentDirection=null;return;}
    const dir=Math.abs(dx)>Math.abs(dy)?(dx>0?"ArrowRight":"ArrowLeft"):(dy>0?"ArrowDown":"ArrowUp");
    if(dir!==currentDirection){currentDirection=dir;startMove(dir);}
  }
  function startMove(k){stopMove();inputLock=true;movePac(k);moveInterval=setInterval(()=>movePac(k),150);}
  function stopMove(){clearInterval(moveInterval);moveInterval=null;setTimeout(()=>inputLock=false,120);}
  joystickBase.addEventListener("touchstart",e=>{const t=e.touches[0];start(t.clientX,t.clientY,t.identifier);},{passive:true});
  joystickBase.addEventListener("touchmove",e=>{const t=e.touches[0];move(t.clientX,t.clientY);},{passive:true});
  joystickBase.addEventListener("touchend",()=>end(),{passive:true});
  joystickBase.addEventListener("touchcancel",()=>end(),{passive:true});
  joystickBase.addEventListener("pointerdown",e=>start(e.clientX,e.clientY,e.pointerId));
  joystickBase.addEventListener("pointermove",e=>{if(e.pointerId===active)move(e.clientX,e.clientY);});
  joystickBase.addEventListener("pointerup",e=>{if(e.pointerId===active)end();});
}
document.addEventListener("keydown",e=>{
  const keys=["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"];
  if(!keys.includes(e.key))return;if(inputLock)return;
  e.preventDefault();movePac(e.key);
});

/* BUTTONS */
saveBtn.onclick=()=>{localStorage.setItem("kq_save",JSON.stringify({score,level,lives,mode}));alert("Game saved!");};
restartBtn.onclick=()=>{clearInterval(ghostTimer);buildLayout();renderBoard();placePacAndGhosts();collectedDots=0;ghostTimer=setInterval(moveGhosts,ghostSpeed);};
resetBtn.onclick=()=>{localStorage.clear();alert("All data cleared!");goToMenu();};
menuBtn.onclick=goToMenu;
pauseBtn.onclick=()=>{paused=true;pauseBtn.classList.add("hidden");resumeBtn.classList.remove("hidden");};
resumeBtn.onclick=()=>{paused=false;resumeBtn.classList.add("hidden");pauseBtn.classList.remove("hidden");};
function goToMenu(){clearInterval(ghostTimer);game.classList.add("hidden");menu.classList.remove("hidden");overlay.classList.add("hidden");joystickWrap.classList.add("hidden");updateBest();}
