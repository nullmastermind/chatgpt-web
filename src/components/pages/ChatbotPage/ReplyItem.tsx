import { useCollections, useCurrentCollection } from "@/states/states";
import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { find } from "lodash";
import useStyles from "@/components/pages/ChatbotPage/Message.style";
import { TextInput } from "@mantine/core";
import { TypeBox } from "@/components/pages/ChatbotPage/TypeBox";

type ReplyItemProps = {
  messages: any[];
  viewport: RefObject<HTMLDivElement>;
  includeMessages: any[];
  position: number;
  onSend: (content: string, index?: number, includeMessages?: any[]) => any;
  exId: any;
};

const ReplyItem = ({ messages, includeMessages, position, onSend, exId }: ReplyItemProps) => {
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
              onSubmit={content => onSend(content, position, includeMessages)}
              messages={messages}
              onCancel={() => setShowFullEdit(false)}
              isReplyBox={true}
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
};

export default ReplyItem;
