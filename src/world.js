import { WORLD } from './config.js';

const box=(name,x,y,w,h)=>({type:'rect',name,x,y,w,h});
const disc=(name,x,y,r)=>({type:'circle',name,x,y,r});
const rectPoly=(x1,y1,x2,y2)=>[[x1,y1],[x2,y1],[x2,y2],[x1,y2]];
const fg=(name,contactY,polygon)=>({name,contactY,polygon});
const tree=(name,contactY,polygon)=>({...fg(name,contactY,polygon),foliage:true});
const lamp=(name,x,top,base)=>fg(name,base,[[x-8,top],[x+8,top],[x+12,top+12],[x+8,top+28],[x+4,top+28],[x+4,base-11],[x+13,base-11],[x+13,base],[x-13,base],[x-13,base-11],[x-4,base-11],[x-4,top+28],[x-8,top+28],[x-12,top+12]]);

export const PLAYER_RADIUS=10;
export const PET_RADIUS=10;

export const SOLIDS=[
  box('Tường Tây',0,0,81,1024),box('Tường Đông',1446,0,90,1024),
  box('Tường Bắc Tây',81,0,496,139),box('Cổng Bắc (chưa mở)',577,0,380,139),
  box('Tường Bắc Đông',957,0,489,140),
  box('Tường Nam Tây',81,860,419,125),box('Tháp Nam Tây',495,840,79,149),
  box('Tường Nam Đông',1030,859,416,127),box('Tháp Nam Đông',952,838,79,152),
  box('Biên Nam (chưa mở map)',672,986,190,38),

  box('Shop · vách trái cửa',212,270,70,17),
  box('Shop · vách phải & quầy hàng',317,268,190,24),
  disc('Cây cạnh shop · gốc',482,264,15),

  box('Nhà Tây · móng trái',83,554,44,23),
  box('Nhà Tây · móng phải',158,554,43,23),
  box('Biển chỉ đường · chân',211,533,27,14),

  box('Nhà Tây Nam · móng trái',184,796,103,25),
  box('Nhà Tây Nam · móng phải',322,796,98,25),
  box('Bảng hàng trước tiệm',392,772,29,45),

  box('Bảng thông báo 1 · chân',1072,244,133,18),
  box('Bảng thông báo 2 · chân',1216,255,210,19),
  box('Thùng thư xanh · chân',960,262,46,16),
  disc('NPC cửa hàng Pet · chân',1033,319,11),

  disc('Đèn Tây Bắc · chân',653,379,11),disc('Đèn Đông Bắc · chân',877,380,11),
  disc('Đèn Tây Nam · chân',654,632,11),disc('Đèn Đông Nam · chân',876,633,11),

  box('Bồn hoa đài phun · trên trái',633,397,84,60),
  box('Bồn hoa đài phun · trên phải',814,397,88,60),
  box('Bồn hoa đài phun · dưới trái',635,535,85,78),
  box('Bồn hoa đài phun · dưới phải',815,536,87,77),
  box('Hồ nước và tượng',700,445,138,136),
  box('Lan can hồ · Tây',679,449,22,111),
  box('Lan can hồ · Đông',838,450,21,110),

  box('Trung tâm pet · mép tường trái',1083,535,90,22),
  box('Trung tâm pet · mép tường phải',1225,535,91,22),
  box('Bồn hoa pet · Tây',1023,527,60,56),
  box('Bồn hoa pet · Đông',1309,525,59,57),
  disc('Cây Đông · gốc',1411,555,23),

  disc('Cây Đông Nam 1 · gốc',1393,824,25),
  disc('Cây Đông Nam 2 · gốc',1337,812,21),
  disc('Cây Tây Nam 1 · gốc',114,824,20),
  disc('Cây Tây Nam 2 · gốc',190,837,22),
  disc('Người lái đò tại thành trì',1370,660,16),
];

export const PORTALS=[
  {id:'orange-shop',label:'Cửa hàng mái cam',x:280,y:265,w:39,h:32,insideMap:'interiors/orange-shop',enabled:true},
  {id:'west-cottage',label:'Nhà phía Tây',x:123,y:541,w:37,h:39,insideMap:'interiors/west-cottage',enabled:true},
  {id:'southwest-shop',label:'Cửa tiệm Tây Nam',x:285,y:776,w:41,h:47,insideMap:'interiors/southwest-shop',enabled:false},
  {id:'pet-center',label:'Trung tâm Linh Thú',x:1173,y:531,w:54,h:46,insideMap:'interiors/pet-center',enabled:false},
];

