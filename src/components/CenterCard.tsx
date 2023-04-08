import { Card, Container } from "@mantine/core";

export type CenterCardProps = {
  children: JSX.Element | JSX.Element[];
};

const CenterCard = ({ children }: CenterCardProps) => {
  return (
    <Container size="sm" px="xs" py="0">
      <div className="h-screen flex flex-col">
        <Card padding="md" radius="md" withBorder className="flex-grow my-3">
          {children}
        </Card>
      </div>
    </Container>
  );
};

export default CenterCard;
