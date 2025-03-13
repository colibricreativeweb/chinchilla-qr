import React, { useState, useEffect } from 'react';
import './App.css';
import translations from './translations.json';

const App = () => {
  // State management
  const [activeTab, setActiveTab] = useState('vcard');
  const [isDark, setIsDark] = useState(() => {
    const storedIsDark = localStorage.getItem('isDark');
    return storedIsDark ? JSON.parse(storedIsDark) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem('selectedLanguage') || 'en';
  });
  const [logoData, setLogoData] = useState(null);
  const [isNegative, setIsNegative] = useState(false);

  // vCard data structure
  const [vCardData, setVCardData] = useState({
    firstName: '',
    lastName: '',
    position: '',
    company: '',
    phone: '',
    email: '',
    note: '',
  });
  const [textData, setTextData] = useState('');
  const [urlData, setUrlData] = useState('');
  const [qrResolution, setQrResolution] = useState('200');
  const [currentYear] = useState(new Date().getFullYear());

  // Dark mode and language preferences
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDark(e.matches);
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedLanguage', selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    localStorage.setItem('isDark', JSON.stringify(isDark));
  }, [isDark]);

  // vCard generation
  const generateVCard = () => {
    const vCard = `BEGIN:VCARD  
VERSION:3.0  
N:${vCardData.lastName};${vCardData.firstName};;;  
FN:${vCardData.firstName} ${vCardData.lastName}  
${vCardData.position ? `TITLE:${vCardData.position}\n` : ''}  
${vCardData.company ? `ORG:${vCardData.company}\n` : ''}  
TEL;TYPE=CELL:${vCardData.phone}  
EMAIL:${vCardData.email}  
NOTE:${vCardData.note}  
END:VCARD`;
    return encodeURIComponent(vCard);
  };

  // QR code generation utilities
  const getQRCodeUrl = (data, type = 'text') => {
    const finalData = type === 'vcard' ? generateVCard() : encodeURIComponent(data);
    const color = isNegative ? 'ffffff' : '000000';
    const bgColor = isNegative ? '000000' : 'ffffff';
    return `https://api.qrserver.com/v1/create-qr-code/?size=${qrResolution}x${qrResolution}&data=${finalData}&color=${color}&bgcolor=${bgColor}`;
  };

  const downloadQR = async (data, type, filename) => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 300;
    let attempt = 0;
  
    const errorHandler = (error) => {
      console.error(`Attempt ${attempt} failed:`, error);
      alert(translations[selectedLanguage]['downloadError']);
    };
  
    const tryDownload = async () => {
      try {
        attempt++;
        // Strategy 1: Direct base64 download for Telegram
        if (window.Telegram?.WebApp?.downloadFile) {
          const qrUrl = getQRCodeUrl(data, type);
          const response = await fetch(qrUrl);
          if (!response.ok) throw new Error('Network response error');
          
          // Convert directly to base64
          const buffer = await response.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          window.Telegram.WebApp.downloadFile(base64, `${filename}.png`);
          return;
        }
  
        // Strategy 2: Canvas-based download with forced user gesture
        const canvas = await generateQRCanvas(data, type);
        if (!canvas) throw new Error('Canvas generation failed');
  
        // Strategy 3: Mixed blob/base64 approach
        const blob = await new Promise(resolve => 
          canvas.toBlob(resolve, 'image/png', 1)
        );
        
        // Strategy 4: Multiple download methods
        const finalAttempt = async () => {
          try {
            // Method 4a: Direct file API
            if (window.Telegram?.WebApp?.openLink) {
              const dataUrl = canvas.toDataURL();
              window.Telegram.WebApp.openLink(dataUrl);
              return;
            }
  
            // Method 4b: Simulated click with blob
            const url = URL.createObjectURL(blob);
            const tempLink = document.createElement('a');
            tempLink.href = url;
            tempLink.download = `${filename}.png`;
            tempLink.style.display = 'none';
            
            // iOS requires actual user interaction
            const clickEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            
            document.body.appendChild(tempLink);
            tempLink.dispatchEvent(clickEvent);
            
            // Cleanup with retry safeguard
            setTimeout(() => {
              document.body.removeChild(tempLink);
              URL.revokeObjectURL(url);
            }, 1000);
  
          } catch (error) {
            // Final fallback: Open in new tab
            const dataUrl = canvas.toDataURL();
            window.open(dataUrl, '_blank');
          }
        };
  
        // Execute final attempt sequence
        await finalAttempt();
  
      } catch (error) {
        if (attempt < MAX_RETRIES) {
          setTimeout(tryDownload, RETRY_DELAY);
        } else {
          errorHandler(error);
        }
      }
    };
  
    // Initial execution
    try {
      await tryDownload();
    } catch (finalError) {
      errorHandler(finalError);
    }
  };
  
  // Canvas generation with validation
  const generateQRCanvas = async (data, type) => {
    try {
      const qrUrl = getQRCodeUrl(data, type);
      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error('Invalid QR code response');
  
      const imgBlob = await response.blob();
      const imgUrl = URL.createObjectURL(imgBlob);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Load image with timeout
      const img = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => 
          reject(new Error('Image load timeout')), 5000);
        
        const img = new Image();
        img.onload = () => {
          clearTimeout(timer);
          resolve(img);
        };
        img.onerror = reject;
        img.src = imgUrl;
      });
  
      // Set canvas dimensions
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
  
      // Add logo if present
      if (logoData) {
        const logoImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = logoData;
        });
  
        const logoSize = Math.min(canvas.width * 0.2, canvas.height * 0.2);
        const x = (canvas.width - logoSize) / 2;
        const y = (canvas.height - logoSize) / 2;
  
        ctx.fillStyle = isNegative ? '#000000' : '#ffffff';
        ctx.fillRect(x, y, logoSize, logoSize);
        ctx.drawImage(logoImg, x, y, logoSize, logoSize);
      }
  
      // Validate canvas content
      const imageData = ctx.getImageData(0, 0, 1, 1).data;
      if (imageData.every(channel => channel === 0)) {
        throw new Error('Blank canvas generated');
      }
  
      return canvas;
  
    } catch (error) {
      console.error('Canvas generation failed:', error);
      return null;
    }
  };

  // Helper functions
  const blobToDataURL = blob =>
    new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });

  const loadImage = src =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });

  // UI handlers
  const toggleDarkMode = () => setIsDark(prev => !prev);
  const handleLanguageChange = (event) => setSelectedLanguage(event.target.value);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 dark' : 'bg-gray-100 transition-colors duration-300'}`}>
      <div className="px-4 py-8 mx-auto max-w-2xl">
        {/* Header section */}
        <div className="flex items-center mb-4">
          <div className="flex justify-center items-center mr-2 w-10 h-10 bg-gray-300 rounded-full dark:bg-gray-700">
            <img className="w-12" src="chinchillaqr.webp" alt="Chinchilla QR Logo" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chinchilla QR</h1>
        </div>

        {/* Control bar */}
        <div className="flex justify-between items-center mt-2 mb-4">
          <div className="inline-flex p-1 bg-gray-200 rounded-lg dark:bg-gray-800">
            {['vcard', 'text', 'url'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors  
          ${activeTab === tab
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {translations[selectedLanguage][tab]}
              </button>
            ))}
          </div>
          <div className="flex items-center">
            <select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              className="px-2 py-1 ml-4 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
            <button
              onClick={toggleDarkMode}
              className="flex justify-center items-center p-2 ml-2 w-10 h-10 text-white rounded-full transition-colors duration-300 bg-neutral-400 hover:bg-neutral-500 dark:bg-gray-700"
            >
              {isDark ? '🌞' : '🌜'}
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="p-6 bg-white rounded-2xl shadow-sm dark:bg-gray-800">
          {activeTab === 'vcard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Personal information fields */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['firstName']}</label>
                  <input
                    type="text"
                    value={vCardData.firstName}
                    onChange={(e) => setVCardData({ ...vCardData, firstName: e.target.value })}
                    className="px-4 py-3 w-full text-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={translations[selectedLanguage]['placeholderFirstName']}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['lastName']}</label>
                  <input
                    type="text"
                    value={vCardData.lastName}
                    onChange={(e) => setVCardData({ ...vCardData, lastName: e.target.value })}
                    className="px-4 py-3 w-full text-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={translations[selectedLanguage]['placeholderLastName']}
                  />
                </div>

                {/* Professional information */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['position']}</label>
                  <input
                    type="text"
                    value={vCardData.position}
                    onChange={(e) => setVCardData({ ...vCardData, position: e.target.value })}
                    className="px-4 py-3 w-full text-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={translations[selectedLanguage]['placeholderPosition']}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['company']}</label>
                  <input
                    type="text"
                    value={vCardData.company}
                    onChange={(e) => setVCardData({ ...vCardData, company: e.target.value })}
                    className="px-4 py-3 w-full text-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={translations[selectedLanguage]['placeholderCompany']}
                  />
                </div>

                {/* Contact information */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['phone']}</label>
                  <input
                    type="tel"
                    value={vCardData.phone}
                    onChange={(e) => setVCardData({ ...vCardData, phone: e.target.value })}
                    className="px-4 py-3 w-full text-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={translations[selectedLanguage]['placeholderPhone']}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['email']}</label>
                  <input
                    type="email"
                    value={vCardData.email}
                    onChange={(e) => setVCardData({ ...vCardData, email: e.target.value })}
                    className="px-4 py-3 w-full text-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={translations[selectedLanguage]['placeholderEmail']}
                  />
                </div>

                {/* Note field */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['note']}</label>
                  <input
                    type="text"
                    value={vCardData.note}
                    onChange={(e) => setVCardData({ ...vCardData, note: e.target.value })}
                    className="px-4 py-3 w-full text-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={translations[selectedLanguage]['placeholderNote']}
                  />
                </div>

                {/* Note field */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['selectResolution']}</label>
                  <div className="flex items-center mt-2">
                    <select
                      value={qrResolution}
                      onChange={(e) => setQrResolution(e.target.value)}
                      className="px-3 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="200">200px</option>
                      <option value="500">500px</option>
                      <option value="1000">1000px</option>
                    </select>

                    {/* Visual representation for QR modes */}
                    {(activeTab === 'vcard' && vCardData.firstName && vCardData.lastName) ||
                      (activeTab === 'text' && textData) ||
                      (activeTab === 'url' && urlData) ? (
                      <div className="flex items-center ml-2">
                        <div className="relative">
                          <img
                            src={getQRCodeUrl(activeTab === 'vcard' ? generateVCard() : activeTab === 'text' ? textData : urlData, activeTab)}
                            alt="Normal QR Code"
                            className="w-10 h-10 rounded"
                          />
                          <span
                            className="flex absolute inset-0 justify-center items-center text-lg cursor-pointer"
                            onClick={() => setIsNegative(prev => !prev)}
                            title={translations[selectedLanguage]['invertColor']}
                          >
                            {isNegative ? '⚫' : '⚪'}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* QR Preview and Download */}
              {vCardData.firstName && vCardData.lastName && (
                <div className="mt-8 space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div className="p-6 bg-white rounded-lg border border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                        <div className="relative">
                          <img
                            src={getQRCodeUrl(vCardData, 'vcard')}
                            alt="QR Code"
                            className="mx-auto w-48 h-48"
                          />
                          {logoData && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                              <img
                                src={logoData}
                                alt="Logo"
                                className="object-contain w-12 h-12"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {translations[selectedLanguage]['uploadLogo']}
                        </label>

                        <div
                          className="relative p-6 rounded-lg border-2 border-gray-300 border-dashed transition-colors dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 group"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.add('border-blue-500', 'dark:border-blue-400');
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-blue-500', 'dark:border-blue-400');
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = () => setLogoData(reader.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setLogoData(reader.result);
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            id="file-upload"
                          />

                          <div className="flex flex-col justify-center items-center space-y-2">
                            <svg
                              className="w-8 h-8 text-gray-400 transition-colors dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>

                            <div className="text-center">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-medium text-blue-500 cursor-pointer dark:text-blue-400">
                                  {translations[selectedLanguage]['clickToUpload']}
                                </span>{' '}
                                {translations[selectedLanguage]['dragDrop']}
                              </p>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                                {translations[selectedLanguage]['supportedFormats']}
                              </p>
                            </div>
                          </div>
                        </div>

                        {logoData && (
                          <div className="flex justify-between items-center px-4 py-2 mt-3 bg-gray-50 rounded-lg dark:bg-gray-800">
                            <span className="text-sm text-gray-700 truncate dark:text-gray-300">
                              {translations[selectedLanguage]['uploadedLogo']}
                            </span>
                            <button
                              onClick={() => setLogoData(null)}
                              className="flex items-center text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <svg
                                className="mr-1 w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              {translations[selectedLanguage]['removeLogo']}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadQR(vCardData, 'vcard', 'contact')}
                    className="px-4 py-3 w-full font-medium text-white bg-blue-500 rounded-lg transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {translations[selectedLanguage]['saveToPhotos']}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['textContent']}</label>
                <input
                  type="text"
                  value={textData}
                  onChange={(e) => setTextData(e.target.value)}
                  className="px-4 py-3 w-full text-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={translations[selectedLanguage]['placeholderTextContent']}
                />
              </div>

              {textData && (
                <div className="mt-8 space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div className="p-6 bg-white rounded-lg border border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                        <div className="relative">
                          <img
                            src={getQRCodeUrl(textData)}
                            alt="QR Code"
                            className="mx-auto w-48 h-48"
                          />
                          {logoData && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                              <img
                                src={logoData}
                                alt="Logo"
                                className="object-contain w-12 h-12"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['selectResolution']}</label>
                        <div className="flex items-center mt-2">
                          <select
                            value={qrResolution}
                            onChange={(e) => setQrResolution(e.target.value)}
                            className="px-3 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="200">200px</option>
                            <option value="500">500px</option>
                            <option value="1000">1000px</option>
                          </select>

                          {/* Visual representation for QR modes */}
                          {(activeTab === 'vcard' && vCardData.firstName && vCardData.lastName) ||
                            (activeTab === 'text' && textData) ||
                            (activeTab === 'url' && urlData) ? (
                            <div className="flex items-center ml-2">
                              <div className="relative">
                                <img
                                  src={getQRCodeUrl(activeTab === 'vcard' ? generateVCard() : activeTab === 'text' ? textData : urlData, activeTab)}
                                  alt="Normal QR Code"
                                  className="w-10 h-10 rounded"
                                />
                                <span
                                  className="flex absolute inset-0 justify-center items-center text-lg cursor-pointer"
                                  onClick={() => setIsNegative(prev => !prev)}
                                  title={translations[selectedLanguage]['invertColor']}
                                >
                                  {isNegative ? '⚫' : '⚪'}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {translations[selectedLanguage]['uploadLogo']}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setLogoData(reader.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="px-3 py-2 mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        {logoData && (
                          <button
                            onClick={() => setLogoData(null)}
                            className="px-4 py-2 mt-2 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            {translations[selectedLanguage]['removeLogo']}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadQR(textData, 'text', 'text-qr')}
                    className="px-4 py-3 w-full font-medium text-white bg-blue-500 rounded-lg transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {translations[selectedLanguage]['saveToPhotos']}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['url']}</label>
                <input
                  type="url"
                  value={urlData}
                  onChange={(e) => setUrlData(e.target.value)}
                  className="px-4 py-3 w-full text-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={translations[selectedLanguage]['placeholderUrl']}
                />
              </div>

              {urlData && (
                <div className="mt-8 space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div className="p-6 bg-white rounded-lg border border-gray-300 shadow-sm dark:border-gray-600 dark:bg-gray-700">
                        <div className="relative">
                          <img
                            src={getQRCodeUrl(urlData)}
                            alt="QR Code"
                            className="mx-auto w-48 h-48"
                          />
                          {logoData && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                              <img
                                src={logoData}
                                alt="Logo"
                                className="object-contain w-12 h-12"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['selectResolution']}</label>
                        <div className="flex items-center mt-2">
                          <select
                            value={qrResolution}
                            onChange={(e) => setQrResolution(e.target.value)}
                            className="px-3 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="200">200px</option>
                            <option value="500">500px</option>
                            <option value="1000">1000px</option>
                          </select>

                          {/* Visual representation for QR modes */}
                          {(activeTab === 'vcard' && vCardData.firstName && vCardData.lastName) ||
                            (activeTab === 'text' && textData) ||
                            (activeTab === 'url' && urlData) ? (
                            <div className="flex items-center ml-2">
                              <div className="relative">
                                <img
                                  src={getQRCodeUrl(activeTab === 'vcard' ? generateVCard() : activeTab === 'text' ? textData : urlData, activeTab)}
                                  alt="Normal QR Code"
                                  className="w-10 h-10 rounded"
                                />
                                <span
                                  className="flex absolute inset-0 justify-center items-center text-lg cursor-pointer"
                                  onClick={() => setIsNegative(prev => !prev)}
                                  title={translations[selectedLanguage]['invertColor']}
                                >
                                  {isNegative ? '⚫' : '⚪'}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {translations[selectedLanguage]['uploadLogo']}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setLogoData(reader.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="px-3 py-2 mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        {logoData && (
                          <button
                            onClick={() => setLogoData(null)}
                            className="px-4 py-2 mt-2 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            {translations[selectedLanguage]['removeLogo']}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => downloadQR(urlData, 'text', 'url-qr')}
                    className="px-4 py-3 w-full font-medium text-white bg-blue-500 rounded-lg transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {translations[selectedLanguage]['saveToPhotos']}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer section */}
        <footer className="mt-10 mr-4 text-sm text-center text-gray-600">
          &copy; {currentYear} ·
          <a
            className="font-bold text-transparent bg-clip-text bg-gradient-to-b from-blue-400 via-blue-300 to-cyan-500 hover:text-blue-600 hover:underline"
            href="https://www.colibricreativeweb.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Colibri Creative Web
          </a>
          ·
          <a
            className="font-bold text-transparent bg-clip-text bg-gradient-to-b from-blue-400 via-blue-300 to-cyan-500 hover:text-blue-600 hover:underline"
            href="https://github.com/colibricreativeweb/chinchilla-qr"
            target="_blank"
            rel="noopener noreferrer"
          >
            💖 Contribute
          </a>
        </footer>
      </div>
    </div>
  );
};

export default App;