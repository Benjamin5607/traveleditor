import React, { useState, useEffect } from 'react';

const App = () => {
  const [message, setMessage] = useState('좋아 진행해봐');

  return (
    <div className="flex justify-center items-center h-screen w-screen bg-gray-200">
      <div className="text-3xl text-gray-600">{message}</div>
    </div>
  );
};

export default App;