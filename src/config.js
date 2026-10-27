export const WORLD = Object.freeze({ width: 1536, height: 1024 });
export const SPAWN = Object.freeze({ x: 773, y: 774 });
export const PLAYER_DIRECTIONS = ['east','south','west','north'];
export const PET_DIRECTIONS = ['east']; // Left-facing sprite is mirrored at render time.
export const WALK_SPEED = 178;
export const RUN_SPEED = 264;
export const DEFAULT_SETTINGS = Object.freeze({
  resolution:'960x640', zoom:1.12, playerScale:1.15, petScale:1.07,
  debugCollisions:false, pixelated:true
});
export const SKILLS = [
  { id:'fire', name:'Kiếm Hỏa', description:'Chém lưỡi lửa tím', power:25, color:'#f16cff', image:'fire' },
  { id:'moon', name:'Hắc Nguyệt', description:'Trăng khuyết hắc ám', power:35, color:'#a565ff', image:'moon' },
  { id:'spirit', name:'Triệu Hồi Linh Lực', description:'Linh lực và bướm phép', power:18, heal:12, color:'#60dbff', image:'spirit' },
];
