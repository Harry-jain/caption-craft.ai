import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function useTypingEffect(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState('');
  React.useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text[i]);
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  image_name: string;
  description: string;
  caption: string;
  think?: string;
  image_hash?: string;
}

const Home: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [allCaptions, setAllCaptions] = useState<any>({});
  const [captionLoading, setCaptionLoading] = useState(false);
  const [think, setThink] = useState<string | null>(null);
  const [showThink, setShowThink] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [step, setStep] = useState<'upload'|'analyzing'|'result'>('upload');
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [localDriveModalOpen, setLocalDriveModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [toneModalOpen, setToneModalOpen] = useState(false);
  const [selectedTone, setSelectedTone] = useState<'instagram' | 'facebook' | 'linkedin' | ''>('');
  const [selectedModel, setSelectedModel] = useState<'gpt-oss' | 'deepseek' | ''>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Cloud import handlers (stub)
  const handleGoogleDriveImport = async () => {
    try {
      // Initialize Google Drive API
      const response = await fetch('/api/google-drive/auth');
      if (response.ok) {
        const authUrl = await response.text();
        window.open(authUrl, '_blank', 'width=500,height=600');
      } else {
        setError('Failed to connect to Google Drive');
      }
    } catch (error) {
      setError('Google Drive connection failed');
    }
    setCloudModalOpen(false);
  };
  const handleOneDriveImport = async () => {
    try {
      const response = await fetch('/api/onedrive/auth');
      if (response.ok) {
        const authUrl = await response.text();
        window.open(authUrl, '_blank', 'width=500,height=600');
      } else {
        setError('Failed to connect to OneDrive');
      }
    } catch (error) {
      setError('OneDrive connection failed');
    }
    setCloudModalOpen(false);
  };
  const handleDropboxImport = async () => {
    try {
      const response = await fetch('/api/dropbox/auth');
      if (response.ok) {
        const authUrl = await response.text();
        window.open(authUrl, '_blank', 'width=500,height=600');
      } else {
        setError('Failed to connect to Dropbox');
      }
    } catch (error) {
      setError('Dropbox connection failed');
    }
    setCloudModalOpen(false);
  };

  // Handle phone connection via WiFi
  const handleWiFiConnection = () => {
    // Create a local server for phone connection
    const ws = new WebSocket('ws://localhost:8080');
    ws.onopen = () => {
      setPhoneConnected(true);
      setError('');
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'image') {
        handleFileFromPhone(data.imageData);
      }
    };
    ws.onerror = () => {
      setError('WiFi connection failed. Please check your network.');
    };
  };

  // Handle Bluetooth connection
  const handleBluetoothConnection = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['image-transfer']
      });
      
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('image-transfer');
      const characteristic = await service.getCharacteristic('image-data');
      
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value;
        const imageData = new Uint8Array(value.buffer);
        handleFileFromPhone(imageData);
      });
      
      setPhoneConnected(true);
      setError('');
    } catch (error) {
      setError('Bluetooth connection failed. Please ensure Bluetooth is enabled.');
    }
  };

  // Handle file sharing (Web Share API)
  const handleFileSharing = async () => {
    try {
      if (navigator.share) {
        const response = await fetch('/api/share-endpoint');
        const shareUrl = await response.text();
        
        await navigator.share({
          title: 'Upload Image to AI Caption Generator',
          text: 'Share an image to generate captions',
          url: shareUrl
        });
      } else {
        setError('File sharing not supported on this device');
      }
    } catch (error) {
      setError('File sharing failed');
    }
  };

  // Handle file received from phone
  const handleFileFromPhone = (fileData: Uint8Array) => {
    try {
      const blob = new Blob([fileData], { type: 'image/jpeg' });
      const file = new File([blob], 'phone-image.jpg', { type: 'image/jpeg' });
      handleFileChange({ target: { files: [file] } });
      setPhoneConnected(false);
      setPhoneModalOpen(false);
    } catch (error) {
      setError('Failed to process image from phone');
    }
  };

  // Share caption + image to platforms using Web Share API with fallbacks
  const shareCaptionWithImage = async (platform: 'instagram' | 'facebook' | 'linkedin', captionText: string) => {
    try {
      // Prefer Web Share API v2 with files if available
      if (image && (navigator as any).canShare && (navigator as any).canShare({ files: [image] }) && (navigator as any).share) {
        await (navigator as any).share({
          title: 'Share Captioned Image',
          text: captionText,
          files: [image]
        });
        return;
      }

      // Fallbacks per platform
      const imgUrl = preview || window.location.href;
      if (platform === 'facebook') {
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(imgUrl)}&quote=${encodeURIComponent(captionText)}`;
        window.open(fbUrl, '_blank');
        return;
      }
      if (platform === 'linkedin') {
        // LinkedIn ignores prefilled text; open share dialog and copy caption
        const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(imgUrl)}`;
        await navigator.clipboard.writeText(captionText);
        window.open(liUrl, '_blank');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      if (platform === 'instagram') {
        // No official web share; copy caption and open Instagram
        await navigator.clipboard.writeText(captionText);
        window.open('https://www.instagram.com/', '_blank');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (e) {
      setError('Sharing failed. Your browser may not support direct sharing.');
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch('http://localhost:8000/api/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const deleteHistoryEntry = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/history/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setHistory(history.filter(entry => entry.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete history entry:', error);
    }
  };

  const clearHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/history', {
        method: 'DELETE',
      });
      if (response.ok) {
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const loadHistoryEntry = async (entryId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/history/${entryId}`);
      if (res.ok) {
        const entry = await res.json();
        setDescription(entry.description);
        setCaption(entry.caption);
        setThink(entry.think);
        setShowThink(!!entry.think);
        // For history entries, we don't have all captions, so we'll create a simple object
        setAllCaptions({ short: entry.caption, quote: entry.caption });
        setTimeout(() => setShowCaption(true), 1000 + (entry.think ? entry.think.length * 30 : 0));
        setStep('result');
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Failed to load history entry:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
      setDescription(null);
      setCaption(null);
      setThink(null);
      setShowThink(false);
      setShowCaption(false);
      setCopied(false);
      setStep('upload');
    } else {
      setError('Please select a JPG or PNG image.');
      setImage(null);
      setPreview(null);
      setDescription(null);
      setCaption(null);
      setThink(null);
      setShowThink(false);
      setShowCaption(false);
      setCopied(false);
      setStep('upload');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setError(null);
      setDescription(null);
      setCaption(null);
      setThink(null);
      setShowThink(false);
      setShowCaption(false);
      setCopied(false);
      setStep('upload');
    } else {
      setError('Please select a JPG or PNG image.');
      setImage(null);
      setPreview(null);
      setDescription(null);
      setCaption(null);
      setThink(null);
      setShowThink(false);
      setShowCaption(false);
      setCopied(false);
      setStep('upload');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const parseDescription = (desc: string) => {
    try {
      const parsed = JSON.parse(desc);
      let readable = '';
      if (parsed.people) readable += `👥 People: ${parsed.people}\n\n`;
      if (parsed.emotion) readable += `😊 Emotion: ${parsed.emotion}\n\n`;
      if (parsed.setting) readable += `🌍 Setting: ${parsed.setting}\n\n`;
      if (parsed.actions) readable += `🏃 Actions: ${parsed.actions}\n\n`;
      if (parsed.overall_vibe) readable += `✨ Vibe: ${parsed.overall_vibe}\n\n`;
      return readable.trim() || desc;
    } catch {
      return desc;
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    // Ask for tone before proceeding
    setToneModalOpen(true);
  };

  const proceedAnalyzeWithTone = async () => {
    if (!image) return;
    setStep('analyzing');
    setLoading(true);
    setError(null);
    setDescription(null);
    setCaption(null);
    setThink(null);
    setShowThink(false);
    setShowCaption(false);
    setCopied(false);
    const formData = new FormData();
    formData.append('file', image);
    try {
      const res = await fetch('http://localhost:8000/api/describe', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to process image.');
      const data = await res.json();
      
      // Check if this is a duplicate image
      if (data.is_duplicate) {
        setDescription(data.description);
        // For duplicates, we still generate new captions using the stored description
        console.log('Duplicate image detected, using stored description for new captions');
        console.log('Duplicate data:', data);
      }
      
      setDescription(data.description);
      setCaptionLoading(true);
      
      const captionRequest = { 
        description: data.description, 
        image_name: image.name || 'Uploaded Image',
        image_hash: data.image_hash,
        tone: selectedTone || undefined,
        model_id: selectedModel === 'gpt-oss' ? 'openai/gpt-oss-120b:together' : 
                  selectedModel === 'deepseek' ? 'deepseek-ai/DeepSeek-R1:fireworks-ai' : undefined
      };
      console.log('Sending caption request:', captionRequest);
      
      const capRes = await fetch('http://localhost:8000/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(captionRequest),
      });
      if (!capRes.ok) {
        const errorText = await capRes.text();
        throw new Error(`Failed to generate caption: ${capRes.status} - ${errorText}`);
      }
      
      const capData = await capRes.json();
      console.log('Caption response:', capData); // Debug log
      
      if (capData.error) {
        throw new Error(capData.error);
      }
      
      const captions = capData.caption || {};
      const thinkText = capData.think || null;
      
      console.log('Parsed captions:', captions); // Debug log
      
              // Use the short caption as the primary caption
        const shortCaption = captions.short || captions.story || captions.philosophy || captions.lifestyle || captions.quote || 'No caption generated';
      
      setThink(thinkText);
      setCaption(shortCaption);
      setAllCaptions(captions);
      setShowThink(!!thinkText);
      setTimeout(() => setShowCaption(true), 200 + (thinkText ? thinkText.length * 10 : 0));
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
      setStep('upload');
    } finally {
      setLoading(false);
      setCaptionLoading(false);
    }
  };

  const handleAnalyzeNext = () => {
    handleReset();
  };

  const handleCopyCaption = () => {
    if (caption) {
      navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setImage(null);
    setPreview(null);
    setError(null);
    setDescription(null);
    setCaption(null);
    setAllCaptions({});
    setThink(null);
    setShowThink(false);
    setShowCaption(false);
    setCopied(false);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const thinkTyped = useTypingEffect(think || '', 8);
  const descriptionTyped = useTypingEffect(description ? parseDescription(description) : '', 5);

  // Motivational quotes for loading states
  const quotes = [
    "AI is analyzing your image with precision... ✨",
    "Crafting the perfect caption for your moment... 🎨",
    "Transforming pixels into poetry... 📝",
    "Finding the story behind your image... 📖",
    "Creating magic from your memories... 🌟",
    "Unleashing creativity from your visual story... 🚀",
    "Weaving words around your captured moment... 🕸️",
    "Brewing the perfect blend of art and words... ☕",
    "Painting emotions with digital brushstrokes... 🎭",
    "Orchestrating the symphony of your image... 🎼"
  ];

  const [currentQuote, setCurrentQuote] = useState(quotes[0]);

  useEffect(() => {
    if (loading || captionLoading) {
      const interval = setInterval(() => {
        setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [loading, captionLoading]);

  // Generate QR code for phone connection
  useEffect(() => {
    if (phoneModalOpen) {
      // Generate a unique URL for phone connection
      const connectionUrl = `${window.location.origin}/upload?session=${Date.now()}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(connectionUrl)}`);
    }
  }, [phoneModalOpen]);

  // Handle local drive file selection
  const handleLocalDriveFiles = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files).filter(file => 
        file.type.startsWith('image/') && (file.type.includes('jpeg') || file.type.includes('png'))
      );
      setSelectedFiles(fileArray);
    }
  };

  // Handle upload from local drive
  const handleUploadFromLocalDrive = () => {
    if (selectedFiles.length > 0) {
      handleFileChange({ target: { files: [selectedFiles[0]] } });
      setLocalDriveModalOpen(false);
      setSelectedFiles([]);
    }
  };



  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' 
        : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-opacity-90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)} 
                className={`p-3 rounded-lg transition-colors shadow-lg hover:scale-110 ${
                  darkMode ? 'bg-gray-800/80 text-white' : 'bg-white/80 text-gray-700'
                }`}
                title="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className={`text-2xl font-bold ${
                  darkMode 
                    ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'
                }`}>
                  AI-Powered Caption Generator
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Transform your images into engaging social media content
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowHistory(true); loadHistory(); }}
                className={`p-3 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                    : 'bg-white hover:bg-gray-100 text-gray-700'
                } shadow-lg`}
                title="View History"
              >
                📚
              </button>
              <button
                onClick={toggleDarkMode}
                className={`p-3 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                    : 'bg-white hover:bg-gray-100 text-gray-700'
                } shadow-lg`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}></div>
          <div className={`absolute top-0 left-0 h-full w-80 transform transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${darkMode ? 'bg-gray-900' : 'bg-white'} shadow-2xl`}>
            <div className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Menu</h2>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex-1 space-y-4">
                <button 
                  onClick={() => { setShowHistory(true); loadHistory(); setSidebarOpen(false); }}
                  className={`w-full text-left p-4 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📚</span>
                    <div>
                      <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>History</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>View your past captions</div>
                    </div>
                  </div>
                </button>
                
                <button 
                  onClick={toggleDarkMode}
                  className={`w-full text-left p-4 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{darkMode ? '☀️' : '🌙'}</span>
                    <div>
                      <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {darkMode ? 'Light Mode' : 'Dark Mode'}
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Toggle theme</div>
                    </div>
                  </div>
                </button>
                
                <button 
                  onClick={() => { setCloudModalOpen(true); setSidebarOpen(false); }}
                  className={`w-full text-left p-4 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">☁️</span>
                    <div>
                      <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Import from Cloud</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Google Drive, OneDrive, Dropbox</div>
                    </div>
                  </div>
                </button>
              </div>
              
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-auto pt-4 border-t ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                AI Caption App v1.0<br/>By Your Team
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Cloud Import Modal */}
      {cloudModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className={`rounded-2xl shadow-xl p-6 w-full max-w-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Import from Cloud</h2>
              <button
                onClick={() => setCloudModalOpen(false)}
                className={`p-2 rounded-full ${darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Choose Your Cloud Service
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Connect your cloud storage to import images directly
                </p>
              </div>
              
              <button
                onClick={handleGoogleDriveImport}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center ${darkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} transition-colors duration-200`}
              >
                <img src="https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png" alt="Google Drive" className="w-6 h-6 mr-3" />
                Google Drive
              </button>
              <button
                onClick={handleOneDriveImport}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center ${darkMode ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-green-600 hover:bg-green-700 text-white'} transition-colors duration-200`}
              >
                <img src="https://img.icons8.com/color/48/000000/onedrive.png" alt="OneDrive" className="w-6 h-6 mr-3" />
                OneDrive
              </button>
              <button
                onClick={handleDropboxImport}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center ${darkMode ? 'bg-blue-800 hover:bg-blue-900 text-white' : 'bg-blue-700 hover:bg-blue-800 text-white'} transition-colors duration-200`}
              >
                <img src="https://img.icons8.com/color/48/000000/dropbox.png" alt="Dropbox" className="w-6 h-6 mr-3" />
                Dropbox
              </button>
              
              <div className="border-t pt-4 mt-4">
                <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Quick Share Options
                </h4>
                <button
                  onClick={handleFileSharing}
                  className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center ${darkMode ? 'bg-purple-700 hover:bg-purple-800 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'} transition-colors duration-200`}
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share via Native Apps
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-4 py-6 h-[calc(100vh-120px)] overflow-hidden">
        {!preview ? (
          // Initial state - centered large upload area
          <div className="flex items-center justify-center h-full">
            <div className={`w-full max-w-2xl rounded-2xl shadow-xl p-8 border transition-all duration-500 ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-100'
            }`}>
              <div
                className={`w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                  darkMode 
                    ? 'border-gray-600 hover:border-blue-400 hover:bg-gray-700' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
                onClick={handleUploadClick}
              >
                <div className="p-16 text-center">
                  <svg className={`w-24 h-24 mb-6 mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Upload Your Image
                  </h2>
                  <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                    Drop image here or click to select
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-8`}>
                    Supports JPG and PNG formats
                  </p>
                  
                  {/* Quick access buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setLocalDriveModalOpen(true)}
                      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                        darkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zM5 10a2 2 0 012-2h10a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2zM7 5a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2V5z" />
                      </svg>
                      Add from Drive
                    </button>
                    
                    <button
                      onClick={() => setPhoneModalOpen(true)}
                      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                        darkMode 
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl' 
                          : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Add from Phone
                    </button>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>
        ) : (
          // Two-column layout when image is uploaded
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full animate-fade-in overflow-hidden">
            {/* Left section - Image upload and captions */}
            <div className="flex flex-col space-y-4 h-full overflow-hidden">
              {/* Image upload section */}
              <div className={`rounded-2xl shadow-xl p-4 border transition-all duration-700 ease-out flex-shrink-0 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-100'
              } ${step === 'analyzing' ? 'transform -translate-x-4 scale-95' : 'transform translate-x-0 scale-100'}`}>
                <div
                  className={`w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                    darkMode 
                      ? 'border-gray-600 hover:border-blue-400 hover:bg-gray-700' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
          onClick={handleUploadClick}
        >
          {preview ? (
                    <div className="relative w-full h-40 animate-fade-in">
                      <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-lg transition-all duration-500" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <svg className={`w-10 h-10 mb-2 mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Drop image here or click to select</p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Supports JPG and PNG formats</p>
                    </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>

                {error && (
                  <div className={`mb-3 p-2 rounded-lg flex items-center ${
                    darkMode ? 'bg-red-900 border border-red-700' : 'bg-red-50 border border-red-200'
                  }`}>
                    <svg className="w-4 h-4 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-700'}`}>{error}</span>
                  </div>
                )}

                {preview && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleAnalyze}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      disabled={!image || loading || step !== 'upload'}
                    >
                      {loading || step === 'analyzing' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          {loading ? 'Analyzing Image...' : 'Generating Caption...'}
                        </>
                      ) : (
                        <>
                          <span className="text-lg">🧠</span>
                          Analyze Image
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleAnalyzeNext}
                      className="flex-1 py-2 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      disabled={loading || step === 'analyzing'}
                    >
                      <span className="text-lg">🔄</span>
                      Analyze Next
                    </button>
                  </div>
                )}
              </div>

              {/* Captions section */}
              {showCaption && caption && (
                <div className={`rounded-2xl shadow-xl p-4 border transition-all duration-500 flex-1 overflow-y-auto custom-scrollbar ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                } animate-fade-in`}>
                  <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>✨ Generated Captions</h3>
                  <div className="space-y-2">
                    {Object.entries(allCaptions).map(([style, captionText], index) => (
                      <div key={style} className={`p-3 rounded-lg border relative ${
                        darkMode ? 'bg-blue-900 border-blue-700' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-10">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                                {style.charAt(0).toUpperCase() + style.slice(1)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                darkMode ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {style === 'short' ? 'Primary' : style === 'story' ? 'Narrative' : style === 'philosophy' ? 'Thoughtful' : style === 'lifestyle' ? 'Lifestyle' : 'Inspirational'}
                              </span>
                            </div>
                            <p className={`font-semibold text-base leading-relaxed ${
                              darkMode ? 'text-blue-200' : 'text-blue-900'
                            }`}>
                              {captionText as string}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <button
                              className={`p-1.5 rounded-lg transition-colors ${
                                darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                              onClick={() => {
                                navigator.clipboard.writeText(captionText as string);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              }}
                              title="Copy to clipboard"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <div className="flex gap-1">
                              <button
                                className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-pink-500 hover:bg-pink-600 text-white'}`}
                                title="Share to Instagram"
                                onClick={() => shareCaptionWithImage('instagram', captionText as string)}
                              >
                                IG
                              </button>
                              <button
                                className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                title="Share to Facebook"
                                onClick={() => shareCaptionWithImage('facebook', captionText as string)}
                              >
                                FB
                              </button>
                              <button
                                className={`px-2 py-1 text-xs rounded ${darkMode ? 'bg-sky-700 hover:bg-sky-800 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
                                title="Share to LinkedIn"
                                onClick={() => shareCaptionWithImage('linkedin', captionText as string)}
                              >
                                in
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right section - Description and reasoning */}
            <div className="flex flex-col space-y-4 h-full overflow-hidden">
              {/* Description section with loading state */}
              {loading && !description ? (
                <div className={`rounded-2xl shadow-xl p-4 border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                } h-1/2 animate-fade-in overflow-hidden relative`}>
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  
                  <div className="relative z-10 flex flex-col items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'} text-center mb-4`}>
                      {currentQuote}
                    </p>
                    {/* Skeleton lines below the quote */}
                    <div className={`h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4 mb-2 animate-pulse ${
                      darkMode ? 'from-gray-600 to-gray-700' : 'from-gray-200 to-gray-300'
                    }`}></div>
                    <div className={`h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-full mb-2 animate-pulse ${
                      darkMode ? 'from-gray-600 to-gray-700' : 'from-gray-200 to-gray-300'
                    }`}></div>
                    <div className={`h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/2 animate-pulse ${
                      darkMode ? 'from-gray-600 to-gray-700' : 'from-gray-200 to-gray-300'
                    }`}></div>
                  </div>
                </div>
              ) : description ? (
                <div className={`rounded-2xl shadow-xl p-4 border transition-all duration-500 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                } animate-fade-in h-1/2 overflow-y-auto custom-scrollbar`}>
                  <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>✅ Image Description</h3>
                  <div className={`p-3 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <p className={`leading-relaxed whitespace-pre-line text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {descriptionTyped}
                      {descriptionTyped.length < (description ? parseDescription(description).length : 0) && <span className="blink">|</span>}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Reasoning section with loading state */}
              {captionLoading && !showThink ? (
                <div className={`rounded-2xl shadow-xl p-4 border ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                } h-1/2 animate-fade-in overflow-hidden relative`}>
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent animate-shimmer"></div>
                  
                  <div className="relative z-10 flex flex-col items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'} text-center mb-4`}>
                      {currentQuote}
                    </p>
                    {/* Skeleton lines below the quote */}
                    <div className={`h-3 bg-gradient-to-r from-yellow-200 to-yellow-300 rounded animate-pulse ${
                      darkMode ? 'from-yellow-700 to-yellow-600' : 'from-yellow-200 to-yellow-300'
                    }`}></div>
                    <div className={`h-3 bg-gradient-to-r from-yellow-200 to-yellow-300 rounded w-4/5 animate-pulse mt-2 ${
                      darkMode ? 'from-yellow-700 to-yellow-600' : 'from-yellow-200 to-yellow-300'
                    }`}></div>
                    <div className={`h-3 bg-gradient-to-r from-yellow-200 to-yellow-300 rounded w-3/4 animate-pulse mt-2 ${
                      darkMode ? 'from-yellow-700 to-yellow-600' : 'from-yellow-200 to-yellow-300'
                    }`}></div>
                  </div>
                </div>
              ) : showThink && think ? (
                <div className={`rounded-2xl shadow-xl p-4 border transition-all duration-500 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                } animate-fade-in h-1/2 overflow-y-auto custom-scrollbar`}>
                  <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>🤔 Model Reasoning</h3>
                  <div className={`p-3 rounded-lg border shadow-sm ${
                    darkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                  }`}>
                    <p className={`font-mono text-xs leading-relaxed whitespace-pre-line max-h-full overflow-y-auto ${
                      darkMode ? 'text-yellow-200' : 'text-gray-800'
                    }`}>
                      {thinkTyped}
                      {thinkTyped.length < (think?.length || 0) && <span className="blink">|</span>}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Tone and Model Selection Modal */}
      {toneModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Choose Caption Settings</h2>
              <button
                onClick={() => { setToneModalOpen(false); }}
                className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                title="Close"
              >
                ✖
              </button>
            </div>
            
            {/* Model Selection */}
            <div className="mb-4">
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Select AI Model:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`py-2 rounded-lg font-semibold ${selectedModel === 'gpt-oss' ? (darkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white') : (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800')}`}
                  onClick={() => setSelectedModel('gpt-oss')}
                >
                  GPT-OSS 120B
                </button>
                <button
                  className={`py-2 rounded-lg font-semibold ${selectedModel === 'deepseek' ? (darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white') : (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800')}`}
                  onClick={() => setSelectedModel('deepseek')}
                >
                  DeepSeek-R1
                </button>
              </div>
            </div>

            {/* Tone Selection */}
            <div className="mb-4">
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Select Platform Tone:</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  className={`w-full py-2 rounded-lg font-semibold ${selectedTone === 'instagram' ? (darkMode ? 'bg-pink-600 text-white' : 'bg-pink-500 text-white') : (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800')}`}
                  onClick={() => setSelectedTone('instagram')}
                >
                  Instagram
                </button>
                <button
                  className={`w-full py-2 rounded-lg font-semibold ${selectedTone === 'facebook' ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white') : (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800')}`}
                  onClick={() => setSelectedTone('facebook')}
                >
                  Facebook
                </button>
                <button
                  className={`w-full py-2 rounded-lg font-semibold ${selectedTone === 'linkedin' ? (darkMode ? 'bg-sky-700 text-white' : 'bg-sky-600 text-white') : (darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800')}`}
                  onClick={() => setSelectedTone('linkedin')}
                >
                  LinkedIn
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} px-4 py-2 rounded-lg`}
                onClick={() => { setToneModalOpen(false); setSelectedTone(''); setSelectedModel(''); }}
              >
                Cancel
              </button>
              <button
                className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'} px-4 py-2 rounded-lg`}
                onClick={async () => { setToneModalOpen(false); await proceedAnalyzeWithTone(); }}
                disabled={loading || !selectedModel}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-xl p-6 overflow-hidden ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>History</h2>
              <div className="flex gap-2">
                <button
                  onClick={clearHistory}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowHistory(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[70vh]">
              {loadingHistory ? (
                <div className="flex justify-center items-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : history.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No history yet. Start generating captions to see them here!
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {history.map((entry) => (
                    <div 
                      key={entry.id} 
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => loadHistoryEntry(entry.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {entry.image_name}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHistoryEntry(entry.id);
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      <div className="space-y-2">
                        <div>
                          <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Description: </span>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>{parseDescription(entry.description)}</span>
                        </div>
                        <div>
                          <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Caption: </span>
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-800'}>{entry.caption}</span>
                        </div>
                        {entry.think && (
                          <div>
                            <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Reasoning: </span>
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{entry.think}</span>
                          </div>
                        )}
                      </div>
                      <div className={`mt-3 text-xs text-center py-1 rounded ${
                        darkMode ? 'bg-blue-600 text-blue-200' : 'bg-blue-100 text-blue-700'
                      }`}>
                        Click to load this session
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phone Connection Modal */}
      {phoneModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-2xl shadow-xl p-6 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Connect Your Phone
              </h2>
              <button 
                onClick={() => setPhoneModalOpen(false)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Connect Your Phone via WiFi or Bluetooth
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  To send images from your phone to this app, you need to establish a connection.
                  You can choose between WiFi and Bluetooth.
                </p>
              </div>
              
              <button 
                onClick={handleWiFiConnection}
                className={`w-full p-4 rounded-lg transition-colors flex items-center justify-center gap-3 ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <span className="text-2xl">📱</span>
                <div className="text-left">
                  <div className="font-semibold">WiFi Connection</div>
                  <div className="text-sm opacity-90">Send images via your local network</div>
                </div>
              </button>
              
              <button 
                onClick={handleBluetoothConnection}
                className={`w-full p-4 rounded-lg transition-colors flex items-center justify-center gap-3 ${
                  darkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
              >
                <span className="text-2xl">💻</span>
                <div className="text-left">
                  <div className="font-semibold">Bluetooth Connection</div>
                  <div className="text-sm opacity-90">Send images via Bluetooth</div>
                </div>
              </button>
            </div>
            
            <button 
              onClick={() => setPhoneModalOpen(false)}
              className={`mt-6 w-full py-2 rounded-lg transition-colors ${
                darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Local Drive Upload Modal */}
      {localDriveModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md rounded-2xl shadow-xl p-6 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Upload from Local Drive
              </h2>
              <button 
                onClick={() => setLocalDriveModalOpen(false)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Select an Image from Your Computer
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Click "Choose Files" to select an image from your local drive.
                  Only JPG and PNG files are supported.
                </p>
              </div>
              
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                className="hidden"
                onChange={(e) => handleLocalDriveFiles(e.target.files)}
              />
              
              <button
                onClick={() => document.getElementById('local-file-input')?.click()}
                className={`w-full p-4 rounded-lg transition-colors flex items-center justify-center gap-3 ${
                  darkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                <span className="text-2xl">📁</span>
                <div className="text-left">
                  <div className="font-semibold">Choose Files</div>
                  <div className="text-sm opacity-90">Select one or multiple images</div>
                </div>
              </button>

              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                      <span className="text-sm">{file.name}</span>
                      <button
                        onClick={() => {
                          const newSelectedFiles = selectedFiles.filter((_, i) => i !== index);
                          setSelectedFiles(newSelectedFiles);
                        }}
                        className="text-red-500 hover:text-red-700"
                        title="Remove"
                      >
                        ✗
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleUploadFromLocalDrive}
                className={`w-full py-2 rounded-lg transition-colors ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                disabled={selectedFiles.length === 0}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Upload Selected Images"
                )}
              </button>
            </div>
            
        <button
              onClick={() => setLocalDriveModalOpen(false)}
              className={`mt-6 w-full py-2 rounded-lg transition-colors ${
                darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cancel
        </button>
      </div>
        </div>
      )}

      <style>{`
        .animate-fade-in { animation: fadeIn 0.7s ease-out; }
        @keyframes fadeIn { 
          from { opacity: 0; transform: translateY(20px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .blink { animation: blink 1s steps(2, start) infinite; }
        @keyframes blink { to { visibility: hidden; } }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${darkMode ? 'rgba(156, 163, 175, 0.5)' : 'rgba(156, 163, 175, 0.3)'};
          border-radius: 3px;
          transition: all 0.3s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? 'rgba(156, 163, 175, 0.8)' : 'rgba(156, 163, 175, 0.6)'};
        }
        
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${darkMode ? 'rgba(156, 163, 175, 0.5) transparent' : 'rgba(156, 163, 175, 0.3) transparent'};
        }
      `}</style>
    </div>
  );
};

export default Home;
