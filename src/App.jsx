import React, { useState, useEffect } from 'react';  
import './App.css';  
import translations from './translations.json'; 

const App = () => {  
  const [activeTab, setActiveTab] = useState('vcard');  
  const [isDark, setIsDark] = useState(false);  
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [vCardData, setVCardData] = useState({  
    firstName: '',  
    lastName: '',  
    phone: '',  
    email: '',  
    note: '',  
  });  
  const [textData, setTextData] = useState('');  
  const [urlData, setUrlData] = useState('');  
  const [qrResolution, setQrResolution] = useState('200');  

  // Auto-detect system theme  
  useEffect(() => {  
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {  
      setIsDark(true);  
    }  

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');  
    const handleChange = (e) => setIsDark(e.matches);  
    mediaQuery.addListener(handleChange);  
    return () => mediaQuery.removeListener(handleChange);  
  }, []);  

  const generateVCard = () => {  
    const vCard = `BEGIN:VCARD  
VERSION:3.0  
N:${vCardData.lastName};${vCardData.firstName};;;  
FN:${vCardData.firstName} ${vCardData.lastName}  
TEL;TYPE=CELL:${vCardData.phone}  
EMAIL:${vCardData.email}  
NOTE:${vCardData.note}  
END:VCARD`;  
    return encodeURIComponent(vCard);  
  };  

  const getQRCodeUrl = (data, type = 'text') => {  
    const finalData = type === 'vcard' ? generateVCard() : encodeURIComponent(data);  
    return `https://api.qrserver.com/v1/create-qr-code/?size=${qrResolution}x${qrResolution}&data=${finalData}`;  
  };  

  const downloadQR = async (data, type, filename) => {  
    try {  
      const response = await fetch(getQRCodeUrl(data, type));  
      const blob = await response.blob();  
      const url = window.URL.createObjectURL(blob);  
      const a = document.createElement('a');  
      a.href = url;  
      a.download = `${filename}.png`;  
      document.body.appendChild(a);  
      a.click();  
      document.body.removeChild(a);  
      window.URL.revokeObjectURL(url);  
    } catch (error) {  
      alert(translations[selectedLanguage]['downloadError']); // Use translation for error message  
    }  
  };  

  const toggleDarkMode = () => {  
    setIsDark(!isDark);  
  };  

  const handleLanguageChange = (event) => {  
    setSelectedLanguage(event.target.value); // Update the selected language  
  };  

  return (  
    <div className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-100 transition-colors duration-300'}`}>  
      <div className="max-w-2xl px-4 py-8 mx-auto">  

        {/* Header with Logo and Title */}  
        <div className="flex items-center mb-4">  
          <div className="flex items-center justify-center w-10 h-10 mr-2 bg-gray-300 rounded-full dark:bg-gray-700">  
            {/* Placeholder for future logo */}  
            <img className="w-12" src="chinchillaqr.webp"/>  
          </div>  
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chinchilla QR</h1>  
        </div>  

        {/* Tab Bar */}  
        <div className="flex items-center justify-between mt-2 mb-4">  
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
                {translations[selectedLanguage][tab]} {/* Use translation for tabs */}  
              </button>  
            ))}  
          </div>  
          <div className="flex items-center">  
            <select  
              value={selectedLanguage}  
              onChange={handleLanguageChange}  
              className="px-2 py-1 ml-4 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"  
            >  
              <option value="en">English</option>  
              <option value="es">Español</option>  
              {/* Add other language options here */}  
            </select>  
            <button  
              onClick={toggleDarkMode}  
              className="flex items-center justify-center w-10 h-10 p-2 ml-2 text-white transition-colors duration-300 rounded-full bg-neutral-400 hover:bg-neutral-500 dark:bg-gray-700"  
            >  
              {isDark ? '🌞' : '🌜'} {/* Emoji representation for dark/light mode */}  
            </button>  
          </div>  
        </div>  

        {/* Content Area */}  
        <div className="p-6 bg-white shadow-sm dark:bg-gray-800 rounded-2xl">  
          {activeTab === 'vcard' && (  
            <div className="space-y-6">  
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">  
                <div className="space-y-2">  
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['firstName']}</label>  
                  <input  
                    type="text"  
                    value={vCardData.firstName}  
                    onChange={(e) => setVCardData({ ...vCardData, firstName: e.target.value })}  
                    className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"  
                    placeholder={translations[selectedLanguage]['placeholderFirstName']}  
                  />  
                </div>  
                <div className="space-y-2">  
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['lastName']}</label>  
                  <input  
                    type="text"  
                    value={vCardData.lastName}  
                    onChange={(e) => setVCardData({ ...vCardData, lastName: e.target.value })}  
                    className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"  
                    placeholder={translations[selectedLanguage]['placeholderLastName']}  
                  />  
                </div>  
                <div className="space-y-2">  
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['phone']}</label>  
                  <input  
                    type="tel"  
                    value={vCardData.phone}  
                    onChange={(e) => setVCardData({ ...vCardData, phone: e.target.value })}  
                    className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"  
                    placeholder={translations[selectedLanguage]['placeholderPhone']}  
                  />  
                </div>  
                <div className="space-y-2">  
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['email']}</label>  
                  <input  
                    type="email"  
                    value={vCardData.email}  
                    onChange={(e) => setVCardData({ ...vCardData, email: e.target.value })}  
                    className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"  
                    placeholder={translations[selectedLanguage]['placeholderEmail']}  
                  />  
                </div>  
                <div className="space-y-2">  
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['note']}</label>  
                  <input  
                    type="text"  
                    value={vCardData.note}  
                    onChange={(e) => setVCardData({ ...vCardData, note: e.target.value })}  
                    className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"  
                    placeholder={translations[selectedLanguage]['placeholderNote']}  
                  />  
                </div>  
              </div>  

              {vCardData.firstName && vCardData.lastName && (  
                <div className="mt-8 space-y-6">  
                  <div className="p-6 bg-white border border-gray-300 rounded-lg shadow-sm dark:border-gray-600 w-fit dark:bg-gray-700">  
                    <img  
                      src={getQRCodeUrl(vCardData, 'vcard')}  
                      alt="QR Code"  
                      className="w-48 h-48"  
                    />  
                  </div>  

                  {/* QR Code Resolution Selector */}  
                  <div className="mb-4">  
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['selectResolution']}</label>  
                    <select  
                      value={qrResolution}  
                      onChange={(e) => setQrResolution(e.target.value)}  
                      className="w-1/4 px-3 py-2 mt-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"  
                    >  
                      <option value="200">200px</option>  
                      <option value="500">500px</option>  
                    </select>  
                  </div>  

                  <button  
                    onClick={() => downloadQR(vCardData, 'vcard', 'contact')}  
                    className="w-full px-4 py-3 font-medium text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"  
                  >  
                    {translations[selectedLanguage]['saveToPhotos']} {/* Use translation for button text */}  
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
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"  
                  placeholder={translations[selectedLanguage]['placeholderTextContent']}  
                />  
              </div>  

              {textData && (  
                <div className="mt-8 space-y-6">  
                  <div className="p-6 bg-white border border-gray-300 rounded-lg shadow-sm dark:border-gray-600 w-fit dark:bg-gray-700">  
                    <img  
                      src={getQRCodeUrl(textData)}  
                      alt="QR Code"  
                      className="w-48 h-48"  
                    />  
                  </div>  

                  {/* QR Code Resolution Selector */}  
                  <div className="mb-4">  
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['selectResolution']}</label>  
                    <select  
                      value={qrResolution}  
                      onChange={(e) => setQrResolution(e.target.value)}  
                      className="w-1/4 px-3 py-2 mt-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"  
                    >  
                      <option value="200">200px</option>  
                      <option value="500">500px</option>  
                    </select>  
                  </div>  

                  <button  
                    onClick={() => downloadQR(textData, 'text', 'text-qr')}  
                    className="w-full px-4 py-3 font-medium text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"  
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
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"  
                  placeholder={translations[selectedLanguage]['placeholderUrl']}  
                />  
              </div>  

              {urlData && (  
                <div className="mt-8 space-y-6">  
                  <div className="p-6 bg-white border border-gray-300 rounded-lg shadow-sm dark:border-gray-600 w-fit dark:bg-gray-700">  
                    <img  
                      src={getQRCodeUrl(urlData)}  
                      alt="QR Code"  
                      className="w-48 h-48"  
                    />  
                  </div>  

                  {/* QR Code Resolution Selector */}  
                  <div className="mb-4">  
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{translations[selectedLanguage]['selectResolution']}</label>  
                    <select  
                      value={qrResolution}  
                      onChange={(e) => setQrResolution(e.target.value)}  
                      className="w-1/4 px-3 py-2 mt-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"  
                    >  
                      <option value="200">200px</option>  
                      <option value="500">500px</option>  
                    </select>  
                  </div>  

                  <button  
                    onClick={() => downloadQR(urlData, 'text', 'url-qr')}  
                    className="w-full px-4 py-3 font-medium text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"  
                  >  
                    {translations[selectedLanguage]['saveToPhotos']}  
                  </button>  
                </div>  
              )}  
            </div>  
          )}  
        </div>  
      </div>  
    </div>  
  );  
};  

export default App;