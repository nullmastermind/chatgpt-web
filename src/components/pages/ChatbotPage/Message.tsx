import { useSessionStorage } from "react-use";
import { Button, Textarea } from "@mantine/core";

export type MessageProps = {
  collection: any;
  prompt: {
    id: number;
    name: string;
    prompts: any[];
  };
};

const Message = ({ collection, prompt }: MessageProps) => {
  const [messageContent, setMessageContent] = useSessionStorage(`:messageBox${collection}`, "");

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex-grow">content</div>
      <div className="flex flex-row items-baseline gap-3">
        <Textarea
          placeholder="Send a message..."
          onChange={e => setMessageContent(e.target.value)}
          value={messageContent}
          autosize={true}
          maxRows={3}
          minRows={3}
          className="flex-grow"
        />
        <Button>Send</Button>
      </div>
    </div>
  );
};

export default Message;
