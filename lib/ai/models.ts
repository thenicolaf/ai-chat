export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Llama 3.3 70B",
    description: "Powerful open-source model with excellent quality (FREE)",
  },
  {
    id: "chat-model-reasoning",
    name: "Llama 3.1 70B",
    description: "Enhanced reasoning capabilities for complex problems (FREE)",
  },
];
