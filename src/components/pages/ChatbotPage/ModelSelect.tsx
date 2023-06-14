import models from "../../../utility/models.json";
import { NativeSelect } from "@mantine/core";
import { useModel } from "@/states/states";
import { useEffect } from "react";

const ModelSelect = () => {
  const [model, setModel] = useModel();

  useEffect(() => {
    localStorage.setItem(":model", model);
  }, [model]);

  return (
    <>
      <NativeSelect value={model} size={"xs"} data={models} onChange={e => setModel(e.target.value)} />
    </>
  );
};

export default ModelSelect;