export const CITY_EXITS=[
  {id:'north',label:'Cổng Bắc',x:684,y:139,w:168,h:32,facing:'north',markerX:768,markerY:132,target:'out-north'},
  {id:'south',label:'Cổng Nam',x:726,y:816,w:138,h:40,facing:'south',markerX:792,markerY:862,target:'out-south'},
  {id:'west',label:'Cổng Tây',x:79,y:204,w:28,h:154,facing:'west',markerX:73,markerY:276,target:'out-west'},
  {id:'east',label:'Cổng Đông',x:1406,y:290,w:33,h:119,facing:'east',markerX:1440,markerY:350,target:'out-east'},
];

export const CITY_INTERACTIONS=[
  {id:'ferryman',label:'⚓ Người lái đò · Về bến thuyền',x:1370,y:660,reach:88},
  {id:'pet-shop',label:'NPC bán Pet · Nhận miễn phí / Mua Pet',x:1033,y:321,reach:82},
  {id:'magic',label:'Nhà MAGIC · Học kỹ năng',x:1182,y:837,reach:83},
  {id:'quests',label:'Bảng nhiệm vụ ngày',x:1137,y:290,reach:78},
  {id:'quests',label:'Bảng nhiệm vụ ngày',x:1341,y:300,reach:82},
];

export const INTERIORS={
  'west-cottage':{
    id:'west-cottage',label:'Nhà phía Tây',image:'interior_west',width:691,height:939,
    spawn:{x:273,y:826},exit:{x:238,y:877,w:84,h:61},
    solids:[box('Quầy nấu ăn',39,177,283,46),disc('Bàn trà',204,330,28),...[[132,284],[275,284],[132,382],[275,382]].map(([x,y])=>disc('Đệm ngồi',x,y,20)),box('Bếp lửa',412,185,178,38),box('Ghế cạnh lò',599,225,45,173),box('Kệ trái',39,630,49,181),box('Ba nồi gốm',386,616,259,44),box('Vách kho ngang',368,439,277,48),box('Vách kho dọc',368,487,18,127),disc('Bà chủ nhà',465,331,18)],
    npc:[{id:'elder',label:'Bà chủ nhà',x:464,y:365,reach:68,sprite:'elder',spriteX:465,spriteY:331}],
    foreground:[
      fg('Mặt quầy bếp',223,rectPoly(39,147,322,223)),fg('Lò sưởi',223,[[411,219],[411,134],[461,105],[462,35],[537,35],[537,111],[590,136],[590,222]]),
      fg('Bàn trà',358,[[177,325],[185,309],[205,305],[229,320],[233,341],[220,356],[194,357],[177,345]]),
      ...[420,517,610].map(x=>fg('Nồi gốm',660,[[x-33,610],[x-24,590],[x+24,590],[x+33,610],[x+25,653],[x-21,660]])),
      fg('Kệ trái',811,rectPoly(39,630,88,811)),
    ],
  },
  'orange-shop':{
    id:'orange-shop',label:'Cửa hàng mái cam',image:'interior_shop',width:700,height:933,
    spawn:{x:340,y:846},exit:{x:282,y:893,w:125,h:40},
    walkBounds:{left:26,right:674,top:194,bottom:900},
    solids:[box('Quầy nguyên liệu',25,350,292,55),box('Quầy pet',286,626,385,65),box('Cánh quầy trái',286,539,66,87),box('Cánh quầy phải',608,539,63,87),box('Kệ tường trái',26,520,50,260),box('Cửa phòng kho trái',44,35,146,164),box('Cửa phòng kho phải',511,35,145,164)],
    npc:[
      {id:'evolution',label:'NPC vàng · Nguyên liệu tiến hóa',x:166,y:448,reach:76,sprite:'evolution',spriteX:190,spriteY:338},
      {id:'items',label:'NPC tóc đen · Vật phẩm / Poke Ball',x:421,y:737,reach:75,sprite:'items',spriteX:421,spriteY:573},
      {id:'storage',label:'NPC tóc xanh · Lưu trữ / Hồi phục',x:511,y:737,reach:75,sprite:'storage',spriteX:525,spriteY:573},
    ],
    foreground:[
      fg('Quầy nguyên liệu · mặt trước',405,[[25,350],[317,350],[317,385],[299,405],[43,405],[25,386]]),
      fg('Quầy nguyên liệu · trái',405,rectPoly(25,240,88,351)),fg('Quầy nguyên liệu · phải',405,rectPoly(260,246,317,351)),
      fg('Quầy pet · mặt trước',691,[[286,626],[671,626],[671,671],[653,691],[307,691],[286,671]]),
      fg('Khay tinh thể trên quầy',691,rectPoly(362,569,477,623)),fg('Sổ và sách trên quầy',691,rectPoly(481,576,606,623)),
      fg('Quầy pet · cánh trái',691,[[286,538],[299,522],[345,522],[360,538],[360,626],[286,626]]),
      fg('Quầy pet · cánh phải',691,[[608,538],[622,522],[656,522],[671,538],[671,626],[608,626]]),
      fg('Kệ vật phẩm',780,rectPoly(26,520,76,780)),
    ],
  },
  'mine-tunnel':{
    id:'mine-tunnel',label:'Hầm mỏ',image:'interior_mine',width:960,height:640,
    spawn:{x:480,y:520},exit:{x:430,y:112,w:100,h:61,to:'out-west-south',returnAt:{x:472,y:417}},
    walkBounds:{left:120,right:840,top:94,bottom:640},
    solids:[box('Tường hầm mỏ trái',120,130,200,115),box('Tường hầm mỏ phải',640,130,200,115)],npc:[]
  }
};

