import { wrapRawContent } from "@/utility/utility";

function buildContent(c: string) {
  return `My prompt:\n\n${wrapRawContent(c)}`;
}

const warmup = {
  improve: [
    {
      role: "user",
      content: buildContent(`js quick sort`),
    },
    {
      role: "assistant",
      content: "Quick sort implementation in JavaScript",
    },
    {
      role: "user",
      content: buildContent(`ts quick select`),
    },
    {
      role: "assistant",
      content: "Quick select implementation in TypeScript",
    },
    {
      role: "user",
      content: buildContent(`Sử dụng vật lý trong Unity ECS`),
    },
    {
      role: "assistant",
      content: "Using physics in Unity ECS",
    },
    {
      role: "user",
      content: buildContent(`Cách triển khai sýtem trong unity ecs`),
    },
    {
      role: "assistant",
      content: "How to implement systems in Unity ECS",
    },
    {
      role: "user",
      content: buildContent(
        "Tôi cần trợ giúp sửa mã của mình:\n" + "\n" + "```\n" + "\n" + "```\n" + "\n" + "Trong trường hợp: "
      ),
    },
    {
      role: "assistant",
      content: "I need help fixing my code:\n" + "\n" + "```\n" + "\n" + "```\n" + "\n" + "In case: ",
    },
    {
      role: "user",
      content: buildContent("帮助我将 tailwind css 类转换为 MUI sx attr。 我的顺风班是:\n" + "```\n" + "\n" + "```"),
    },
    {
      role: "assistant",
      content: "Help me convert tailwind css class to MUI sx attr. My tailwind class is:\n" + "```\n" + "\n" + "```",
    },
    {
      role: "user",
      content: buildContent(
        "Help me define ComponentLookUp code from Component name dự trên ví dụ của tôi:\n" +
          'if Component name is "CMoveSpeed" will generated code (Keep my format 1, 2, 3, 4, 5):\n' +
          "\n" +
          "1. private define:\n" +
          "```\n" +
          "private ComponentLookup<CMoveSpeed> _lMoveSpeed;\n" +
          "```\n" +
          "\n" +
          "2. public define:\n" +
          "```\n" +
          "public ComponentLookup<CMoveSpeed> LMoveSpeed;\n" +
          "```\n" +
          "\n" +
          "3. init:\n" +
          "```\n" +
          "_lMoveSpeed = state.GetComponentLookup<CMoveSpeed>();\n" +
          "```\n" +
          "\n" +
          "4. update:\n" +
          "```\n" +
          "_lMoveSpeed.Update(ref state);\n" +
          "```\n" +
          "\n" +
          "5. pass to ISystem:\n" +
          "```\n" +
          "// just note don't include in your answer: Use a comma at the end of the line instead of a semicolon.\n" +
          "LMoveSpeed = _lMoveSpeed,\n" +
          "```\n" +
          "\n" +
          'Tên component của tôi là: ""'
      ),
    },
    {
      role: "assistant",
      content:
        "Help me define the ComponentLookup code from the Component name following my example:\n" +
        "\n" +
        'If the Component name is "CMoveSpeed", the generated code should be (keeping the format 1, 2, 3, 4, 5):\n' +
        "\n" +
        "1. Private define:\n" +
        "```\n" +
        "private ComponentLookup<CMoveSpeed> _lMoveSpeed;\n" +
        "```\n" +
        "\n" +
        "2. Public define:\n" +
        "```\n" +
        "public ComponentLookup<CMoveSpeed> LMoveSpeed;\n" +
        "```\n" +
        "\n" +
        "3. Initialization:\n" +
        "```\n" +
        "_lMoveSpeed = state.GetComponentLookup<CMoveSpeed>();\n" +
        "```\n" +
        "\n" +
        "4. Update:\n" +
        "```\n" +
        "_lMoveSpeed.Update(ref state);\n" +
        "```\n" +
        "\n" +
        "5. Pass to ISystem:\n" +
        "```\n" +
        "LMoveSpeed = _lMoveSpeed,\n" +
        "```\n" +
        "\n" +
        'My component name is ""',
    },
    {
      role: "user",
      content: buildContent(`vui lòng trả lời bằng tiếng Việt`),
    },
    {
      role: "assistant",
      content: "Write reply in Vietnamese",
    },
    {
      role: "user",
      content: buildContent(`请用中文回复`),
    },
    {
      role: "assistant",
      content: "Write reply in Chinese",
    },
  ],
} as Record<
  string,
  Array<{
    role: "user" | "assistant";
    content: string;
  }>
>;

export default warmup;
