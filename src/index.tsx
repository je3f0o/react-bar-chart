/* -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.
 * File Name   : index.tsx
 * Created at  : 2024-11-26
 * Updated at  : 2024-11-28
 * Author      : jeefo
 * Purpose     :
 * Description :
.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-.*/
import BarChart     from "./BarChart";
import {createRoot} from "react-dom/client";
import "./style.sass";

const data: Record<string, any>[] = [];
for (let i = 0; i < 50; ++i) {
  const date = new Date();
  date.setDate(date.getDate() + i);

  data.push({
    time: Math.floor(Math.random() * 300 + 5),
    date: date,
  });
}

const App = () => {

  const onSelect = (record: Record<string, any>) => {
    console.log("SELECTED DATA:", record);
  };

  return (
    <div className="container">
      <BarChart
        data                         = {data}
        onSelect                     = {onSelect}
        //mainBarHoverColor            = "green"
        //overviewBorderColor          = "blue"
        //overviewSelectionColor       = "green"
        //overviewSelectionBorderColor = "red"
        //overviewSelectedBarColor     = "orange"
      />
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);