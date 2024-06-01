import { ComponentPropsWithRef, forwardRef, memo, useImperativeHandle } from "react";
import { Link, RichTextEditor } from "@mantine/tiptap";
import { Editor, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extension-placeholder";
import classNames from "classnames";
import { createStyles, Transition } from "@mantine/core";
import { useDebounce } from "react-use";
import { markdownToHtml } from "@/utility/utility";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DOMParser as DOMParser2 } from "prosemirror-model";

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
        Link,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Placeholder.configure({
          placeholder: "Enter a prompt here",
        }),
        ShiftEnterCreateExtension,
        EventHandler,
      ],
      content: defaultValue || "",
      onUpdate({ editor }) {
        const state = pastePluginKey.getState(editor.state);
        if (state.isPasted) {
          // Reset the flag
          editor.view.dispatch(editor.state.tr.setMeta(pastePluginKey, { isPasted: false }));
          console.log("editor.getHTML()", editor.getHTML());
          if (editor.getHTML()?.startsWith("<p></p>")) {
            editor.commands.setContent(editor.getHTML().replace("<p></p>", ""));
          }
        }
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
          getText() {
            return editor?.getText() || "";
          },
        } as EditorCommands as any)
    );

    useDebounce(
      () => {
        if (editor) {
          editor.commands.focus();
          if (defaultValue) {
            editor?.commands.setTextSelection({ from: defaultValue.length, to: defaultValue.length });
          }
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
              <RichTextEditor.Toolbar sticky stickyOffset={0}>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Bold />
                  <RichTextEditor.Italic />
                  <RichTextEditor.CodeBlock />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.H1 />
                  <RichTextEditor.H2 />
                  <RichTextEditor.H3 />
                  <RichTextEditor.H4 />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
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
  getText: () => string;
};

const ShiftEnterCreateExtension = Extension.create({
  addKeyboardShortcuts() {
    return {
      "Shift-Enter": ({ editor }) => {
        editor.commands.enter();
        return true;
      },
    };
  },
});

const pastePluginKey = new PluginKey("pastePlugin");

const EventHandler = Extension.create({
  name: "eventHandler",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pastePluginKey,
        state: {
          init() {
            return { isPasted: false };
          },
          apply(tr, value, oldState, newState) {
            const meta = tr.getMeta(pastePluginKey);
            if (meta && meta.isPasted) {
              return { isPasted: true };
            }
            return { isPasted: false };
          },
        },
        props: {
          handlePaste(view, event, slice) {
            const clipboardData = event.clipboardData;
            const text = clipboardData?.getData("text/plain");
            if (text) {
              const html = markdownToHtml(text);
              const { schema } = view.state;
              const parser = DOMParser2.fromSchema(schema);
              const dom = new DOMParser().parseFromString(html, "text/html");
              const node = parser.parse(dom.body);
              const transaction = view.state.tr.replaceSelectionWith(node);
              transaction.setMeta(pastePluginKey, { isPasted: true });
              view.dispatch(transaction);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
