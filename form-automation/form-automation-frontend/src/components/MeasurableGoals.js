// src/components/MeasurableGoals.js
import React from 'react';

const MeasurableGoals = ({ measurableGoals }) => {
  // Add a safeguard to process the data correctly
  const goals = React.useMemo(() => {
    if (!measurableGoals) return [];
    if (Array.isArray(measurableGoals)) return measurableGoals;
    if (measurableGoals.goals && Array.isArray(measurableGoals.goals)) return measurableGoals.goals;
    return [];
  }, [measurableGoals]);

  // Rest of your component remains the same, just use 'goals' variable
  if (!goals || goals.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-md">
        <p className="text-gray-500">No measurable goals available</p>
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {goals.map((goal, index) => (
        <div key={index} className="border rounded-md p-4 bg-gray-50">
          <h3 className="font-medium text-lg mb-2">Goal {index + 1}</h3>
          <div className="grid gap-2">
            <div>
              <span className="font-semibold">Objective:</span>
              <p className="text-gray-700">{goal.objective}</p>
            </div>
            <div>
              <span className="font-semibold">Measurement:</span>
              <p className="text-gray-700">{goal.measurement}</p>
            </div>
            <div>
              <span className="font-semibold">Timeframe:</span>
              <p className="text-gray-700">{goal.timeframe}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MeasurableGoals;