import axios, { AxiosError } from "axios";
import { indexerHost } from "@/config";
import React, { ReactNode, useEffect } from "react";
import { useList, useSetState } from "react-use";
import { map } from "lodash";
import { ActionIcon, Badge, Button, Input, Text, Tooltip } from "@mantine/core";
import { IconCircleCheckFilled, IconGitCompare, IconPlus, IconTrash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

type DocUpdateProps = {
  docId: string;
};

type DataItem = {
  f: string;
  editable: boolean;
  git?: string;
  exists: boolean;
};

type MyData = {
  data: DataItem[];
};

const DocUpdate = ({ docId }: DocUpdateProps) => {
  const [loadings, setLoadings] = useSetState<Record<any, boolean>>({
    data: false,
    saving: false,
    pull: false,
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
  useEffect(() => {
    if (items.length === 0) {
      setItems.push({
        f: "",
        editable: true,
        exists: true,
      });
    }
  }, [items]);

  return (
    <>
      <div className={"flex flex-col gap-1"}>
        {map(items, (item, index) => {
          return (
            <div key={index} className={"flex flex-row gap-2 items-center"}>
              <Text size={"xs"}>{index + 1}.</Text>
              <Input
                placeholder={
                  "Full path of a file or directory on your computer (e.g: C:\\Users\\admin\\Documents\\Private)"
                }
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
                error={item.exists === false ? "Path does not exists" : undefined}
              />
              {item.editable && (
                <div className={"flex flex-row items-center gap-1"}>
                  {item.git && (
                    <Tooltip
                      label={
                        <div className={"flex flex-col gap-2"}>
                          <Text className={"text-xs"}>{item.git}</Text>
                          <div className={"flex flex-row gap-1 items-center"}>
                            <Text className={"font-bold text-xs"}>Run:</Text>
                            <Badge variant={"filled"} color={"blue"} className={"rounded"}>
                              git pull
                            </Badge>
                          </div>
                        </div>
                      }
                    >
                      <ActionIcon
                        size={"xs"}
                        variant={"outline"}
                        color={"blue"}
                        loading={loadings.pull}
                        onClick={() => {
                          setLoadings({ [item.git as string]: true });
                          axios
                            .post(`${indexerHost}/api/git-pull`, {
                              cwd: item.git,
                            })
                            .then(({ data }: { data: string | undefined }) => {
                              if (typeof data !== "string") return;

                              data = data.trim() as string;

                              if (data.includes("\n")) {
                                data = (
                                  <>
                                    <div style={{ maxHeight: 60 }} className={"overflow-auto"}>
                                      <code>{data}</code>
                                    </div>
                                  </>
                                ) as ReactNode as any;
                              } else {
                                data = "Pull OK:\n\n" + data;
                              }

                              notifications.show({
                                title: "Success",
                                message: data,
                                color: "green",
                              });
                            })
                            .catch((e: AxiosError) => {
                              notifications.show({
                                title: "Error",
                                message: "Failed to perform git pull: " + e.response?.data,
                                color: "red",
                              });
                            })
                            .finally(() => {
                              setLoadings({ [item.git as string]: false });
                            });
                        }}
                      >
                        <IconGitCompare />
                      </ActionIcon>
                    </Tooltip>
                  )}
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
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className={"flex flex-row items-center justify-end mt-2 gap-2"}>
        <Button
          variant={"default"}
          size={"xs"}
          onClick={() => {
            setItems.push({
              f: "",
              editable: true,
              exists: true,
            });
          }}
          className={"flex-grow"}
        >
          <IconPlus size={"1.25rem"} className={"opacity-60"} />
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
