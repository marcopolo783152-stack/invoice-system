import React, { useState, useRef } from 'react';
import { X, Upload, Maximize2, Move, Download } from 'lucide-react';

interface VirtualRoomVisualizerProps {
  isOpen: boolean;
  onClose: () => void;
  rugImage: string;
}

export default function VirtualRoomVisualizer({ isOpen, onClose, rugImage }: VirtualRoomVisualizerProps) {
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [perspective, setPerspective] = useState(45);
  const [smartBlend, setSmartBlend] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 70 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number } | null>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRoomImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: position.x,
      initPosY: position.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    
    // Very simplified drag math for demo purposes
    const dx = (e.clientX - dragRef.current.startX) / 5;
    const dy = (e.clientY - dragRef.current.startY) / 5;
    
    setPosition({
      x: dragRef.current.initPosX + dx,
      y: dragRef.current.initPosY + dy
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-900 flex items-center justify-center font-sans">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
      >
        <X size={24} />
      </button>

      {!roomImage ? (
        <div className="text-center p-8 max-w-md w-full bg-neutral-800 rounded-none shadow-2xl border border-neutral-700">
          <Upload className="w-12 h-12 text-editorial-accent mx-auto mb-4" />
          <h2 className="text-2xl font-serif text-white mb-2">Virtual Room Visualizer</h2>
          <p className="text-neutral-400 text-sm mb-8">
            Upload a photo of your living room, bedroom, or dining area to see how this rug looks in your space.
          </p>
          <label className="block w-full px-6 py-4 bg-editorial-accent hover:bg-[#8E7453] text-white font-bold uppercase tracking-widest text-sm rounded-none cursor-pointer transition">
            Upload Room Photo
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
            />
          </label>
        </div>
      ) : (
        <div className="flex flex-col h-full w-full">
          {/* Canvas Area */}
          <div 
            className="flex-1 relative overflow-hidden bg-black touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Background Room */}
            <img 
              src={roomImage} 
              alt="Your room" 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            
            {/* Draggable Rug Container for Perspective */}
            <div
              onPointerDown={handlePointerDown}
              className="absolute z-10 origin-center cursor-move flex items-center justify-center"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: `translate(-50%, -50%) perspective(1200px) rotateX(${perspective}deg)`,
                width: '60%',
                maxWidth: '600px',
              }}
            >
              <img 
                src={rugImage}
                alt="Rug Preview"
                className="w-full h-auto origin-center transition-all duration-200"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  mixBlendMode: smartBlend ? 'multiply' : 'normal',
                  opacity: smartBlend ? 0.9 : 1,
                  boxShadow: smartBlend ? 'none' : '0 30px 40px rgba(0,0,0,0.4)'
                }}
                draggable={false}
              />
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-neutral-900 border-t border-neutral-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 overflow-x-auto">
            
            <div className="flex items-center gap-6 w-full max-w-3xl flex-wrap md:flex-nowrap">
              {/* Size Slider */}
              <div className="flex items-center gap-3 flex-1 min-w-[150px]">
                <span className="text-neutral-400 text-[10px] uppercase tracking-wider font-bold w-12">Size</span>
                <input 
                  type="range" 
                  min="0.3" 
                  max="3" 
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full accent-editorial-accent"
                />
              </div>

              {/* Angle Slider */}
              <div className="flex items-center gap-3 flex-1 min-w-[150px]">
                <span className="text-neutral-400 text-[10px] uppercase tracking-wider font-bold w-12">Angle</span>
                <input 
                  type="range" 
                  min="-180" 
                  max="180" 
                  step="1"
                  value={rotation}
                  onChange={(e) => setRotation(parseFloat(e.target.value))}
                  className="w-full accent-editorial-accent"
                />
              </div>

              {/* Perspective Slider */}
              <div className="flex items-center gap-3 flex-1 min-w-[150px]">
                <span className="text-neutral-400 text-[10px] uppercase tracking-wider font-bold w-12">Tilt</span>
                <input 
                  type="range" 
                  min="0" 
                  max="80" 
                  step="1"
                  value={perspective}
                  onChange={(e) => setPerspective(parseFloat(e.target.value))}
                  className="w-full accent-editorial-accent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 border-l border-neutral-700 pl-4 shrink-0">
              <button
                onClick={() => setSmartBlend(!smartBlend)}
                className={`px-3 py-2 rounded-none text-xs font-bold uppercase tracking-wider transition border ${
                  smartBlend 
                    ? 'bg-editorial-accent border-editorial-accent text-white' 
                    : 'bg-transparent border-neutral-600 text-neutral-400 hover:text-white'
                }`}
                title="Blends shadows from your furniture over the rug so it looks like it's underneath"
              >
                Smart Blend
              </button>

              <label className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-none cursor-pointer transition" title="Upload New Room">
                <Upload size={16} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
              
              <button 
                onClick={() => { setPosition({ x: 50, y: 70 }); setScale(1); setRotation(0); setPerspective(45); }}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-none cursor-pointer transition" 
                title="Reset Position"
              >
                <Move size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
