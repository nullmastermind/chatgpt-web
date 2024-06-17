import { Button, Loader, Transition, createStyles } from '@mantine/core';
import { useClickOutside } from '@mantine/hooks';
import { Link, RichTextEditor } from '@mantine/tiptap';
import { IconMicrophone, IconPrompt, IconVolume } from '@tabler/icons-react';
import { Extension } from '@tiptap/core';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Editor, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import classNames from 'classnames';
import {
  ComponentPropsWithRef,
  cloneElement,
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { useDebounce } from 'react-use';
import { Markdown } from 'tiptap-markdown';

import Recorder from '@/components/misc/Recorder';
import TextToSpeech from '@/components/misc/TextToSpeech';
import { fixEditorOutput } from '@/utility/utility';

const useStyles = createStyles(() => ({
  limitHeight: {
    '& .mantine-TypographyStylesProvider-root': {
      maxHeight: '50vh',
      overflow: 'auto',
      transition: 'max-height 0.2s ease, overflow 0.2s ease',
    },
  },
  limitHeightBlur: {
    '& .mantine-TypographyStylesProvider-root': {
      maxHeight: '57px',
      overflow: 'hidden',
      transition: 'max-height 0.2s ease, overflow 0.2s ease',
    },
  },
  shadow: {
    boxShadow:
      '0 0 10px rgba(255, 255, 255, 0.1), 0 0 20px rgba(255, 255, 255, 0.1), 0 0 30px rgba(255, 255, 255, 0.1) !important',
    background: '#1a1b1e',
  },
}));

const UserInput = memo<
  ComponentPropsWithRef<'textarea'> & {
    className?: string;
    defaultValue?: string;
    onChange?: (value: string) => any;
    isReplyBox?: boolean;
  }
>(
  forwardRef(({ className, defaultValue, onChange, isReplyBox, placeholder, ...props }, ref) => {
    const { classes } = useStyles();
    const editor = useEditor({
      extensions: [
        StarterKit,
        Markdown.configure({
          transformCopiedText: true,
          transformPastedText: true,
        }),
        Link,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({
          placeholder: placeholder || 'Enter a prompt here',
        }),
        Underline,
        ShiftEnterCreateExtension, // EventHandler,
      ],
      content: defaultValue || '',
      onUpdate({ editor }) {
        onChange?.(fixEditorOutput(editor.storage.markdown.getMarkdown()));
      },
    });
    const [isFocused, setIsFocused] = useState(false);
    const clickOutsideRef = useClickOutside(() => {
      setIsFocused(false);
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
            return fixEditorOutput(editor?.storage.markdown.getMarkdown());
          },
          getSelectionStart() {
            return editor?.state.selection.from;
          },
          getSelectionEnd() {
            return editor?.state.selection.to;
          },
          getSelectionText() {
            const { from, to } = editor!.state.selection;
            return editor?.state.doc.textBetween(from, to, ' ');
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
            editor?.commands.insertContentAt({ from: from, to: to }, content);
          },
          getText() {
            return editor?.getText() || '';
          },
        }) as EditorCommands as any,
    );

    useDebounce(
      () => {
        if (editor) {
          editor.commands.focus();
          if (defaultValue) {
            editor?.commands.setTextSelection({
              from: defaultValue.length,
              to: defaultValue.length,
            });
          }
        }
      },
      100,
      [editor],
    );
    // useDebounce(
    //   () => {
    //     if (!editor?.isFocused) setIsFocused(false);
    //   },
    //   100,
    //   [editor?.isFocused]
    // );
    useEffect(() => {
      if (editor?.isFocused) setIsFocused(true);
    }, [editor?.isFocused]);

    return (
      <Transition transition={'fade'} mounted={!!editor}>
        {(styles) => (
          <div
            ref={clickOutsideRef}
            style={styles}
            className={classNames('w-full shadow-xl', className, {
              [classes.limitHeight]: !isReplyBox && isFocused,
              [classes.limitHeightBlur]: !isReplyBox && !isFocused,
              [classes.shadow]: !isReplyBox && (editor?.options?.element as any)?.offsetHeight > 70,
            })}
          >
            <RichTextEditor editor={editor} {...(props as any)}>
              <RichTextEditor.Toolbar
                sticky
                stickyOffset={0}
                className={'flex-nowrap overflow-auto z-auto'}
              >
                <RichTextEditor.ControlsGroup>
                  <Recorder
                    onText={(text) => {
                      const { from, to } = editor!.state.selection;
                      editor?.commands.insertContentAt({ from: from, to: to }, text);
                      editor?.commands.focus();
                    }}
                  />
                  <TextToSpeech getText={() => editor?.getText() || ''}>
                    {({ isLoading }) => {
                      if (isLoading) {
                        return (
                          <RichTextEditor.ClearFormatting
                            title="Text to speech"
                            icon={() => {
                              return <Loader size={'xs'} variant={'dots'} />;
                            }}
                          />
                        );
                      }
                      return (
                        <RichTextEditor.ClearFormatting
                          title="Text to speech"
                          icon={IconVolume as any}
                        />
                      );
                    }}
                  </TextToSpeech>
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.Bold />
                  {/*<RichTextEditor.Italic />*/}
                  {/*<RichTextEditor.Underline />*/}
                  <RichTextEditor.Strikethrough />
                  <RichTextEditor.Code icon={IconPrompt as any} />
                  <RichTextEditor.CodeBlock />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
                  <RichTextEditor.H1 />
                  <RichTextEditor.H2 />
                  <RichTextEditor.H3 />
                  <RichTextEditor.H4 />
                </RichTextEditor.ControlsGroup>
                <RichTextEditor.ControlsGroup>
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
  }),
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
      'Shift-Enter': ({ editor }) => {
        editor.commands.enter();
        return true;
      },
    };
  },
});