export const OUTSKIRTS={
  'out-north':{id:'out-north',label:'Ngoại thành Bắc',width:960,height:640,spawn:{x:480,y:536},exit:{x:385,y:582,w:190,h:47,to:'city',label:'Về Cổng Bắc',arrow:'south'},npc:[],solids:[]},
  'out-south':{id:'out-south',label:'Ngoại thành Nam',width:960,height:640,spawn:{x:480,y:104},exit:{x:385,y:12,w:190,h:47,to:'city',label:'Về Cổng Nam',arrow:'north'},npc:[],solids:[]},
  'out-east':{id:'out-east',label:'Ngoại thành Đông',width:960,height:640,spawn:{x:138,y:320},exit:{x:12,y:224,w:70,h:190,to:'city',label:'Về Cổng Đông',arrow:'west'},npc:[],solids:[]},
  'out-west':{
    id:'out-west',label:'Làng phía Tây',image:'out_west_village',width:1536,height:1024,
    spawn:{x:1406,y:682},
    exits:[
      {id:'east',x:1488,y:604,w:48,h:130,to:'city',label:'Qua thành trì',arrow:'east',returnAt:{x:130,y:276}},
      {id:'south',x:700,y:948,w:140,h:76,to:'out-west-south',label:'Xuống khu phía Nam của làng',arrow:'south',returnAt:{x:768,y:120}},
    ],
    npc:[],
    solids:[
      // Only feet-level foundations are physical. Roofs and tree canopies are scenery.
      box('Móng nhà Tây Bắc',205,258,214,23),box('Móng nhà Đông Bắc',918,250,220,26),
      box('Móng nhà giữa làng',432,588,200,27),box('Móng nhà phía Đông',1185,588,181,30),
      box('Rừng mép trên',0,0,1536,84),box('Rừng mép trái',0,0,100,693),
      box('Rừng mép phải trên',1390,0,146,590),box('Rừng góc Tây Nam',0,775,440,249),box('Rừng góc Đông Nam',990,817,546,207),
      box('Hàng rào cổng trái',543,748,174,82),box('Hàng rào cổng phải',821,748,167,82)
    ],
    foreground:[
      fg('Nhà Tây Bắc',266,[[202,81],[366,81],[366,62],[400,62],[400,82],[412,82],[412,190],[430,195],[430,249],[411,262],[205,262]]),
      fg('Nhà Đông Bắc',270,[[917,78],[1037,78],[1037,42],[1107,42],[1107,73],[1133,73],[1133,266],[917,266]]),
      fg('Nhà giữa làng',586,[[414,395],[526,395],[526,376],[559,376],[559,395],[628,395],[628,578],[414,578]]),
      fg('Nhà phía Đông',590,[[1163,394],[1320,394],[1320,375],[1350,375],[1350,395],[1369,395],[1369,583],[1163,583]]),
      fg('Cổng làng · trụ trái',892,[[656,748],[696,736],[710,762],[703,888],[658,888]]),
      fg('Cổng làng · trụ phải',892,[[810,750],[843,737],[861,758],[857,891],[814,891]]),
      fg('Cổng làng · xà',892,[[692,760],[753,741],[820,762],[820,784],[754,765],[698,786]]),
      tree('Cây giữa làng',708,[[911,676],[927,624],[953,598],[982,622],[1002,670],[979,697],[956,711],[931,700]]),
      tree('Cây cạnh nhà giữa',512,[[338,482],[346,423],[369,388],[396,408],[416,459],[410,491],[382,513],[354,504]]),
      tree('Cây ven lối Đông',817,[[1400,785],[1422,724],[1442,682],[1461,641],[1482,691],[1518,762],[1507,802],[1465,826]]),
    ]
  },
  'out-west-south':{
    id:'out-west-south',label:'Khu phía Nam của làng',image:'out_west_south',width:1536,height:1024,
    spawn:{x:768,y:120},
    exits:[
      {id:'north',x:688,y:0,w:160,h:92,to:'out-west',label:'Trở lại làng phía Tây',arrow:'north',returnAt:{x:771,y:914}},
      {id:'east',x:1488,y:565,w:48,h:106,to:'out-harbor',label:'Sang bến thuyền',arrow:'east',returnAt:{x:128,y:548}},
      // Doorway in the stone arch. Reach it by walking NORTH along the visible dirt path.
      {id:'mine',x:442,y:335,w:71,h:69,to:'mine-tunnel',label:'Đi vào hầm mỏ',showArrow:false,returnAt:{x:471,y:417}},
    ],
    npc:[],
    solids:[
      box('Vách đá phía trên trái',0,0,699,145),box('Vách đá phía trên phải',878,0,658,145),
      // Mine: do NOT block the entire cave illustration. Leave x=437..522 open along its doorway.
      box('Vách đá mỏ trái',299,251,132,108),box('Vách đá mỏ phải',526,251,124,108),
      disc('Chân cột mỏ trái phía trước',393,503,27),disc('Chân cột mỏ phải phía trước',560,501,27),
      // Graveyard headstones only, not one giant invisible wall across the grass.
      disc('Bia mộ 1',1060,227,19),disc('Bia mộ 2',1235,410,19),disc('Bia mộ 3',1397,485,20),
      disc('Bia mộ 4',1311,481,20),disc('Bia mộ 5',1347,347,22),
      box('Rừng mép dưới',0,912,1536,112),box('Rừng mép trái dưới',0,795,250,229),box('Rừng mép phải dưới',1272,811,264,213),
      disc('Gốc cây giữa 1',782,494,23),disc('Gốc cây giữa 2',896,517,23),disc('Gốc cây giữa 3',671,516,23)
    ],
    foreground:[
      fg('Vòm đá mỏ trái',349,[[353,265],[371,237],[404,247],[426,310],[422,350],[371,350]]),
      fg('Vòm đá mỏ phải',349,[[518,263],[548,242],[576,268],[573,346],[523,348]]),
      fg('Trụ mỏ trái',528,[[370,418],[394,386],[419,407],[411,530],[379,531]]),
      fg('Trụ mỏ phải',535,[[532,419],[552,393],[576,418],[570,531],[540,532]]),
      tree('Thông giữa vườn',529,[[784,397],[801,436],[831,477],[820,510],[790,534],[754,513],[737,488],[763,437]]),
      tree('Cây trái vườn',573,[[653,477],[675,488],[705,518],[706,549],[673,574],[635,552],[629,521]]),
      tree('Cây trên vườn',481,[[704,398],[735,379],[766,411],[770,449],[742,478],[708,472],[685,439]]),
      tree('Cây phải vườn',647,[[924,556],[952,565],[979,599],[966,640],[933,646],[903,622],[899,587]]),
      tree('Cây góc vườn',477,[[938,394],[962,423],[964,452],[929,477],[900,467],[887,434],[900,409]]),
    ]
  },
  'out-harbor':{
    id:'out-harbor',label:'Bến thuyền Mỏ Neo',image:'out_harbor',width:1536,height:1024,
    spawn:{x:128,y:548},
    exits:[{id:'west',x:12,y:506,w:56,h:80,to:'out-west-south',label:'Về khu phía Nam của làng',arrow:'west',returnAt:{x:1432,y:618}}],
    npc:[{id:'ferryman',label:'⚓ Người lái đò · Đi thành trì Pet Town',x:1135,y:289,reach:100,sprite:'ferryman',anchor:true}],
    solids:[
      box('Biên rừng Bắc',0,0,1065,48),
      box('Móng nhà Tây',147,246,294,28),box('Móng nhà Đông',703,232,279,30),
      box('Rừng mép Tây phía trên',0,0,165,496),box('Rừng mép Tây phía dưới',0,592,170,432),
      box('Sông phía Đông',1240,0,296,1024),box('Sông phía trên bến',1102,0,138,194),
      box('Nước bên cạnh người lái đò',1178,194,62,63),box('Sông dưới cầu tàu',1163,443,77,581),
      box('Bờ kè phía dưới',1128,444,32,580),
      box('Bệ tượng linh thú',865,481,180,151),
      box('Bồn hoa trên',887,694,162,59),box('Bồn hoa dưới',891,838,163,55),
      disc('Cây Tây Bắc 1',462,430,23),disc('Cây Tây Bắc 2',537,451,23),disc('Cây Tây Bắc 3',608,473,23),
      disc('Cây Tây giữa 1',437,597,22),disc('Cây Tây giữa 2',517,607,23),disc('Cây Tây giữa 3',581,620,22),
      disc('Cây cạnh tượng 1',885,445,22),disc('Cây cạnh tượng 2',951,454,22),disc('Cây cạnh tượng 3',1025,459,22),
      disc('Cây phía Nam',560,854,25),disc('Người lái đò',1135,282,17),
      disc('Đèn bến trên',1212,277,15),disc('Đèn bến dưới',1217,415,15),
    ],
    foreground:[
      fg('Nhà bến Tây',274,rectPoly(143,54,443,274)),fg('Nhà bến Đông',262,rectPoly(701,34,989,262)),
      tree('Cụm cây Tây Bắc',473,[[402,352],[454,310],[486,337],[537,242],[570,322],[605,352],[630,449],[588,475],[440,457],[394,431]]),
      tree('Cụm cây giữa',620,[[395,555],[436,488],[476,539],[516,478],[555,542],[579,517],[612,601],[577,623],[426,613],[382,594]]),
      tree('Cây cạnh tượng trái',452,[[841,439],[866,402],[884,339],[909,391],[935,438],[908,458],[873,456]]),
      tree('Cây cạnh tượng giữa',458,[[910,447],[939,399],[957,353],[980,400],[1001,449],[965,461],[935,459]]),
      tree('Cây cạnh tượng phải',463,[[979,449],[1008,397],[1025,338],[1052,396],[1081,448],[1048,464],[1015,463]]),
      tree('Cây phía Nam',854,[[491,826],[522,777],[557,705],[586,774],[623,824],[597,853],[533,855]]),
    ]
  }
};

