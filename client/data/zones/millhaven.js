export default { id: "millhaven", name: "Millhaven", width: 55, height: 55, tileSize: 16, ambientLight: 1.0, music: "town_theme2", spawnPoint: { x: 28*16, y: 50*16 },
layers: [
{ name:"ground", data: (()=>{
    const W=55, H=55, GRASS=1, DIRT=2, STONE_FLOOR=3, WATER=5, PATH=9, WOOD_FLOOR=4;
    const d = new Array(W*H).fill(GRASS);
    const rect = (x,y,w,h,t) => { for(let i=y;i<y+h;i++) for(let j=x;j<x+w;j++) { if(j>=0&&j<W&&i>=0&&i<H) d[i*W+j]=t; } };
    rect(20,20,15,15,STONE_FLOOR); // Market Square
    rect(27,15,2,5,PATH);
    rect(27,35,2,19,PATH);
    rect(15,27,5,2,PATH);
    rect(35,27,6,2,PATH);
    rect(27,0,2,15,PATH);
    rect(26,26,3,3,STONE_FLOOR);
    d[27*W+27] = WATER; // Fountain center
    rect(18,18,2,9,PATH);
    rect(35,22,5,2,PATH);
    rect(5, 5, 15, 12, STONE_FLOOR);  // Mage Guild floor
    rect(22, 8, 11, 7, WOOD_FLOOR);   // Library floor
    rect(38, 25, 10, 8, WOOD_FLOOR);  // Apothecary floor
    return d;
})() },
{ name:"objects", data: (()=>{
    const W=55, H=55, TREE=12, BUSH=14, WALL_STONE=10, WALL_WOOD=11, TORCH=20, BARREL=28, TABLE=29, BED=30, STAIRS_UP=22, DOOR_CLOSED=16, PRESSURE_PLATE=23;
    const d = new Array(W*H).fill(0);
    const set = (x,y,v) => { if(x>=0&&x<W&&y>=0&&y<H) d[y*W+x]=v; };
    const rect = (x,y,w,h,t) => { for(let i=y;i<y+h;i++) for(let j=x;j<x+w;j++) set(j,i,t); };
    const hwall = (x,y,l,t) => rect(x,y,l,1,t);
    const vwall = (x,y,l,t) => rect(x,y,1,l,t);

    // Mage Guild Walls
    hwall(5,4,15,WALL_STONE); hwall(5,17,15,WALL_STONE);
    vwall(4,5,12,WALL_STONE); vwall(20,5,12,WALL_STONE);
    set(4,10,DOOR_CLOSED);
    set(12,15,STAIRS_UP);
    set(6,6,TABLE); set(7,6,TABLE); set(8,6,TABLE);
    set(6,10,BED); set(7,10,BED);
    set(6,12,BARREL); set(7,12,BARREL);
    set(6,5,TORCH); set(18,5,TORCH);

    // Library Walls
    hwall(22,7,11,WALL_WOOD); hwall(22,15,11,WALL_WOOD);
    vwall(21,8,7,WALL_WOOD); vwall(33,8,7,WALL_WOOD);
    set(27,15,DOOR_CLOSED);
    set(24,9,TABLE); set(25,9,TABLE); set(24,10,TABLE); set(25,10,TABLE);
    set(29,9,TABLE); set(30,9,TABLE);

    // Apothecary Walls
    hwall(38,24,10,WALL_WOOD); hwall(38,33,10,WALL_WOOD);
    vwall(37,25,8,WALL_WOOD); vwall(48,25,8,WALL_WOOD);
    set(37,28,DOOR_CLOSED);
    set(40,26,TABLE); set(41,26,TABLE);
    set(40,31,BARREL); set(47,26,TORCH);

    // Mage Guild Trial pressure plates
    set(25,20,PRESSURE_PLATE);
    set(30,20,PRESSURE_PLATE);
    set(27,17,PRESSURE_PLATE);

    // Trees along edges (deterministic positions)
    const treePts = [[2,2],[5,2],[10,2],[15,2],[20,2],[30,2],[40,2],[48,2],[52,2],
      [2,52],[10,52],[20,52],[30,52],[40,52],[52,52],
      [2,10],[2,20],[2,30],[2,40],[52,10],[52,20],[52,30],[52,40]];
    for(const [x,y] of treePts) set(x,y,TREE);
    const bushPts = [[3,3],[8,3],[18,3],[35,3],[45,3],[3,8],[3,18],[52,8],[52,18]];
    for(const [x,y] of bushPts) set(x,y,BUSH);

    return d;
})() },
{ name:"roof", data: (()=>{
    const W=55, H=55, ROOF_THATCH=40, ROOF_STONE=41;
    const d = new Array(W*H).fill(0);
    const rect = (x,y,w,h,t) => { for(let i=y;i<y+h;i++) for(let j=x;j<x+w;j++) if(j>=0&&j<W&&i>=0&&i<H) d[i*W+j]=t; };
    rect(4, 3, 17, 15, ROOF_STONE);  // Mage Guild
    rect(21, 6, 13, 10, ROOF_THATCH); // Library
    rect(37, 23, 12, 11, ROOF_THATCH); // Apothecary
    return d;
})() }
],
transitions: [
  { id:"exit_south", rect:{x:27*16,y:54*16,w:2*16,h:16}, toZone:"world_map", toX:36*16, toY:17*16 },
  { id:"exit_north", rect:{x:27*16,y:0,w:2*16,h:16}, toZone:"world_map", toX:36*16, toY:17*16 }
],
spawns: [],
puzzles: [
  { id:"mage_guild_trial", solved:false,
    triggers:[
      {id:"seal_1",type:"pressure_plate",x:25*16,y:20*16,w:16,h:16,active:false},
      {id:"seal_2",type:"pressure_plate",x:30*16,y:20*16,w:16,h:16,active:false},
      {id:"seal_3",type:"pressure_plate",x:27*16,y:17*16,w:16,h:16,active:false}
    ],
    onSolve(zone,events){ events.emit("notification:show",{text:"The seals are broken!",color:"#aaddff"}); }
  }
],
npcs: [
  {id:"scholar_emelyn",   x:30*16, y:20*16},
  {id:"archmage_thalys",  x:28*16, y:22*16},
  {id:"apothecary_selene",x:43*16, y:28*16},
  {id:"mage_proctor_venn",x:32*16, y:22*16}
]
};
