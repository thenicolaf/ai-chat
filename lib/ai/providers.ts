import { groq } from "@ai-sdk/groq";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        // Llama 3.3 70B - мощная открытая модель с отличным качеством
        "chat-model": groq("llama-3.3-70b-versatile"),

        // Llama 3.1 70B - для сложных задач с рассуждениями
        "chat-model-reasoning": groq("llama-3.1-70b-versatile"),

        // Llama 3.1 8B - быстрая модель для генерации заголовков
        "title-model": groq("llama-3.1-8b-instant"),

        // Llama 3.3 70B для создания артефактов
        "artifact-model": groq("llama-3.3-70b-versatile"),
      },
    });