// Explicit destinations keep ferry travel validated by both the UI and server.
export const FERRY_ROUTES=Object.freeze({
  'out-harbor':[{to:'city',label:'Thành trì Pet Town',spawn:{x:1370,y:708}}],
  city:[{to:'out-harbor',label:'Bến thuyền Mỏ Neo',spawn:{x:1130,y:344}}],
});

export const FOREGROUND=[
  fg('Shop mái cam',291,[[207,104],[460,103],[463,210],[508,224],[509,293],[207,293]]),
  tree('Cây cạnh shop',278,[[458,262],[464,224],[455,203],[468,171],[483,145],[500,168],[512,205],[503,230],[502,265],[483,278]]),
  fg('Bảng tin trái',262,rectPoly(1070,133,1214,248)),
  fg('Bảng tin phải',275,[[1200,88],[1347,88],[1347,155],[1426,155],[1426,273],[1285,273],[1285,247],[1200,247]]),
  fg('Thùng thư xanh',278,rectPoly(955,229,1009,277)),
  lamp('Đèn bắc trái',654,319,392),
  lamp('Đèn bắc phải',876,319,393),
  fg('Nhà phía Tây',579,[[79,365],[159,365],[210,458],[210,578],[80,578]]),
  fg('Biển nhà Tây',551,[[211,474],[217,463],[235,465],[244,481],[244,506],[231,506],[231,548],[222,548],[222,507],[211,507]]),
  fg('Đài phun nước · tượng và bể',581,[[700,454],[723,439],[739,428],[739,411],[751,405],[769,413],[785,405],[798,416],[790,443],[826,452],[838,469],[838,552],[821,581],[713,581],[700,557]]),
  fg('Bồn hoa hồ Tây Bắc',457,[[633,410],[645,399],[714,399],[714,457],[633,457]]),
  fg('Bồn hoa hồ Đông Bắc',457,[[814,397],[890,397],[902,412],[902,457],[814,457]]),
  fg('Bồn hoa hồ Tây Nam',613,rectPoly(635,535,720,613)),
  fg('Bồn hoa hồ Đông Nam',613,rectPoly(815,536,902,613)),
  lamp('Đèn nam trái',654,574,644),
  lamp('Đèn nam phải',876,574,645),
  fg('Trung tâm pet',583,[[1020,365],[1160,340],[1181,350],[1209,341],[1366,370],[1368,581],[1019,581]]),
  tree('Cây phía Đông',562,[[1354,504],[1369,450],[1384,400],[1407,373],[1427,426],[1440,489],[1430,536],[1409,562],[1380,548]]),
  tree('Cây Tây Nam trái',813,[[82,762],[93,699],[111,656],[125,604],[144,651],[169,716],[171,782],[142,813],[108,805]]),
  tree('Cây Tây Nam phải',845,[[137,803],[161,761],[186,728],[211,765],[240,817],[222,842],[176,846]]),
  fg('Cửa tiệm Tây Nam',824,[[182,607],[422,607],[424,825],[182,825]]),
  fg('Nhà MAGIC',835,[[1030,731],[1062,719],[1063,691],[1119,641],[1171,691],[1181,711],[1285,711],[1285,784],[1295,784],[1295,829],[1190,837],[1066,837],[1030,815]]),
  tree('Cây Đông Nam trái',819,[[1288,790],[1300,738],[1319,674],[1341,702],[1359,754],[1360,795],[1339,819],[1306,819]]),
  tree('Cây Đông Nam phải',833,[[1357,802],[1367,743],[1388,707],[1409,661],[1434,716],[1450,783],[1440,820],[1400,839]]),
].sort((a,b)=>a.contactY-b.contactY);

