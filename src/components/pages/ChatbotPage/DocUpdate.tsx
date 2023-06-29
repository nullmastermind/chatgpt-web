import axios from "axios";
import { indexerHost } from "@/config";
import React, { useEffect } from "react";
import { useList, useSetState } from "react-use";
import { map } from "lodash";
import { ActionIcon, Button, Input, Text } from "@mantine/core";
import { IconCircleCheckFilled, IconTrash, IconTrashX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

type DocUpdateProps = {
  docId: string;
};

type DataItem = {
  f: string;
  editable: boolean;
};

type MyData = {
  data: DataItem[];
};

const DocUpdate = ({ docId }: DocUpdateProps) => {
  const [loadings, setLoadings] = useSetState({
    data: false,
    saving: false,
  });
  const [items, setItems] = useList<DataItem>([]);

  const getDirs = () => {
    setLoadings({ data: true });

    axios
      .get(`${indexerHost}/api/manager`, {
        params: {
          doc_id: docId,
        },
      })
      .then(({ data }: { data: MyData }) => {
        setItems.set(data.data);
      })
      .finally(() => {
        setLoadings({ data: false });
      });
  };

  useEffect(() => {
    getDirs();
  }, [docId]);

  return (
    <>
      <div className={"flex flex-col gap-1"}>
        {map(items, (item, index) => {
          return (
            <div key={index} className={"flex flex-row gap-2 items-center"}>
              <Text size={"xs"}>{index + 1}.</Text>
              <Input
                placeholder={"Full path of a file or directory on your computer (e.g: C:\\Users\\admin\\Documents\\Private)"}
                size={"xs"}
                value={item.f}
                disabled={!item.editable}
                className={"flex-grow"}
                onChange={e => {
                  setItems.updateAt(index, {
                    ...item,
                    f: e.target.value,
                  });
                }}
              />
              {item.editable && (
                <ActionIcon
                  size={"xs"}
                  variant={"outline"}
                  color={"red"}
                  onClick={() => {
                    setItems.removeAt(index);
                  }}
                >
                  <IconTrash />
                </ActionIcon>
              )}
            </div>
          );
        })}
      </div>
      <div className={"flex flex-row items-center justify-end mt-2 gap-2"}>
        <Button
          variant={"outline"}
          size={"xs"}
          onClick={() => {
            setItems.push({
              f: "",
              editable: true,
            });
          }}
        >
          Add
        </Button>
        <Button
          variant={"filled"}
          size={"xs"}
          loading={loadings.saving}
          onClick={() => {
            setLoadings({ saving: true });
            axios
              .post(`${indexerHost}/api/update-doc`, {
                doc_id: docId,
                content: items
                  .filter(i => i.editable)
                  .map(v => v.f.trim())
                  .filter(v => v.length)
                  .join("\n"),
              })
              .then(() => {
                notifications.show({
                  title: "Success",
                  message: "Saved.",
                  radius: "lg",
                  withCloseButton: true,
                  color: "green",
                  icon: <IconCircleCheckFilled />,
                });
                return getDirs();
              })
              .finally(() => {
                setLoadings({ saving: false });
              });
          }}
        >
          Save
        </Button>
      </div>
    </>
  );
};

export default DocUpdate;
