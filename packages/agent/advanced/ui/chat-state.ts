export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  attachments?: MessageAttachment[];
  toolCalls?: ToolCallDisplay[];
  toolResults?: ToolResultDisplay[];
  thinking?: string;
  error?: string;
}

export interface MessageAttachment {
  id: string;
  type: "file" | "image" | "link";
  name: string;
  path?: string;
  url?: string;
  size?: number;
}

export interface ToolCallDisplay {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  input: Record<string, unknown>;
  output?: string;
  duration?: number;
}

export interface ToolResultDisplay {
  id: string;
  tool: string;
  success: boolean;
  output: string;
  duration: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  currentToolCalls: ToolCallDisplay[];
  error?: string;
  sessionId: string;
}

export interface ChatAction {
  type:
    | "send_message"
    | "receive_chunk"
    | "tool_call_start"
    | "tool_call_end"
    | "tool_result"
    | "set_error"
    | "clear_error"
    | "load_history"
    | "clear_chat";
  payload?: any;
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "send_message": {
      const userMessage: ChatMessage = {
        id: action.payload.id,
        role: "user",
        content: action.payload.content,
        timestamp: Date.now(),
        attachments: action.payload.attachments,
      };

      return {
        ...state,
        messages: [...state.messages, userMessage],
        isLoading: true,
        isStreaming: false,
        currentToolCalls: [],
      };
    }

    case "receive_chunk": {
      const lastMessage = state.messages[state.messages.length - 1];
      if (!lastMessage || lastMessage.role !== "assistant") {
        const newMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: action.payload.content,
          timestamp: Date.now(),
        };
        return {
          ...state,
          messages: [...state.messages, newMessage],
          isLoading: true,
          isStreaming: true,
        };
      }

      return {
        ...state,
        messages: [
          ...state.messages.slice(0, -1),
          {
            ...lastMessage,
            content: lastMessage.content + action.payload.content,
          },
        ],
        isLoading: true,
        isStreaming: true,
      };
    }

    case "tool_call_start": {
      const toolCall: ToolCallDisplay = {
        id: action.payload.id,
        name: action.payload.name,
        status: "running",
        input: action.payload.input,
      };
      return {
        ...state,
        currentToolCalls: [...state.currentToolCalls, toolCall],
      };
    }

    case "tool_call_end": {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        return {
          ...state,
          currentToolCalls: state.currentToolCalls.map((tc) =>
            tc.id === action.payload.id
              ? {
                  ...tc,
                  status: action.payload.success ? "completed" : "failed",
                  output: action.payload.output,
                  duration: action.payload.duration,
                }
              : tc,
          ),
          messages: [
            ...state.messages.slice(0, -1),
            {
              ...lastMessage,
              toolCalls: [
                ...(lastMessage.toolCalls || []),
                {
                  id: action.payload.id,
                  name: action.payload.name,
                  status: action.payload.success ? "completed" : "failed",
                  input: action.payload.input,
                  output: action.payload.output,
                  duration: action.payload.duration,
                },
              ],
            },
          ],
        };
      }
      return {
        ...state,
        currentToolCalls: state.currentToolCalls.map((tc) =>
          tc.id === action.payload.id
            ? {
                ...tc,
                status: action.payload.success ? "completed" : "failed",
                output: action.payload.output,
                duration: action.payload.duration,
              }
            : tc,
        ),
      };
    }

    case "tool_result": {
      const result: ToolResultDisplay = {
        id: action.payload.id,
        tool: action.payload.tool,
        success: action.payload.success,
        output: action.payload.output,
        duration: action.payload.duration,
      };

      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        return {
          ...state,
          messages: [
            ...state.messages.slice(0, -1),
            {
              ...lastMessage,
              toolResults: [...(lastMessage.toolResults || []), result],
            },
          ],
        };
      }
      return state;
    }

    case "set_error":
      return {
        ...state,
        isLoading: false,
        isStreaming: false,
        error: action.payload.message,
      };

    case "clear_error":
      return {
        ...state,
        error: undefined,
      };

    case "load_history":
      return {
        ...state,
        messages: action.payload.messages,
        isLoading: false,
        isStreaming: false,
      };

    case "clear_chat":
      return {
        ...state,
        messages: [],
        isLoading: false,
        isStreaming: false,
        currentToolCalls: [],
        error: undefined,
      };

    default:
      return state;
  }
}

export function createInitialChatState(sessionId: string): ChatState {
  return {
    messages: [],
    isLoading: false,
    isStreaming: false,
    currentToolCalls: [],
    sessionId,
  };
}