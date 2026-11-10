import { useState } from "react";

import { JsonInput } from "./components/JsonInput";
import { Controls } from "./components/Controls";
import { Chart } from "./components/Chart";

import Route from "./models/route";

import './App.css';

function App() {
  const [jsonPoints, setJsonPoints] = useState("");
  const [route, setRoute] = useState<Route>(() => new Route());

  const handleJsonProcess = () => {
    const newRoute = new Route();
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
      />

      <Chart
        route={route}
        color="#646cff"
        xAxisLabel="Time (min:sec)"
        yAxisLabel="Distance (m)"
      />
    </>
  )
}

export default App
