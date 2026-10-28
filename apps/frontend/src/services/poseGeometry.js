export const BODY_CONNECTIONS=[
 [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],
 [11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],
 [12,14],[14,16],[16,18],[16,20],[16,22],[18,20],
 [11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[27,31],
 [24,26],[26,28],[28,30],[30,32],[28,32]
];
export function containRect(width,height,videoWidth,videoHeight){
 if(![width,height,videoWidth,videoHeight].every(v=>Number.isFinite(v)&&v>0))return null;
 const scale=Math.min(width/videoWidth,height/videoHeight);
 return {x:(width-videoWidth*scale)/2,y:(height-videoHeight*scale)/2,width:videoWidth*scale,height:videoHeight*scale};
}
export function isVisible(point,threshold=.4){
 return Array.isArray(point)&&point.length>=4&&point.slice(0,4).every(Number.isFinite)&&
  point[0]>=0&&point[0]<=1&&point[1]>=0&&point[1]<=1&&point[2]>=threshold&&point[3]>=threshold;
}
export function poseAt(track,time){
 const frames=track?.frames;
 if(!Array.isArray(frames)||!frames.length||!Number.isFinite(time))return null;
 let lo=0,hi=frames.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(frames[mid].time<=time)lo=mid;else hi=mid-1;}
 const left=frames[lo],right=frames[Math.min(lo+1,frames.length-1)];
 const interval=Math.max(.035,Number(track.sample_interval)||.1);
 const nearest=Math.abs(time-left.time)<=Math.abs(time-right.time)?left:right;
 if(Math.abs(time-nearest.time)>Math.min(.4,interval*1.6)||!nearest.landmarks)return null;
 if(!left.landmarks||!right.landmarks||left===right||right.time<=left.time||right.time-left.time>Math.min(.4,interval*1.6)){
  return nearest.landmarks;
 }
 const fraction=Math.max(0,Math.min(1,(time-left.time)/(right.time-left.time)));
 return left.landmarks.map((point,i)=>{
  const other=right.landmarks[i];
  if(!point||!other)return null;
  return [point[0]+(other[0]-point[0])*fraction,point[1]+(other[1]-point[1])*fraction,
   Math.min(point[2],other[2]),Math.min(point[3],other[3])];
 });
}