export function cityExitAt(x,y){
  return CITY_EXITS.find(p=>x>=p.x&&x<=p.x+p.w&&y>=p.y&&y<=p.y+p.h)||null;
}
export const isOutdoorScene=scene=>scene.startsWith('out-')&&!!OUTSKIRTS[scene];

export function sceneTransferAt(scene,x,y){
  if(scene==='city'){
    const gate=cityExitAt(x,y);
    return gate?{kind:'city-exit',to:gate.target,gate}:null;
  }
  // Interiors must also have transfers. v1.5 only checked OUTSKIRTS, which
  // trapped players after entering the shop, west cottage and mine.
  if(INTERIORS[scene]){
    const e=INTERIORS[scene].exit;
    if(e&&x>=e.x&&x<=e.x+e.w&&y>=e.y&&y<=e.y+e.h){
      return {id:'exit',kind:'interior-exit',to:e.to||'city',returnAt:e.returnAt||null};
    }
    return null;
  }
  if(!isOutdoorScene(scene))return null;
  const exits=OUTSKIRTS[scene].exits||[];
  const single=OUTSKIRTS[scene].exit?[OUTSKIRTS[scene].exit]:[];
  for(const e of [...exits,...single]){
    if(x>=e.x&&x<=e.x+e.w&&y>=e.y&&y<=e.y+e.h)return e;
  }
  return null;
}

