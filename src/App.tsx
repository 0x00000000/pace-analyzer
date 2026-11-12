import { useState } from "react";

import { JsonInput } from "./components/JsonInput";
import { Controls } from "./components/Controls";
import { Chart } from "./components/Chart";

import Route from "./models/route";
import { formatKilometers } from "./utils/format";

import './App.css';

function App() {
  const [jsonPoints, setJsonPoints] = useState("");
  const [route, setRoute] = useState<Route>(() => new Route());
  // Starts at the Route model's default.
  const [paceTimeLimit, setPaceTimeLimit] = useState(
    () => String(route.getPaceTimeLimit())
  );
  const [smoothNeighboursCount, setSmoothNeighboursCount] = useState(
    () => String(route.getSmoothNeighboursCount())
  );
  const [smoothMaxDeviation, setSmoothMaxDeviation] = useState(
    () => String(route.getSmoothMaxDeviation())
  );

  const handleJsonProcess = () => {
    const newRoute = new Route();
    // Must be set before loadData, which computes the pace. An empty or invalid value keeps the Route's default.
    const limit = Number(paceTimeLimit);
    if (Number.isFinite(limit) && limit > 0) {
      newRoute.setPaceTimeLimit(limit);
    }
    const neighboursCount = Number(smoothNeighboursCount);
    if (Number.isFinite(neighboursCount)) {
      newRoute.setSmoothNeighboursCount(neighboursCount);
    }
    const maxDeviation = Number(smoothMaxDeviation);
    if (Number.isFinite(maxDeviation)) {
      newRoute.setSmoothMaxDeviation(maxDeviation);
    }

    newRoute.loadData(jsonPoints);
    setRoute(newRoute);
  };

  return (
    <>
      <JsonInput
        label=""
        value={jsonPoints}
        onChange={setJsonPoints}
      />

      <Controls
        jsonProcessLabel="Process"
        onJsonProcess={handleJsonProcess}
        paceTimeLimitLabel="Pace window (ms)"
        paceTimeLimit={paceTimeLimit}
        onPaceTimeLimitChange={setPaceTimeLimit}
        smoothNeighboursCountLabel="Neighbours count"
        smoothNeighboursCount={smoothNeighboursCount}
        onSmoothNeighboursCountChange={setSmoothNeighboursCount}
        smoothMaxDeviationLabel="Max deviation"
        smoothMaxDeviation={smoothMaxDeviation}
        onSmoothMaxDeviationChange={setSmoothMaxDeviation}
      />

      <Chart
        route={route}
        color="#e8590c"
        xAxisLabel="Distance (km)"
        yAxisLabel="Pace (min/km)"
        xKey="distance"
        yKey="pace"
        formatX={formatKilometers}
        formatY={pace => route.getPaceAsString(pace)}
        minSpan={50}
      />
    </>
  )
}

export default App
