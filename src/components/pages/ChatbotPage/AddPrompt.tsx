import React, { useEffect, useMemo, useRef, useState } from "react";
import { clone, findIndex, map } from "lodash";
import { useForm } from "@mantine/form";
import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  Input,
  Modal,
  NativeSelect,
  NumberInput,
  ScrollArea,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconCopy, IconPlus, IconTrash } from "@tabler/icons-react";
import classNames from "classnames";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import FunnyEmoji from "@/components/misc/FunnyEmoji";

export type PromptSaveData = {
  emoji?: string;
  name: string;
  temperature: number;
  wrapSingleLine: boolean;
  wrapCustomXmlTag?: boolean;
  customXmlTag?: string;
  prompts: any[];
  id?: any;
};

const AddPrompt = ({
  opened,
  close,
  deleteFn,
  loading,
  onSave,
  editData,
}: {
  opened: boolean;
  close: () => void;
  deleteFn: (id: any) => void;
  loading: boolean;
  onSave: (data: PromptSaveData) => any;
  editData?: PromptSaveData;
}) => {
  const { classes } = useStyles();
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
  >(editData?.prompts || [clone(defaultValue), "your"]);
  const yourIndex = useMemo(() => {
    return findIndex(prompts, v => v === "your");
  }, [prompts]);
  const addForm = useForm({
    initialValues: {
      name: editData?.name || "",
      temperature: editData && editData.temperature >= 0 ? editData?.temperature : 0.5,
      wrapSingleLine: Boolean(editData?.wrapSingleLine),
      wrapCustomXmlTag: Boolean(editData?.wrapCustomXmlTag),
      customXmlTag: editData?.customXmlTag || "document",
      emoji: (() => {
        if (editData?.name && !editData?.emoji) {
          const data: string[] = editData?.name.split(" ");
          let emoji = data.shift() as string;
          if (data.length === 0) {
            data.unshift(emoji);
            emoji = prompt.name.split("")[0];
          }
          setTimeout(() => {
            addForm.setFieldValue("name", data.join(" ").trim());
          }, 500);
          return emoji;
        }
        return editData?.emoji || "🥸";
      })(),
    },
    validate: {
      name: v => (["", null, undefined].includes(v) ? "Invalid field" : null),
      temperature: v => (+v < 0 || +v > 2 ? "Invalid field" : null),
    },
  });
  const customXmlTagRef = useRef<HTMLInputElement>(null);
  const [openEmojiPicker, setOpenEmojiPicker] = useState(false);

  const addPromptSetup = (posIndex: number) => {
    prompts.splice(posIndex, 0, { ...defaultValue, role: posIndex === 0 ? "system" : "user" });
    setPrompts(clone(prompts));
  };
  const removePromptSetup = (index: number) => {
    prompts.splice(index, 1);
    setPrompts(clone(prompts));
  };

  useEffect(() => {
    if (addForm.values.wrapCustomXmlTag && customXmlTagRef.current) {
      customXmlTagRef.current.focus();
    }
  }, [addForm.values.wrapCustomXmlTag, customXmlTagRef]);

  return (
    <Modal
      size="lg"
      centered={true}
      opened={opened}
      onClose={close}
      title={editData?.id ? "Edit agent" : "Add agent"}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <div>
        <div>
          <Modal
            title={"Agent avatar"}
            opened={openEmojiPicker}
            onClose={() => {
              setOpenEmojiPicker(false);
            }}
            className={classes.noModalBodyPad}
            centered={true}
          >
            <EmojiPicker
              width={"100%"}
              emojiStyle={EmojiStyle.NATIVE}
              theme={Theme.AUTO}
              onEmojiClick={e => {
                addForm.setFieldValue("emoji", e.emoji);
                setOpenEmojiPicker(false);
              }}
            />
          </Modal>
          <div className={"flex flex-row items-center justify-center"}>
            <div
              className={"text-5xl border rounded-full flex flex-row items-center justify-center cursor-pointer"}
              style={{
                border: "1px solid #373A40",
                background: "#111",
                width: 80,
                height: 80,
              }}
              onClick={() => {
                setOpenEmojiPicker(true);
              }}
            >
              <span
                style={{
                  lineHeight: 0,
                }}
              >
                <FunnyEmoji emoji={addForm.values.emoji} emojiType={"anim"} size={55} key={addForm.values.emoji} />
              </span>
            </div>
          </div>
          <TextInput
            className={"flex-grow"}
            label={"Name"}
            required
            placeholder={"Your agent name..."}
            {...addForm.getInputProps("name")}
          />
          <NumberInput
            label="Temperature"
            description="Temperature controls the creativity of your agent. (0.0-1.0) Higher is more creativity."
            required
            placeholder={"0.0-2.0 (0.0-Precise, 0.5-Balanced, 1.0-Creative)"}
            precision={1}
            min={0.0}
            step={0.1}
            max={1.0}
            {...addForm.getInputProps("temperature")}
            className="mt-1"
          />
          <Checkbox
            label="Wrap user's chat content with quotation marks."
            {...addForm.getInputProps("wrapSingleLine", {
              type: "checkbox",
            })}
            className="mt-3"
          />
          <Checkbox
            label={
              <>
                <div className={"flex flex-row gap-2 items-center -mt-1"}>
                  <Text>Wrap user's chat content with a custom XML tag:</Text>
                  <Input
                    disabled={!addForm.values.wrapCustomXmlTag}
                    size={"xs"}
                    placeholder={"document, content,..."}
                    ref={customXmlTagRef}
                    {...addForm.getInputProps("customXmlTag", {
                      type: "input",
                    })}
                  />
                </div>
              </>
            }
            {...addForm.getInputProps("wrapCustomXmlTag", {
              type: "checkbox",
            })}
            className="mt-3"
          />
          {yourIndex === 0 && (
            <Divider
              variant="dashed"
              labelPosition="center"
              label={
                <ActionIcon variant="default" onClick={() => addPromptSetup(0)}>
                  <IconPlus />
                </ActionIcon>
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
                {(i - 1 === yourIndex || i === 0) && (
                  <Divider
                    key={"divider0" + i}
                    variant="dashed"
                    labelPosition="center"
                    className="my-3"
                    label={
                      <ActionIcon variant="default" onClick={() => addPromptSetup(i)}>
                        <IconPlus />
                      </ActionIcon>
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
                        { value: "system", label: "System" },
                        { value: "user", label: "User" },
                        { value: "assistant", label: "Assistant" },
                      ]}
                      value={prompt.role}
                      onChange={e => {
                        (prompts[i] as any).role = e.target.value as any;
                        setPrompts(clone(prompts));
                      }}
                      w={120}
                    />
                    <Textarea
                      label={prompt.role === "system" ? "Context" : "Message"}
                      placeholder={prompt.role === "system" ? "Context..." : "Message content..."}
                      onChange={e => {
                        (prompts[i] as any).prompt = e.target.value;
                        setPrompts(clone(prompts));
                      }}
                      value={prompt.prompt}
                      autosize={true}
                      maxRows={10}
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
                      <IconTrash size="1rem" stroke={1.5} />
                    </Button>
                  </div>
                </Card>
                <Divider
                  key={"divider" + i}
                  variant="dashed"
                  labelPosition="center"
                  className="mt-3"
                  label={
                    <ActionIcon variant="default" onClick={() => addPromptSetup(i + 1)}>
                      <IconPlus />
                    </ActionIcon>
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
                <ActionIcon variant="default" onClick={() => addPromptSetup(prompts.length)}>
                  <IconPlus />
                </ActionIcon>
              }
            />
          )}
          <div className="h-20" />
        </div>
        <div className={classNames("absolute bottom-0 right-0 w-full bg-bottom px-4 py-2", classes.bgAction)}>
          <div className="flex items-center justify-end gap-3">
            {editData && (
              <Tooltip label="Delete">
                <ActionIcon
                  loading={loading}
                  onClick={() => deleteFn(`force:${editData?.id}`)}
                  variant="outline"
                  color="red"
                >
                  <IconTrash />
                </ActionIcon>
              </Tooltip>
            )}
            {editData && (
              <Tooltip label="Clone">
                <ActionIcon
                  loading={loading}
                  onClick={() => {
                    if (!addForm.validate().hasErrors) {
                      onSave({
                        ...addForm.values,
                        name: addForm.values.name,
                        emoji: addForm.values.emoji,
                        temperature: +addForm.values.temperature,
                        wrapSingleLine: Boolean(addForm.values.wrapSingleLine),
                        prompts: prompts.filter(v => {
                          if (typeof v === "string") return true;
                          return v.prompt.trim().length > 0;
                        }),
                      });
                    }
                  }}
                  variant="outline"
                >
                  <IconCopy />
                </ActionIcon>
              </Tooltip>
            )}
            <Button loading={loading} onClick={close} variant="default">
              Close
            </Button>
            <Button
              loading={loading}
              onClick={() => {
                if (!addForm.validate().hasErrors) {
                  onSave({
                    ...addForm.values,
                    name: addForm.values.name,
                    emoji: addForm.values.emoji,
                    temperature: +addForm.values.temperature,
                    wrapSingleLine: Boolean(addForm.values.wrapSingleLine),
                    prompts: prompts.filter(v => {
                      if (typeof v === "string") return true;
                      return v.prompt.trim().length > 0;
                    }),
                    id: editData?.id,
                  });
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddPrompt;