export function nearestPortal(x,y,reach=24){
  for(const door of PORTALS){
    const px=Math.max(door.x,Math.min(x,door.x+door.w));
    const py=Math.max(door.y,Math.min(y,door.y+door.h));
    if(Math.hypot(x-px,y-py)<=reach) return door;
  }
  return null;
}
export function nearestInteraction(scene,x,y){
  const candidates=scene==='city'?CITY_INTERACTIONS:(INTERIORS[scene]?.npc||OUTSKIRTS[scene]?.npc||[]);
  return candidates.filter(i=>Math.hypot(x-i.x,y-i.y)<=i.reach)
    .sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y))[0]||null;
}
export function getSceneDimensions(scene='city'){
  return scene==='city'?WORLD:{width:(INTERIORS[scene]||OUTSKIRTS[scene])?.width??WORLD.width,height:(INTERIORS[scene]||OUTSKIRTS[scene])?.height??WORLD.height};
}
export function isInsideExit(scene,x,y){
  if(scene==='city')return false;
  const interiorExit=INTERIORS[scene]?.exit;
  if(interiorExit&&x>=interiorExit.x&&x<=interiorExit.x+interiorExit.w&&y>=interiorExit.y&&y<=interiorExit.y+interiorExit.h)return true;
  return !!sceneTransferAt(scene,x,y);
}

