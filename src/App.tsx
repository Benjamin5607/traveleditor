import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('https://example.com/api/data');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const jsonData = await response.json();
      setData(jsonData);
      setLoading(false);
    } catch (error) {
      setError(error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const matchesGoal = useCallback((goal, data) => {
    if (!goal || !data) return false;
    return data.includes(goal);
  }, []);

  const hasNullDefenses = useCallback((data) => {
    if (!data) return true;
    return data.some((item) => item === null || item === undefined);
  }, []);

  const hasNoGhostFunctions = useCallback((data) => {
    if (!data) return true;
    return data.every((item) => typeof item !== 'function');
  }, []);

  const layoutData = useMemo(() => {
    if (!data) return [];
    return data.map((item, index) => ({
      id: index,
      goalMatched: matchesGoal('goal', item),
      nullDefenses: hasNullDefenses(item),
      ghostFunctions: !hasNoGhostFunctions(item),
    }));
  }, [data, matchesGoal, hasNullDefenses, hasNoGhostFunctions]);

  const Layout = () => {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Data Collection and Processing</h1>
        <ul>
          {layoutData.map((item) => (
            <li key={item.id} className="py-2 border-b border-gray-200">
              {item.goalMatched ? (
                <span className="text-green-500">Goal matched</span>
              ) : (
                <span className="text-red-500">Goal not matched</span>
              )}
              {item.nullDefenses ? (
                <span className="text-orange-500">Null defenses found</span>
              ) : (
                <span className="text-blue-500">No null defenses found</span>
              )}
              {item.ghostFunctions ? (
                <span className="text-pink-500">Ghost functions found</span>
              ) : (
                <span className="text-purple-500">No ghost functions found</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const Page = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <ArrowLeft size={24} className="animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex justify-center items-center h-screen text-red-500">
          {error.message}
        </div>
      );
    }

    return <Layout />;
  };

  const DataVisualization = () => {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Data Visualization</h2>
        <ul>
          {data.map((item, index) => (
            <li key={index} className="py-2 border-b border-gray-200">
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const UserInteraction = () => {
    const handleClick = () => {
      try {
        // 사용자 인터랙션 로직
      } catch (error) {
        console.error(error);
      }
    };

    return (
      <div className="max-w-4xl mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">User Interaction</h2>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleClick}
        >
          Click me
        </button>
      </div>
    );
  };

  return (
    <div>
      <Page />
      <DataVisualization />
      <UserInteraction />
    </div>
  );
};

export default App;