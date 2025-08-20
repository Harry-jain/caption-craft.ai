import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Result: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { image, summary, caption } = (location.state || {}) as {
    image?: string;
    summary?: string;
    caption?: string;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownload = () => {
    if (!image || !caption) return;
    const link = document.createElement('a');
    const canvas = document.createElement('canvas');
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height + 60;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.font = 'bold 24px Inter, Poppins, sans-serif';
        ctx.fillStyle = '#222';
        ctx.textAlign = 'center';
        ctx.fillText(caption, canvas.width / 2, canvas.height - 20);
        link.href = canvas.toDataURL('image/png');
        link.download = 'captioned-image.png';
        link.click();
      }
    };
    img.src = image;
  };

  if (!image || !summary || !caption) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-gray-500 mb-4">No result to display.</div>
        <button
          className="py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold shadow hover:bg-blue-600 hover:shadow-lg transition"
          onClick={() => navigate('/')}
        >
          Try Another
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 flex flex-col items-center">
        <img src={image} alt="Uploaded" className="w-full max-h-64 object-contain rounded-md mb-4" />
        <div className="w-full mb-4">
          <label className="block text-gray-700 font-semibold mb-1">✅ Image Summary</label>
          <div className="flex items-center gap-2">
            <textarea
              className="w-full p-2 border rounded resize-none text-gray-700 bg-gray-50"
              value={summary}
              readOnly
              rows={3}
            />
            <button
              className="py-1 px-2 bg-gray-200 rounded hover:bg-gray-300 transition"
              onClick={() => handleCopy(summary)}
              title="Copy summary"
            >
              📋
            </button>
          </div>
        </div>
        <div className="w-full mb-4">
          <label className="block text-gray-700 font-semibold mb-1">✨ Final Caption</label>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-blue-600 bg-blue-50 rounded px-2 py-1">{caption}</span>
            <button
              className="py-1 px-2 bg-blue-200 rounded hover:bg-blue-300 transition"
              onClick={() => handleCopy(caption)}
              title="Copy caption"
            >
              📋
            </button>
          </div>
        </div>
        <div className="flex gap-2 w-full">
          <button
            className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold shadow hover:bg-blue-600 hover:shadow-lg transition"
            onClick={handleDownload}
          >
            Download with Caption
          </button>
          <button
            className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-semibold shadow hover:bg-gray-300 hover:shadow-lg transition"
            onClick={() => navigate('/')}
          >
            Try Another
          </button>
        </div>
      </div>
    </div>
  );
};

export default Result;
