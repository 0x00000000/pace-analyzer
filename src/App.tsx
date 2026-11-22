import { useState } from "react";

import { JsonInput } from "./components/JsonInput";
import { Controls } from "./components/Controls";
import { Chart } from "./components/Chart";
import { InfoBox } from "./components/InfoBox";

import Route from "./models/route";
import { formatKilometers } from "./utils/format";

import './App.css';

function App() {
  const [jsonPoints, setJsonPoints] = useState("");
  const [route, setRoute] = useState<Route>(() => new Route());
  // Starts at the Route model's default.
  const [paceWindow, setPaceWindow] = useState(
    () => String(route.getPaceWindow())
  );
  const [smoothNeighboursCount, setSmoothNeighboursCount] = useState(
    () => String(route.getSmoothNeighboursCount())
  );
  const [smoothMaxDeviation, setSmoothMaxDeviation] = useState(
    () => String(route.getSmoothMaxDeviation())
  );
  const [paceLimit, setPaceLimit] = useState(
    () => String(route.getPaceLimit())
  );
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  // Why the last Process couldn't load the pasted JSON, or null when it worked.
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleJsonProcess = () => {
    const newRoute = new Route();
    // Must be set before loadData, which computes the pace. An empty or invalid value keeps the Route's default.
    const limit = Number(paceWindow);
    if (Number.isFinite(limit) && limit > 0) {
      newRoute.setPaceWindow(limit);
    }
    const neighboursCount = Number(smoothNeighboursCount);
    if (Number.isFinite(neighboursCount)) {
      newRoute.setSmoothNeighboursCount(neighboursCount);
    }
    const maxDeviation = Number(smoothMaxDeviation);
    if (Number.isFinite(maxDeviation)) {
      newRoute.setSmoothMaxDeviation(maxDeviation);
    }
    const upperPaceLimit = Number(paceLimit);
    if (Number.isFinite(upperPaceLimit) && upperPaceLimit > 0) {
      newRoute.setPaceLimit(upperPaceLimit);
    }

    try {
      newRoute.loadData(jsonPoints);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
    // Set even after a failed load, so the chart doesn't keep showing the previous activity.
    setRoute(newRoute);
  };

  const handleHelp = () => {
    setIsHelpOpen(true);
  };

  const handleHelpClose = () => {
    setIsHelpOpen(false);
  };

  return (
    <>
      <JsonInput
        label=""
        value={jsonPoints}
        onChange={setJsonPoints}
        error={loadError}
      />

      <Controls
        jsonProcessLabel="Process"
        onJsonProcess={handleJsonProcess}
        helpLabel="Help"
        onHelp={handleHelp}
        paceWindowLabel="Pace window (sec)"
        paceWindow={paceWindow}
        onPaceWindowChange={setPaceWindow}
        smoothNeighboursCountLabel="Neighbours count"
        smoothNeighboursCount={smoothNeighboursCount}
        onSmoothNeighboursCountChange={setSmoothNeighboursCount}
        smoothMaxDeviationLabel="Max deviation (%)"
        smoothMaxDeviation={smoothMaxDeviation}
        onSmoothMaxDeviationChange={setSmoothMaxDeviation}
        paceLimitLabel="Pace upper limit (min)"
        paceLimit={paceLimit}
        onPaceLimitChange={setPaceLimit}
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

      <InfoBox
        open={isHelpOpen}
        onClose={handleHelpClose}
        closeLabel="Close"
      >
        <h4>With this tool you can analyse your running activity from Runkeeper.</h4>
        <p>Paste the JSON from /ajax/pointData for your running activity into the input above.</p>
        <p>Press <strong>Process</strong> to see or update the graph.</p>
        <p> <br/></p>
        <p><strong>You can change these values to get a smoother graph:</strong></p>
        <p><strong>Pace window</strong> - calculates the pace over this period of time.</p>
        <p><strong>Neighbours count</strong> - takes the average pace of the neighbours before and after each point.</p>
        <p><strong>Max deviation</strong> - if the deviation of the closest neighbours before and after the point is bigger than this value, the average pace isn't used.</p>
        <p><strong>Pace upper limit (min)</strong> - the graph doesn't show pace values bigger than this limit.</p>
      </InfoBox>
    </>
  )
}

export default App
