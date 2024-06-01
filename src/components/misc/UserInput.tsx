import { ComponentPropsWithRef, forwardRef, memo, RefObject, useImperativeHandle } from "react";
import { Link, RichTextEditor } from "@mantine/tiptap";
import { Editor, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import classNames from "classnames";
import { createStyles, Transition } from "@mantine/core";
import { useDebounce } from "react-use";

const useStyles = createStyles(() => ({
  limitHeight: {
    "& .mantine-TypographyStylesProvider-root": {
      maxHeight: "50vh",
      overflow: "auto",
      transition: "max-height 0.2s ease, overflow 0.2s ease",
    },
  },
  limitHeightBlur: {
    "& .mantine-TypographyStylesProvider-root": {
      maxHeight: "57px",
      overflow: "hidden",
      transition: "max-height 0.2s ease, overflow 0.2s ease",
    },
  },
  shadow: {
    boxShadow:
      "0 0 10px rgba(255, 255, 255, 0.1), 0 0 20px rgba(255, 255, 255, 0.1), 0 0 30px rgba(255, 255, 255, 0.1) !important",
    background: "#1a1b1e",
  },
}));

const UserInput = memo<
  ComponentPropsWithRef<"textarea"> & {
    className?: string;
    defaultValue?: string;
    onChange?: (value: string) => any;
    isReplyBox?: boolean;
  }
>(
  forwardRef(({ className, defaultValue, onChange, isReplyBox, ...props }, ref) => {
    const { classes } = useStyles();
    const editor = useEditor({
      extensions: [
        StarterKit,
        Underline,
        Link,
        Highlight,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Placeholder.configure({
          placeholder: "Enter a prompt here",
        }),
      ],
      content: defaultValue || "",
      onUpdate({ editor }) {
        onChange?.(editor.getHTML());
      },
    });

    useImperativeHandle(
      ref,
      () =>
        ({
          focus() {
            editor?.commands.focus();
          },
          setValue(value: string) {
            editor?.commands.setContent(value);
          },
          setSelectionRange(from: number, to: number) {
            editor?.commands.setTextSelection({ from, to });
          },
          getValue() {
            return editor?.getHTML();
          },
          getSelectionStart() {
            return editor?.state.selection.from;
          },
          getSelectionEnd() {
            return editor?.state.selection.to;
          },
          getSelectionText() {
            const { from, to } = editor!.state.selection;
            return editor?.state.doc.textBetween(from, to, " ");
          },
          replaceSelectionText(content: string) {
            const { from, to } = editor!.state.selection;
            editor?.commands.insertContentAt({ from, to }, content);
          },
          getEditor() {
            return editor;
          },
          isEmpty() {
            return editor?.isEmpty;
          },
          insertContentAtCurrentCursor(content: string) {
            const { from, to } = editor!.state.selection;
            editor?.commands.insertContentAt({ from: to, to: to }, content);
          },
        } as EditorCommands as any)
    );

    useDebounce(
      () => {
        if (editor) {
          editor.commands.focus();
        }
      },
      100,
      [editor]
    );

    return (
      <Transition transition={"fade"} mounted={!!editor}>
        {styles => (
          <div
            style={styles}
            className={classNames("w-full shadow-xl", className, {
              [classes.limitHeight]: !isReplyBox && editor?.isFocused,
              [classes.limitHeightBlur]: !isReplyBox && !editor?.isFocused,
              [classes.shadow]: !isReplyBox && (editor?.options?.element as any)?.offsetHeight > 70,
            })}
          >
            <RichTextEditor editor={editor} {...(props as any)}>
              <RichTextEditor.Toolbar sticky stickyOffset={0} className={"hidden sm:flex"}>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Bold />
                  <RichTextEditor.Underline />
                  <RichTextEditor.Highlight />
                  <RichTextEditor.CodeBlock />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.H1 />
                  <RichTextEditor.H2 />
                  <RichTextEditor.H3 />
                  <RichTextEditor.H4 />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Blockquote />
                  <RichTextEditor.Hr />
                  <RichTextEditor.BulletList />
                  <RichTextEditor.OrderedList />
                </RichTextEditor.ControlsGroup>
              </RichTextEditor.Toolbar>
              <RichTextEditor.Content />
            </RichTextEditor>
          </div>
        )}
      </Transition>
    );
  })
);

export default UserInput;

export type EditorCommands = {
  focus: () => void;
  setValue: (value: string) => void;
  setSelectionRange: (from: number, to: number) => void;
  getValue: () => string;
  getSelectionText: () => string;
  replaceSelectionText: (content: string) => void;
  isEmpty: () => boolean;
  getSelectionStart: () => number;
  getSelectionEnd: () => number;
  getEditor: () => Editor | undefined | null;
  insertContentAtCurrentCursor: (content: string) => void;
};
