import React, { useEffect, useRef } from 'react';
import { ConnectionState } from '../types';

interface VisualizerProps {
  volume: number;
  state: ConnectionState;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  // Smooth out volume changes
  const smoothVolumeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Smooth interpolation
      smoothVolumeRef.current += (volume - smoothVolumeRef.current) * 0.1;
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.clearRect(0, 0, width, height);

      // Base circle
      const baseRadius = 40;
      const maxRadius = 80;
      
      let currentRadius = baseRadius;
      
      if (state === ConnectionState.CONNECTED) {
        currentRadius = baseRadius + (maxRadius - baseRadius) * smoothVolumeRef.current;
      } else if (state === ConnectionState.CONNECTING) {
        // Pulsing effect when connecting
        const time = Date.now() / 500;
        currentRadius = baseRadius + Math.sin(time) * 5;
      }

      // Draw outer glow
      if (state === ConnectionState.CONNECTED) {
         ctx.beginPath();
         ctx.arc(centerX, centerY, currentRadius * 1.2, 0, 2 * Math.PI);
         ctx.fillStyle = `rgba(14, 165, 233, ${0.2 * smoothVolumeRef.current})`;
         ctx.fill();
      }

      // Draw main circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, 2 * Math.PI);
      
      if (state === ConnectionState.ERROR) {
        ctx.fillStyle = '#ef4444'; // Red
      } else if (state === ConnectionState.DISCONNECTED) {
        ctx.fillStyle = '#94a3b8'; // Grey
      } else {
        ctx.fillStyle = '#0ea5e9'; // Dental Blue
      }
      
      ctx.fill();

      // Draw inner details (a simple smile curve or icon representation)
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      
      // Mic icon simplified
      const iconScale = currentRadius / 50;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(iconScale, iconScale);
      
      // Mic body
      ctx.beginPath();
      ctx.roundRect(-6, -10, 12, 20, 6);
      ctx.stroke();
      
      // Mic stand
      ctx.beginPath();
      ctx.moveTo(-10, 5);
      ctx.quadraticCurveTo(0, 15, 10, 5);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, 15);
      ctx.lineTo(0, 22);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(-8, 22);
      ctx.lineTo(8, 22);
      ctx.stroke();
      
      ctx.restore();

      requestRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [volume, state]);

  return (
    <div className="relative flex justify-center items-center h-64 w-full bg-gradient-to-b from-dental-50 to-white rounded-xl overflow-hidden shadow-inner border border-dental-100">
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={300} 
        className="w-full h-full"
      />
      {state === ConnectionState.DISCONNECTED && (
        <div className="absolute top-4 text-slate-400 text-sm font-medium">
          Ready to Connect
        </div>
      )}
      {state === ConnectionState.CONNECTING && (
        <div className="absolute top-4 text-dental-600 text-sm font-medium animate-pulse">
          Connecting to Sarah...
        </div>
      )}
       {state === ConnectionState.CONNECTED && (
        <div className="absolute top-4 text-dental-600 text-sm font-medium">
          Listening...
        </div>
      )}
    </div>
  );
};

export default Visualizer;