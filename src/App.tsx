import { useState } from "react";

import { JsonInput } from "./components/JsonInput";
import { Controls } from "./components/Controls";

import Route from "./models/route";

import './App.css';

const route: Route = new Route();

function App() {
  const [jsonPoints, setJsonPoints] = useState("");

  return (
    <>
      <JsonInput
        label=""
        value={jsonPoints}
        onChange={setJsonPoints}
      />

      <Controls
        jsonProcessLabel="Process"
        onJsonProcess={() => {route.loadData(jsonPoints);}}
      />

      <JsonInput
        label=""
        value={jsonPoints}
        onChange={setJsonPoints}
      />
    </>
  )
}

export default App
