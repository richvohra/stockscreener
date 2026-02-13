import { Message } from "@/lib/types";

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-zinc-800 text-zinc-100"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
