import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  Modal,
  rem,
  ScrollArea,
  Switch,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { AttachItem, AttachItemType } from "@/components/misc/types";
import { v4 } from "uuid";
import { IconBrandOffice, IconCheck, IconCsv, IconUpload, IconX } from "@tabler/icons-react";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import * as XLSX from "xlsx";
import { clone, forEach, map } from "lodash";
import mammoth from "mammoth";
import { htmlToMarkdown2 } from "@/utility/utility";

const AttachExcel = memo<{
  opened: boolean;
  onClose: () => any;
  value?: AttachItem | null;
  onSubmit: (value: AttachItem) => any;
}>(({ opened, onClose, value, onSubmit }) => {
  const [attachItem, setAttachItem] = useState<AttachItem | null>(null);
  const theme = useMantineTheme();
  const [loading, setLoading] = useState(false);
  const disabledCount = useMemo<number>(() => {
    const items = map(attachItem?.data);
    let disabledCount = 0;

    for (let i = 0; i < items.length; i++) {
      if (items[i].disabled) {
        disabledCount += 1;
      }
    }

    return disabledCount;
  }, [attachItem]);

  const handleUploadFile = async (files: FileWithPath[]) => {
    const file = files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const newData: any[] = [];

      await new Promise((rel, rej) => {
        const reader = new FileReader();
        reader.onload = async e => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const textContent = new TextDecoder().decode(arrayBuffer);

          if (file.path?.endsWith(".xlsx") || file.path?.endsWith("xls")) {
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });

            forEach(workbook.SheetNames, sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              let markdown = "";
              forEach(jsonData as any, (row: any[], rowIndex: number) => {
                const rowString = row.map(cell => `| ${cell} `).join("") + "|";
                markdown += rowString + "\n";
                if (rowIndex === 0) {
                  const separator = row.map(() => "| --- ").join("") + "|";
                  markdown += separator + "\n";
                }
              });
              newData.push({
                name: sheetName,
                content: markdown,
              });
            });
          } else if (file.path?.endsWith(".doc") || file.path?.endsWith(".docx")) {
            try {
              const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
              newData.push({
                content: htmlToMarkdown2(html),
              });
            } catch (e) {
              return rej(e);
            }
          } else if (file.path?.endsWith(".csv")) {
            const rows = textContent.split("\n");
            let markdown = "";
            rows.forEach((row, rowIndex) => {
              const cells = row.split(",");
              const rowString = cells.map(cell => `| ${cell} `).join("") + "|";
              markdown += rowString + "\n";
              if (rowIndex === 0) {
                const separator = cells.map(() => "| --- ").join("") + "|";
                markdown += separator + "\n";
              }
            });
            newData.push({
              content: markdown,
            });
          } else {
            newData.push({
              content: textContent,
            });
          }
          rel(true);
        };
        reader.onerror = e => rej(e);
        reader.readAsArrayBuffer(file);
      });

      attachItem!.data = newData;
      attachItem!.name = file.name;
      setAttachItem(clone(attachItem));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (opened) {
      setAttachItem(
        value || {
          name: "Excel/Csv data",
          data: [],
          createdAt: Date.now(),
          type: AttachItemType.Excel,
          id: v4(),
        }
      );
    }
  }, [value, opened]);

  if (!attachItem) return null;

  return (
    <>
      <Modal
        opened={Boolean(opened)}
        onClose={() => onClose()}
        transitionProps={{ transition: "slide-up" }}
        centered
        size="lg"
        title={
          <div className="flex flex-row gap-2 items-center">
            <IconCsv />
            <div className="flex flex-col">
              <Title size="md" className="line-clamp-1">
                Attach - Excel/Text
              </Title>
              <div className="line-clamp-1 text-xs">
                Include your Excel/Csv/Word/Text file to improve your agent's context
              </div>
            </div>
          </div>
        }
        scrollAreaComponent={ScrollArea.Autosize}
        className="relative"
      >
        <div className={"flex flex-col gap-2"}>
          <div>
            <Dropzone
              onDrop={files => {
                void handleUploadFile(files);
              }}
              loading={loading}
              multiple={false}
              accept={[
                ".xlsx",
                ".xls", // Excel files
                ".doc",
                ".docx", // Word files
                ".csv", // CSV files
                ".txt",
                ".md", // Text files
                ".js",
                ".ts", // JavaScript and TypeScript files
                ".py", // Python files
                ".java", // Java files
                ".cpp",
                ".c", // C++ and C files
                ".cs", // C# files
                ".rb", // Ruby files
                ".go", // Go files
                ".php", // PHP files
                ".rs", // Rust files
                ".swift", // Swift files
                ".kt",
                ".kts", // Kotlin files
                ".sh", // Shell script files
                ".pl", // Perl files
                ".r", // R files
                ".scala", // Scala files
                ".lua", // Lua files
                ".dart", // Dart files
                ".m",
                ".mm", // Objective-C and Objective-C++ files
                ".sql", // SQL files
                ".html",
                ".css", // HTML and CSS files
                ".xml", // XML files
                ".json", // JSON files
                ".yaml",
                ".yml", // YAML files
              ]}
            >
              <Group position="center" spacing="xl" style={{ minHeight: rem(80), pointerEvents: "none" }}>
                <Dropzone.Accept>
                  <IconUpload
                    size="3.2rem"
                    stroke={1.5}
                    color={theme.colors[theme.primaryColor][theme.colorScheme === "dark" ? 4 : 6]}
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size="3.2rem" stroke={1.5} color={theme.colors.red[theme.colorScheme === "dark" ? 4 : 6]} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconBrandOffice size="3.2rem" stroke={1.5} />
                </Dropzone.Idle>
                <div>
                  <Text size="xl" inline>
                    Drag file here, or click to select
                  </Text>
                  <Text size="sm" color="dimmed" inline mt={7}>
                    Drag an Excel, Word, CSV, or any text file here
                  </Text>
                </div>
              </Group>
            </Dropzone>
          </div>
          {!!attachItem?.name && attachItem.data.length > 0 && (
            <div>
              <Card className={"flex items-baseline flex-row gap-2"}>
                <div>
                  <IconCheck color={"green"} className={"-mb-1"} />
                </div>
                <div className="flex-grow">
                  <div className={"font-bold"}>{attachItem.name}</div>
                  {attachItem.data.length > 1 && (
                    <Card>
                      <Card.Section className={"flex flex-col gap-1 p-2 pl-0"}>
                        <Checkbox
                          checked={disabledCount === 0}
                          indeterminate={disabledCount > 0 && disabledCount !== attachItem.data.length}
                          label={<div className={"font-bold"}>All</div>}
                          onChange={() => {
                            setAttachItem(prevState => {
                              forEach(prevState?.data, (value, index) => {
                                if (disabledCount === 0) {
                                  prevState!.data[index].disabled = true;
                                } else {
                                  prevState!.data[index].disabled = false;
                                }
                              });
                              return clone(prevState);
                            });
                          }}
                        />
                        <Divider />
                        {map(attachItem.data, (data, index) => {
                          return (
                            <div key={index}>
                              <Checkbox
                                label={data.name}
                                checked={!data.disabled}
                                onChange={e => {
                                  const { checked } = e.target;
                                  setAttachItem(prevState => {
                                    prevState!.data[index].disabled = !checked;
                                    return clone(prevState);
                                  });
                                }}
                              />
                            </div>
                          );
                        })}
                      </Card.Section>
                    </Card>
                  )}
                </div>
              </Card>
            </div>
          )}
          <div className={"sticky bottom-0 flex flex-row items-center justify-end gap-2"}>
            <Button variant="default" onClick={() => onClose()}>
              Close
            </Button>
            <Button onClick={() => onSubmit(attachItem!)}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default AttachExcel;
