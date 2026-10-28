/** Opaque background pixels are never a valid tree silhouette. */
export function isFoliagePixel(r,g,b){
 const leaves=g>r*1.4&&b>r*.5&&g<224;
 const darkOutline=r<68&&g<135&&b<122;
 const trunk=r>g*1.25&&g>b*1.2&&r<178&&g<125;
 return leaves||darkOutline||trunk;
}
export function polygonBounds(polygon){
 const xs=polygon.map(p=>p[0]),ys=polygon.map(p=>p[1]);
 const x=Math.floor(Math.min(...xs)),y=Math.floor(Math.min(...ys));
 return {x,y,width:Math.ceil(Math.max(...xs))-x,height:Math.ceil(Math.max(...ys))-y};
}
export function overlaps(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
export function pointInPolygon(x,y,polygon){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
