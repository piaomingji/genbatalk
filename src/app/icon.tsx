import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '16px solid #6366f1',
          borderRadius: 140,
          position: 'relative',
        }}
      >
        {/* Glow behind mic */}
        <div
          style={{
            position: 'absolute',
            width: '260px',
            height: '260px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(99,102,241,0) 70%)',
            borderRadius: '130px',
          }}
        />
        <div style={{ fontSize: 200, zIndex: 10, display: 'flex' }}>🎙️</div>
        <div 
          style={{ 
            color: '#ffffff', 
            fontSize: 48, 
            fontWeight: 900, 
            marginTop: 10, 
            letterSpacing: 4,
            fontFamily: 'sans-serif',
            zIndex: 10,
            textShadow: '0 4px 10px rgba(0,0,0,0.5)'
          }}
        >
          GT
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
