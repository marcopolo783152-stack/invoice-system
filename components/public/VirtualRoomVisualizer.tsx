'use client';
import React,{useEffect,useRef,useState} from 'react';
import styles from './RoomPreview.module.css';
interface Props {isOpen:boolean;onClose:()=>void;rugImage:string}
export default function VirtualRoomVisualizer({isOpen,onClose,rugImage}:Props){
 const dialog=useRef<HTMLDialogElement>(null),stage=useRef<HTMLDivElement>(null);
 const workspace=useRef<HTMLDivElement>(null);
 const [area,setArea]=useState({width:1000,height:600});
 useEffect(()=>{if(!isOpen||!workspace.current)return;const observer=new ResizeObserver(([entry])=>setArea({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(workspace.current);return()=>observer.disconnect();},[isOpen]);
 const drag=useRef<{id:number;x:number;y:number;left:number;top:number}|null>(null);
 const [room,setRoom]=useState(''),[ratio,setRatio]=useState(1.5),[rugRatio,setRugRatio]=useState(0.7);
 const [scale,setScale]=useState(45),[angle,setAngle]=useState(0),[tilt,setTilt]=useState(45);
 const [x,setX]=useState(50),[y,setY]=useState(65),[cropX,setCropX]=useState(0),[cropY,setCropY]=useState(0);
 const [blend,setBlend]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  if(!isOpen)return;
  dialog.current?.showModal();
  const old=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{dialog.current?.close();document.body.style.overflow=old;};
 },[isOpen]);
 useEffect(()=>{setCropX(0);setCropY(0);},[rugImage]);
 useEffect(()=>()=>{if(room)URL.revokeObjectURL(room);},[room]);
 const upload=(event:React.ChangeEvent<HTMLInputElement>)=>{
  const file=event.target.files?.[0];if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024){setError('Choose a JPG, PNG or WebP photo smaller than 20 MB.');return;}
  setError('');setRoom(URL.createObjectURL(file));event.target.value='';
 };
 const reset=()=>{setScale(45);setAngle(0);setTilt(45);setX(50);setY(65);};
 if(!isOpen)return null;
 return <dialog ref={dialog} className={styles.dialog} aria-label="Room preview" onCancel={onClose}>
  <header className={styles.header}><div><strong>See it in your room</strong><small>Photo preview · approximate size and placement</small></div><button onClick={onClose} aria-label="Close room preview">×</button></header>
  <div ref={workspace} className={styles.workspace}>
   {!room?<div className={styles.intro}><h2>Picture this rug at home</h2><p>Choose a room photo with a clear view of the floor. Your photo stays in this browser.</p><label className={styles.upload}>Choose room photo<input aria-label="Choose room photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload}/></label></div>:
   <div ref={stage} className={styles.stage} style={{width:Math.min(area.width,area.height*ratio),height:Math.min(area.height,area.width/ratio)}}>
    <img src={room} alt="Your room" className={styles.room} onLoad={e=>setRatio(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight)} onError={()=>{setError('This photo could not be opened. Try a JPG or PNG.');setRoom('');}}/>
    <div className={styles.rug} tabIndex={0} role="group" aria-label="Move rug with arrow keys or drag"
     onKeyDown={e=>{const step=e.shiftKey?5:1;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();setX(v=>Math.max(0,Math.min(100,v+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0))));setY(v=>Math.max(0,Math.min(100,v+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0))));}}}
     onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,left:x,top:y};}}
     onPointerMove={e=>{const d=drag.current,b=stage.current?.getBoundingClientRect();if(!d||!b||d.id!==e.pointerId)return;setX(Math.max(0,Math.min(100,d.left+(e.clientX-d.x)/b.width*100)));setY(Math.max(0,Math.min(100,d.top+(e.clientY-d.y)/b.height*100)));}}
     onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
     style={{left:x+'%',top:y+'%',width:scale+'%',aspectRatio:rugRatio*(1-2*cropX/100)/(1-2*cropY/100),transform:`translate(-50%,-50%) perspective(1000px) rotateX(${tilt}deg) rotateZ(${angle}deg)`,mixBlendMode:blend?'multiply':'normal'}}>
     <img src={rugImage} alt="Selected rug" draggable={false} onLoad={e=>setRugRatio(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight)} onError={()=>setError('The rug photo could not load. Please try another product photo.')}
      style={{position:'absolute',maxWidth:'none',width:100/(1-2*cropX/100)+'%',height:100/(1-2*cropY/100)+'%',left:-cropX/(1-2*cropX/100)+'%',top:-cropY/(1-2*cropY/100)+'%'}}/>
    </div>
   </div>}
  </div>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {room&&<footer className={styles.controls}>
   <p>Drag the rug onto the floor. Trim the photo edges to remove its border. Furniture is not automatically placed over the rug.</p>
   <div className={styles.sliders}>
    {[['Size',scale,setScale,10,100],['Angle',angle,setAngle,-180,180],['Tilt',tilt,setTilt,0,75],['Trim sides',cropX,setCropX,0,40],['Trim top / bottom',cropY,setCropY,0,40]].map(([label,value,setter,min,max])=><label key={String(label)}>{String(label)}<input aria-label={String(label)} type="range" min={Number(min)} max={Number(max)} value={Number(value)} onChange={e=>(setter as React.Dispatch<React.SetStateAction<number>>)(Number(e.target.value))}/></label>)}
   </div><div className={styles.actions}><label><input type="checkbox" checked={blend} onChange={e=>setBlend(e.target.checked)}/> Blend white background</label><button onClick={reset}>Reset position</button><label className={styles.upload}>Change room photo<input aria-label="Change room photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload}/></label></div>
  </footer>}
 </dialog>;
}
