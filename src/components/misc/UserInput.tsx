import { ComponentPropsWithRef, memo, useEffect } from "react";
import { RichTextEditor, Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import classNames from "classnames";
import { Transition } from "@mantine/core";
import { useDebounce } from "react-use";

const UserInput = memo<
  ComponentPropsWithRef<"textarea"> & {
    className?: string;
    defaultValue?: string;
    onChange?: (value: string) => any;
  }
>(({ className, defaultValue, onChange, ...props }) => {
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
        <div style={styles} className={classNames("w-full", className)}>
          <RichTextEditor editor={editor} {...(props as any)}>
            <RichTextEditor.Toolbar sticky stickyOffset={60} className={"hidden sm:flex"}>
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
});

export default UserInput;
