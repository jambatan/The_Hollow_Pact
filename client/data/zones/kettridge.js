export default { id:"kettridge", name:"Kettridge Farm", width:35, height:35, tileSize:16, ambientLight:1.0, music:"outdoor_theme", spawnPoint:{x:17*16,y:30*16},
layers: [
{ name:"ground", data: (()=>{
    const W=35, H=35, GRASS=1, DIRT=2, STONE_FLOOR=3, WOOD_FLOOR=4, WATER=5, SWAMP=7, PATH=9;
    const d = new Array(W*H).fill(GRASS);
    const rect = (x,y,w,h,t) => { for(let i=y;i<y+h;i++) for(let j=x;j<x+w;j++) if(j>=0&&j<W&&i>=0&&i<H) d[i*W+j]=t; };
    rect(16,25,2,10,PATH);    // Path from south
    rect(16,20,2,6,PATH);     // Path to farmhouse
    rect(18,12,10,8,WOOD_FLOOR); // Farmhouse floor
    rect(5,18,8,8,STONE_FLOOR);  // Barn floor
    // Crop rows (dirt)
    rect(18,24,3,8,DIRT); rect(22,24,3,8,DIRT); rect(26,24,3,8,DIRT);
    // Swamp creeping in from NW
    rect(0,0,12,12,SWAMP);
    rect(0,12,6,6,SWAMP);
    rect(12,0,4,5,SWAMP);
    // Pond
    rect(25,5,6,6,WATER);
    rect(24,6,1,4,1); rect(31,6,1,4,1); // sand shore
    return d;
})() },
{ name:"objects", data: (()=>{
    const W=35, H=35, TREE=12, TREE_TOP=13, BUSH=14, FENCE=15, WALL_STONE=10, WALL_WOOD=11, DOOR_CLOSED=16, TORCH=20, BARREL=28, TABLE=29, BED=30;
    const d = new Array(W*H).fill(0);
    const set = (x,y,v) => { if(x>=0&&x<W&&y>=0&&y<H) d[y*W+x]=v; };
    const hwall = (x,y,l,t) => { for(let j=x;j<x+l;j++) set(j,y,t); };
    const vwall = (x,y,l,t) => { for(let i=y;i<y+l;i++) set(x,i,t); };

    // Farmhouse walls
    hwall(18,11,10,WALL_WOOD); hwall(18,20,10,WALL_WOOD);
    vwall(17,12,8,WALL_WOOD);  vwall(28,12,8,WALL_WOOD);
    set(23,20,DOOR_CLOSED);
    set(20,13,TABLE); set(21,13,TABLE);
    set(25,13,BED); set(26,13,BED);
    set(19,12,TORCH); set(26,12,TORCH);

    // Barn walls
    hwall(5,17,8,WALL_STONE); hwall(5,26,8,WALL_STONE);
    vwall(4,18,8,WALL_STONE);  vwall(13,18,8,WALL_STONE);
    set(13,22,DOOR_CLOSED);
    set(6,19,BARREL); set(7,19,BARREL); set(11,24,BARREL);

    // Crop fences
    hwall(17,23,13,FENCE); hwall(17,33,13,FENCE);
    vwall(17,24,9,FENCE);  vwall(30,24,9,FENCE);

    // Border trees (deterministic)
    const treePts=[[2,2],[5,2],[8,2],[12,2],[18,2],[22,2],[28,2],[32,2],
      [2,32],[5,32],[12,32],[20,32],[28,32],[2,8],[2,15],[2,22],[2,28]];
    for(const[x,y] of treePts) set(x,y,TREE);
    const bushPts=[[3,3],[13,2],[3,10],[3,18]];
    for(const[x,y] of bushPts) set(x,y,BUSH);

    return d;
})() },
{ name:"roof", data: (()=>{
    const W=35, H=35, ROOF_THATCH=40, ROOF_STONE=41;
    const d = new Array(W*H).fill(0);
    const rect=(x,y,w,h,t)=>{ for(let i=y;i<y+h;i++) for(let j=x;j<x+w;j++) if(j>=0&&j<W&&i>=0&&i<H) d[i*W+j]=t; };
    rect(17,10,12,11,ROOF_THATCH);
    rect(4,16,10,11,ROOF_STONE);
    return d;
})() }
],
transitions: [ {id:"exit_south",rect:{x:16*16,y:34*16,w:2*16,h:16},toZone:"world_map",toX:20*16,toY:57*16} ],
spawns: [ {id:"farm_crawlers",enemyId:"mire_crawler",maxCount:5,respawnTime:45,rect:{x:0,y:0,w:12*16,h:12*16}} ],
puzzles:[],
npcs:[{id:"farmer_hess",x:20*16,y:15*16}]
};
