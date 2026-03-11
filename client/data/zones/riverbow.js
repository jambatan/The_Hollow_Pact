export default { id:"riverbow", name:"Riverbow Campsite", width:40, height:40, tileSize:16, ambientLight:0.9, music:"outdoor_theme", spawnPoint:{x:20*16,y:35*16},
layers: [
{ name:"ground", data: (()=>{
    const W=40, H=40, GRASS=1, DIRT=2, WATER=5, SAND=6, PATH=9;
    const d = new Array(W*H).fill(GRASS);
    const rect = (x,y,w,h,t) => { for(let i=y;i<y+h;i++) for(let j=x;j<x+w;j++) if(j>=0&&j<W&&i>=0&&i<H) d[i*W+j]=t; };
    rect(33,0,7,40,WATER); // River along east
    rect(30,0,3,40,SAND);  // Riverbank
    rect(19,25,2,15,PATH);  // Path from south
    rect(18,22,4,4,DIRT);  // Central campfire area
    rect(5,5,15,15,DIRT);  // Bandit area (NW)
    return d;
})() },
{ name:"objects", data: (()=>{
    const W=40, H=40, TREE=12, BUSH=14, CAMPFIRE=27, BARREL=28, BED=30;
    const d = new Array(W*H).fill(0);
    const set = (x,y,v) => { if(x>=0&&x<W&&y>=0&&y<H) d[y*W+x]=v; };
    // Border trees (deterministic)
    for(let i=0; i<30; i+=3) { set(1,i,TREE); set(i,1,TREE); }
    for(let i=0; i<30; i+=4) { set(2,i,BUSH); set(i,2,BUSH); }
    // Campfire + camp beds
    set(20,23,CAMPFIRE);
    set(25,18,BED); set(26,18,BED);
    set(18,22,BED);
    set(22,27,BED); set(23,27,BED);
    // Bandit hideout
    set(7,7,BARREL); set(8,7,BARREL); set(7,8,BARREL);
    set(12,12,BED); set(9,6,BARREL); set(13,9,BARREL);
    set(14,8,TREE);
    return d;
})() },
{ name:"roof", data: new Array(40*40).fill(0) }
],
transitions: [ {id:"exit_south",rect:{x:19*16,y:39*16,w:2*16,h:16},toZone:"world_map",toX:60*16,toY:42*16} ],
spawns: [ {id:"river_bandits",enemyId:"bandit",maxCount:4,respawnTime:60,rect:{x:5*16,y:5*16,w:15*16,h:15*16}} ],
puzzles:[],
npcs:[{id:"ranger_sela",x:25*16,y:18*16},{id:"merchant_bram",x:22*16,y:20*16}]
};
