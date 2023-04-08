import CenterCard from "@/components/CenterCard";
import {useMount, useUnmount} from "react-use";
import {useAddCollectionAction, useCollections} from "@/states/states";
import {useDisclosure} from "@mantine/hooks";
import {Button, Card, Chip, Divider, Modal, NativeSelect, ScrollArea, Textarea, TextInput} from "@mantine/core";
import {useMemo, useState} from "react";
import {add, clone, findIndex, map} from "lodash";
import {IconPlus, IconTrash} from "@tabler/icons-react";
import {useForm} from "@mantine/form";

const ChatbotPage = () => {
  const [, setAddCollectionAction] = useAddCollectionAction();
  const [, setCollections] = useCollections();
  const [opened, {open, close}] = useDisclosure(false);

  const onAddCollection = () => {
    open();
  };

  useMount(() => {
    setAddCollectionAction(() => () => onAddCollection);
  });
  useUnmount(() => {
    setCollections([]);
  });

  return (
    <>
      {opened && (
        <AddPrompt
          loading={false}
          close={close}
          opened={opened}
          onSave={prompts => {
            console.log("prompts", prompts);
            close();
          }}
        />
      )}
      <CenterCard>
        <div>Chatbot</div>
      </CenterCard>
    </>
  );
};

const AddPrompt = ({
                     opened,
                     close,
                     loading,
                     onSave,
                   }: {
  opened: boolean;
  close: () => void;
  loading: boolean;
  onSave: (prompts: any[]) => any;
}) => {
  const defaultValue: any = {
    role: "system",
    prompt: "",
  };
  const [prompts, setPrompts] = useState<
    Array<
      | {
      role: "user" | "assistant" | "system";
      prompt: string;
    }
      | "your"
    >
  >([clone(defaultValue), "your"]);
  const yourIndex = useMemo(() => {
    return findIndex(prompts, v => v === "your");
  }, [prompts]);
  const addForm = useForm({
    initialValues: {
      name: "",
    },
    validate: {
      name: v => (["", null, undefined].includes(v) ? "Invalid field" : null),
    },
  });

  const addPromptSetup = (posIndex: number) => {
    prompts.splice(posIndex, 0, {...defaultValue, role: "user"});
    setPrompts(clone(prompts));
  };
  const removePromptSetup = (index: number) => {
    prompts.splice(index, 1);
    setPrompts(clone(prompts));
  };

  return (
    <Modal
      size="lg"
      centered={true}
      opened={opened}
      onClose={close}
      title="Add prompt template"
      scrollAreaComponent={ScrollArea.Autosize}>
      <div>
        {yourIndex === 0 && (
          <Divider
            variant="dashed"
            labelPosition="center"
            label={
              <Button leftIcon={<IconPlus/>} size="xs" variant="white" onClick={() => addPromptSetup(0)}>
                Add here
              </Button>
            }
          />
        )}
        {map(prompts, (prompt, i) => {
          if (prompt === "your") {
            return (
              <div className="pt-3">
                <Card p="xs" withBorder className="flex flex-row items-center gap-3" bg="green">
                  <Button compact variant="light">
                    {i + 1}
                  </Button>
                  <div>
                    <Chip checked={true} radius="sm">
                      Your input prompt is here
                    </Chip>
                  </div>
                </Card>
              </div>
            );
          }

          return (
            <>
              <TextInput
                label={"Name"}
                required
                placeholder={"your template name..."}
                {...addForm.getInputProps("name")}
              />
              {(i - 1 === yourIndex || i === 0) && (
                <Divider
                  key={"divider0" + i}
                  variant="dashed"
                  labelPosition="center"
                  className="my-3"
                  label={
                    <Button leftIcon={<IconPlus/>} size="xs" variant="white" onClick={() => addPromptSetup(i)}>
                      Add here
                    </Button>
                  }
                />
              )}
              <Card withBorder p="xs" className="flex flex-row items-center gap-3 mt-3">
                <Button compact variant="light">
                  {i + 1}
                </Button>
                <div className="flex flex-col flex-grow" key={i}>
                  <NativeSelect
                    label="Role"
                    data={[
                      {value: "system", label: "System"},
                      {value: "user", label: "User"},
                      {value: "assistant", label: "Assistant"},
                    ]}
                    value={prompt.role}
                    onChange={e => {
                      (prompts[i] as any).role = e.target.value as any;
                      setPrompts(clone(prompts));
                    }}
                    w={120}
                  />
                  <Textarea
                    label="Prompt"
                    placeholder="Prompt content..."
                    onChange={e => {
                      (prompts[i] as any).prompt = e.target.value;
                      setPrompts(clone(prompts));
                    }}
                    autosize={true}
                  />
                </div>
                <div className="h-full flex items-center gap-2">
                  <Divider
                    orientation="vertical"
                    variant="dashed"
                    style={{
                      minHeight: 80,
                    }}
                  />
                  <Button compact variant="light" color="red" onClick={() => removePromptSetup(i)}>
                    <IconTrash size="1rem" stroke={1.5}/>
                  </Button>
                </div>
              </Card>
              <Divider
                key={"divider" + i}
                variant="dashed"
                labelPosition="center"
                className="mt-3"
                label={
                  <Button leftIcon={<IconPlus/>} size="xs" variant="white" onClick={() => addPromptSetup(i + 1)}>
                    Add here
                  </Button>
                }
              />
            </>
          );
        })}
        {prompts.length - 1 === yourIndex && (
          <Divider
            variant="dashed"
            labelPosition="center"
            className="mt-3"
            label={
              <Button leftIcon={<IconPlus/>} size="xs" variant="white" onClick={() => addPromptSetup(prompts.length)}>
                Add here
              </Button>
            }
          />
        )}
      </div>
      <div className="flex items-center justify-end">
        <Button
          loading={loading}
          onClick={() => {
            if (!addForm.validate().hasErrors) {
              onSave(
                prompts.filter(v => {
                  if (typeof v === "string") return true;
                  return v.prompt.trim().length > 0;
                })
              );
            }
          }}>
          Save
        </Button>
      </div>
    </Modal>
  );
};

export default ChatbotPage;
