import { Card, Container } from "@mantine/core";

export type ReactElement = JSX.Element | JSX.Element[] | null | undefined | false | number;

export type CenterCardProps = {
  children: ReactElement;
};

const CenterCard = ({ children }: CenterCardProps) => {
  return (
    <Container size="md" px="0" py="0">
      <div className="h-screen w-full flex flex-col">
        <Card padding="md" radius="0" withBorder={false} className="flex-grow relative bg-transparent">
          {children}
        </Card>
      </div>
    </Container>
  );
};

export default CenterCard;