export function getMapConfig(scene='city'){
  if(scene==='city')return {
    title:'Bản đồ thành trì',
    image:'assets/map.png',
    width:WORLD.width,height:WORLD.height,
    markers:[
      {id:'orange-shop',label:'Cửa hàng mái cam',x:300,y:300,axis:'h'},
      {id:'west-cottage',label:'Nhà phía Tây',x:141,y:581,axis:'h'},
      {id:'magic',label:'Nhà MAGIC',x:1182,y:845,axis:'h'},
      {id:'north',label:'Cổng Bắc',x:768,y:132,axis:'h'},
      {id:'south',label:'Cổng Nam',x:792,y:862,axis:'h'},
      {id:'west',label:'Cổng Tây',x:73,y:276,axis:'v'},
      {id:'east',label:'Cổng Đông',x:1440,y:350,axis:'v'},
    ],
    hotspots:[
      {id:'orange-shop',label:'Cửa hàng mái cam',x:206,y:102,w:304,h:196},
      {id:'west-cottage',label:'Nhà phía Tây',x:78,y:365,w:169,h:214},
      {id:'magic',label:'Nhà MAGIC',x:1029,y:639,w:268,h:204},
      {id:'north',label:'Cổng Bắc',x:578,y:0,w:378,h:172},
      {id:'south',label:'Cổng Nam',x:668,y:813,w:198,h:211},
      {id:'west',label:'Cổng Tây',x:0,y:156,w:124,h:242},
      {id:'east',label:'Cổng Đông',x:1395,y:287,w:141,h:170},
      {id:'quests-left',label:'Bảng nhiệm vụ ngày',x:1066,y:126,w:151,h:145},
      {id:'quests-right',label:'Bảng nhiệm vụ ngày',x:1206,y:86,w:226,h:189},
      {id:'pet-shop',label:'NPC Shop Pet',x:956,y:262,w:90,h:102},
    ]
  };
  const sceneData=OUTSKIRTS[scene];
  if(!sceneData)return {title:scene,image:'assets/map.png',width:WORLD.width,height:WORLD.height,markers:[],hotspots:[]};
  if(scene==='out-west')return {
    title:'Bản đồ làng phía Tây',image:'assets/out-west-village.png',width:sceneData.width,height:sceneData.height,
    markers:[
      {id:'east',label:'Lối sang thành trì',x:1511,y:669,axis:'v'},
      {id:'south',label:'Lối xuống khu phía Nam',x:770,y:997,axis:'h'},
    ],
    hotspots:[
      {id:'east',label:'Lối sang thành trì',x:1458,y:596,w:78,h:144},
      {id:'south',label:'Lối xuống khu phía Nam',x:690,y:942,w:160,h:82},
      {id:'house1',label:'Nhà phía Tây Bắc',x:120,y:96,w:316,h:238},
      {id:'house2',label:'Nhà phía Đông Bắc',x:976,y:95,w:332,h:236},
      {id:'house3',label:'Nhà phía Đông',x:1046,y:425,w:324,h:270},
      {id:'house4',label:'Nhà ở giữa làng',x:392,y:360,w:366,h:292},
      {id:'village-gate',label:'Cổng chào của làng',x:632,y:742,w:280,h:282},
    ]
  };
  if(scene==='out-west-south')return {
    title:'Bản đồ khu phía Nam của làng',image:'assets/out-west-south.png',width:sceneData.width,height:sceneData.height,
    markers:[
      {id:'north',label:'Trở lại làng phía Tây',x:768,y:22,axis:'h'},
      {id:'east',label:'Sang bến thuyền Mỏ Neo',x:1511,y:618,axis:'v'},
      {id:'mine',label:'Lối vào hầm mỏ',x:477,y:372,axis:'h'},
    ],
    hotspots:[
      {id:'north',label:'Trở lại làng phía Tây',x:670,y:0,w:200,h:108},
      {id:'east',label:'Sang bến thuyền Mỏ Neo',x:1456,y:551,w:80,h:132},
      {id:'cave',label:'Hầm mỏ',x:292,y:177,w:354,h:346},
      {id:'graveyard',label:'Khu bia đá',x:1028,y:168,w:368,h:368},
      {id:'forest',label:'Rừng nhỏ',x:0,y:840,w:1536,h:184},
    ]
  };
  if(scene==='out-harbor')return {
    title:sceneData.label,image:'assets/out-harbor.png',width:sceneData.width,height:sceneData.height,
    markers:[{id:'west',label:'Về khu phía Nam của làng',x:36,y:546,axis:'v'},{id:'ferryman',label:'⚓ Đi thành trì Pet Town',x:1135,y:289,axis:'h'}],
    hotspots:[{id:'ferryman',label:'Người lái đò · Đi nhanh sang thị trấn khác',x:1087,y:195,w:91,h:154},{id:'boats',label:'Bến đò',x:1178,y:430,w:290,h:370}],
  };
  return {title:sceneData.label,image:'assets/map.png',width:sceneData.width,height:sceneData.height,markers:[],hotspots:[]};
}

