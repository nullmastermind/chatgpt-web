import { Modal, Button, Text } from "@mantine/core";

export type ConfirmProps = {
  message: string;
  onConfirm: () => any;
  onCancel?: () => any;
  isOpen: boolean;
  title?: any;
  okText?: string;
  cancelText?: string;
};

const Confirm = ({
  message,
  onConfirm,
  isOpen,
  onCancel,
  title = "Confirmation",
  okText = "Confirm",
  cancelText = "Cancel",
}: ConfirmProps) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <Modal opened={isOpen} centered={true} onClose={handleCancel} title={title} size="sm">
      <div>
        <Text>{message}</Text>
      </div>
      <div className={"flex flex-row gap-2 items-center justify-end mt-5"}>
        <Button onClick={handleCancel} variant={"default"}>
          {cancelText}
        </Button>
        <Button color="blue" onClick={handleConfirm}>
          {okText}
        </Button>
      </div>
    </Modal>
  );
};

export default Confirm;
