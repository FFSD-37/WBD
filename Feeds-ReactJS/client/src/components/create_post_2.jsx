import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const ImageEditor = () => {
  const imgRef = useRef();
  const canvasRef = useRef();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [imageSrc, setImageSrc] = useState(null);
  const [scale, setScale] = useState(1);

  const [filters, setFilters] = useState({
    brt: 1,
    cnt: 1,
    gs: 0,
    inv: 0,
    opa: 1,
    sat: 1,
    sep: 0,
    blr: 0,
    hr: 0,
  });

  // Filter names for display
  const filterLabels = {
    brt: 'Brightness',
    cnt: 'Contrast',
    gs: 'Grayscale',
    inv: 'Invert',
    opa: 'Opacity',
    sat: 'Saturation',
    sep: 'Sepia',
    blr: 'Blur',
    hr: 'Hue Rotate',
  };

  // Load image from localStorage on mount
  useEffect(() => {
    if (!state || !state.fromCreatePost) {
      window.location.href = '/create_post';
      return;
    }

    const keys = Object.keys(localStorage).filter(k =>
      k.startsWith('uploadedFile_'),
    );
    if (!keys.length) return;

    const { data } = JSON.parse(localStorage.getItem(keys[0]));
    setImageSrc(data);
  }, []);

  // Apply filters live
  const filterStyle = `
    brightness(${filters.brt})
    contrast(${filters.cnt})
    grayscale(${filters.gs})
    invert(${filters.inv})
    opacity(${filters.opa})
    saturate(${filters.sat})
    sepia(${filters.sep})
    blur(${filters.blr}px)
    hue-rotate(${filters.hr}deg)
  `;

  // Zoom with mouse wheel
  const handleWheel = e => {
    let newScale = scale + e.deltaY * -0.001;
    newScale = Math.min(Math.max(0.5, newScale), 2);
    setScale(newScale);
  };

  // Update slider values
  const updateFilter = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: parseFloat(value),
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      brt: 1,
      cnt: 1,
      gs: 0,
      inv: 0,
      opa: 1,
      sat: 1,
      sep: 0,
      blr: 0,
      hr: 0,
    });
  };

  // Export edited image and submit
  const exportImage = () => {
    if (!imageSrc) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.src = imageSrc;
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      ctx.filter = filterStyle;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        blob => {
          const reader = new FileReader();
          reader.onload = () => {
            localStorage.setItem(
              'uploadedFile_0',
              JSON.stringify({
                name: 'edited-image.jpg',
                data: reader.result,
              }),
            );
          };
          reader.readAsDataURL(blob);
          navigate('/finalize_post', { state: { fromCreatePost: true } });
        },
        'image/jpeg',
        0.95,
      );
    };
  };

  return (
    <div className="flex h-screen bg-black text-white">
      {/* LEFT IMAGE PANEL */}
      <div
        className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden"
        onWheel={handleWheel}
      >
        {imageSrc && (
          <div className="relative max-w-4xl max-h-[80vh] flex items-center justify-center">
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{
                transform: `scale(${scale})`,
                filter: filterStyle,
                transition: 'filter 0.2s ease',
              }}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white">
              Scroll to zoom • {Math.round(scale * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* RIGHT FILTER PANEL */}
      <div className="flex flex-col h-screen w-full max-w-sm bg-gray-900 border-l border-gray-700 flex-shrink-0">
        {/* Panel Header */}
        <div className="flex-none !p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white mb-1">Edit Image</h2>
          <p className="text-gray-400 text-sm">Adjust filters and effects</p>
        </div>

        {/* Filters Container - Scrollable Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            {Object.entries(filters).map(([key, val]) => (
              <div key={key} className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-300 capitalize">
                    {filterLabels[key]}
                  </label>
                  <span className="text-xs text-gray-500 font-mono bg-gray-800 !px-2 !py-1 rounded">
                    {key === 'blr'
                      ? `${val}px`
                      : key === 'hr'
                        ? `${val}°`
                        : `${Math.round(val * 100)}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min={key === 'hr' ? 0 : 0}
                  max={
                    key === 'hr'
                      ? 360
                      : key === 'blr'
                        ? 20
                        : key === 'gs' ||
                            key === 'sep' ||
                            key === 'inv' ||
                            key === 'opa'
                          ? 1
                          : 4
                  }
                  step={key === 'blr' || key === 'hr' ? 1 : 0.05}
                  value={val}
                  onChange={e => updateFilter(key, e.target.value)}
                  className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer slider-thumb"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons - Fixed at Bottom */}
        <div className="flex-none !p-6 border-t border-gray-700 bg-gray-900 space-y-3">
          <button
            onClick={resetFilters}
            className="w-full !py-3.5 !px-4 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-all duration-200 border border-gray-600 font-medium active:scale-95"
          >
            Reset All Filters
          </button>

          <button
            onClick={exportImage}
            className="w-full !py-3.5 !px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transform transition-all duration-200 font-semibold shadow-lg active:scale-95"
          >
            Continue to Finalize
          </button>
        </div>
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ImageEditor;

<style>{`
  .slider-thumb::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 3px solid #1f2937;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }
  
  .slider-thumb::-webkit-slider-thumb:hover {
    background: #2563eb;
    transform: scale(1.1);
  }
  
  .slider-thumb::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 3px solid #1f2937;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }
  
  .slider-thumb::-moz-range-thumb:hover {
    background: #2563eb;
    transform: scale(1.1);
  }
`}</style>;