function touches(x,y,r,shape){
  if(shape.type==='circle')return Math.hypot(x-shape.x,y-shape.y)<r+shape.r;
  const nx=Math.max(shape.x,Math.min(x,shape.x+shape.w));
  const ny=Math.max(shape.y,Math.min(y,shape.y+shape.h));
  return (x-nx)**2+(y-ny)**2<r*r;
}
export function isBlocked(x,y,radius=PLAYER_RADIUS,scene='city'){
  const dim=getSceneDimensions(scene);
  if(x<radius||y<radius||x>dim.width-radius||y>dim.height-radius)return true;
  if(isOutdoorScene(scene)){
    const outdoor=OUTSKIRTS[scene];
    return (outdoor?.solids||[]).some(s=>touches(x,y,radius,s));
  }
  if(scene!=='city'){
    const interior=INTERIORS[scene];if(!interior)return true;
    const bounds=interior.walkBounds||{left:42,right:650,top:194,bottom:916};
    const inRoom=x>=bounds.left+radius&&x<=bounds.right-radius&&y>=bounds.top+radius&&y<=bounds.bottom-radius;
    // An open doorway may extend beyond the generic room's walkable floor.
    // Permit the CENTER of the actor to enter that small exit area.
    const e=interior.exit;
    const throughDoor=e&&x>=e.x+radius&&x<=e.x+e.w-radius&&y>=e.y-radius&&y<=e.y+e.h-radius;
    if(!inRoom&&!throughDoor)return true;
    return interior.solids.some(s=>touches(x,y,radius,s));
  }
  return SOLIDS.some(s=>touches(x,y,radius,s));
}

/** Fail-safe for imprecise map art: position new arrivals at the nearest usable
 * ground point instead of trapping a player inside a building hitbox. The
 * authored spawn must still pass navigation tests. */
export function safeSceneSpawn(scene,point,radius=PLAYER_RADIUS){
  if(!isBlocked(point.x,point.y,radius,scene)&&!sceneTransferAt(scene,point.x,point.y))return {...point};
  const {width,height}=getSceneDimensions(scene);
  for(let dist=12;dist<=208;dist+=12){
    const count=Math.ceil(2*Math.PI*dist/12);
    for(let i=0;i<count;i++){
      const a=i*2*Math.PI/count;
      const x=Math.round(point.x+Math.cos(a)*dist),y=Math.round(point.y+Math.sin(a)*dist);
      if(x<radius||x>width-radius||y<radius||y>height-radius)continue;
      if(!isBlocked(x,y,radius,scene)&&!sceneTransferAt(scene,x,y))return {x,y};
    }
  }
  throw new Error(`Không tìm thấy điểm đặt nhân vật an toàn ở scene ${scene}: (${point.x},${point.y}).`);
}
export function moveWithCollisions(actor,dx,dy,radius=PLAYER_RADIUS,scene='city'){
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/4));
  let movedX=0,movedY=0;
  for(let i=0;i<steps;i++){
    const sx=dx/steps,sy=dy/steps;
    if(!isBlocked(actor.x+sx,actor.y,radius,scene)){actor.x+=sx;movedX+=sx;}
    if(!isBlocked(actor.x,actor.y+sy,radius,scene)){actor.y+=sy;movedY+=sy;}
  }
  return {dx:movedX,dy:movedY};
}
