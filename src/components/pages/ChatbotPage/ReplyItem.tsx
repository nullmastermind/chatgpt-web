import { useCollections, useCurrentCollection } from "@/states/states";
import { memo, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { find } from "lodash";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import { TextInput } from "@mantine/core";
import { TypeBox } from "@/components/pages/ChatbotPage/TypeBox";
import { AttachItem } from "@/components/misc/types";

type ReplyItemProps = {
  messages: any[];
  viewport: RefObject<HTMLDivElement>;
  includeMessages: any[];
  position: number;
  onSend: (
    content: string,
    attachItems: AttachItem[],
    index?: number,
    includeMessages?: any[],
    tokens?: number,
    docId?: string
  ) => any;
  exId: any;
};

const ReplyItem = memo<ReplyItemProps>(({ messages, includeMessages, position, onSend, exId }) => {
  const [collectionId] = useCurrentCollection();
  const [collections] = useCollections();
  const collection = useMemo(() => {
    return find(collections, v => v.key === collectionId);
  }, [collectionId, collections]);
  const { classes } = useStyles();
  const [showFullEdit, setShowFullEdit] = useState(false);
  const boxRef = useRef<any>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showFullEdit && elementRef.current) {
      elementRef.current.scrollIntoView({ behavior: "smooth", block: "end", inline: "start" });
    }
  }, [showFullEdit, elementRef]);

  return (
    <div className={classes.writeReplyContainer}>
      <div className={"px-3 py-2 relative"}>
        {!showFullEdit && (
          <TextInput
            size={"sm"}
            placeholder={"Write a reply"}
            onFocus={() => {
              setShowFullEdit(true);
            }}
          />
        )}
        {showFullEdit && (
          <div className={"flex flex-col gap-3"}>
            <TypeBox
              exId={exId}
              ref={boxRef}
              collection={collection}
              onSubmit={(content, tokens, docId, attachItems) => {
                onSend(content, attachItems, position, includeMessages, tokens, docId);
              }}
              messages={messages}
              onCancel={() => setShowFullEdit(false)}
              isReplyBox={true}
              includeMessages={includeMessages}
            />
          </div>
        )}
        <div
          ref={elementRef}
          className={"absolute"}
          style={{
            bottom: "-2.25rem",
          }}
        />
      </div>
    </div>
  );
});

export default ReplyItem;
