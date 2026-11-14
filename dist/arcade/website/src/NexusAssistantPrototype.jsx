import React, { useState } from "react";

export default function NexusAssistantPrototype() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navSections = [
    {
      title: "Accounts",
      items: [
        "Microsoft Connected",
        "Google Connected",
        "ChatGPT Connected",
      ],
    },
    {
      title: "Conversations",
      items: ["Recent", "Pinned", "Favorites", "Shared"],
    },
    {
      title: "AI Providers",
      items: ["Microsoft Copilot", "ChatGPT", "Google Gemini"],
    },
    {
      title: "Quick Actions",
      items: [
        "New Chat",
        "Summarize Document",
        "Draft Email",
        "Schedule Meeting",
      ],
    },
    {
      title: "Workspace",
      items: ["Documents", "Projects", "Tasks", "Uploads"],
    },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-30
          w-72 h-full
          bg-slate-900 border-r border-slate-800
          transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="p-4 border-b border-slate-800">
          <div className="text-xl font-bold">
            🧠 Nexus Assistant
          </div>
          <div className="text-sm text-slate-400 mt-1">
            Unified AI Workspace
          </div>

          <input
            placeholder="Search..."
            className="w-full mt-4 rounded-xl bg-slate-800 px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="overflow-y-auto h-full pb-32">
          {navSections.map((section) => (
            <div key={section.title} className="p-4">
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                {section.title}
              </div>

              <div className="space-y-2">
                {section.items.map((item) => (
                  <button
                    key={item}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex flex-1 min-w-0">
        {/* Workspace */}
        <main className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden text-xl"
                onClick={() => setSidebarOpen(true)}
              >
                ☰
              </button>

              <h1 className="font-semibold">
                Nexus Assistant
              </h1>
            </div>

            <div className="flex gap-2">
              <button className="bg-slate-800 px-3 py-2 rounded-lg">
                🔔
              </button>

              <button className="bg-blue-600 px-4 py-2 rounded-lg">
                New Chat
              </button>
            </div>
          </header>

          {/* Connected Providers */}
          <section className="border-b border-slate-800 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ProviderCard
                name="Microsoft"
                icon="🟦"
                status="Connected"
              />

              <ProviderCard
                name="Google"
                icon="🟥"
                status="Connected"
              />

              <ProviderCard
                name="ChatGPT"
                icon="⚫"
                status="Connected"
              />
            </div>
          </section>

          {/* Chat Workspace */}
          <section className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <ChatBubble
                role="assistant"
                provider="Microsoft Copilot"
                text="Welcome to Nexus Assistant. I can help connect your Microsoft, Google, and OpenAI ecosystems."
              />

              <ChatBubble
                role="user"
                text="Show me my productivity dashboard."
              />

              <ChatBubble
                role="assistant"
                provider="ChatGPT"
                text="Your unified dashboard will include tasks, documents, meetings, repositories, and connected AI providers."
              />
            </div>
          </section>

          {/* Composer */}
          <footer className="border-t border-slate-800 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-slate-800 rounded-xl px-4 py-3 outline-none"
                  placeholder="Ask Nexus anything..."
                />

                <button className="bg-blue-600 px-5 rounded-xl">
                  Send
                </button>
              </div>
            </div>
          </footer>
        </main>

        {/* Context Panel */}
        <aside className="hidden xl:flex flex-col w-80 border-l border-slate-800 bg-slate-900">
          <div className="p-4 border-b border-slate-800">
            <div className="font-semibold">
              Smart Context
            </div>
          </div>

          <div className="p-4 space-y-4">
            <ContextCard
              title="Files"
              value="12 Active Documents"
            />

            <ContextCard
              title="Calendar"
              value="3 Upcoming Meetings"
            />

            <ContextCard
              title="Projects"
              value="7 Active Projects"
            />

            <ContextCard
              title="AI Provider"
              value="GPT-5 Active"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function ProviderCard({
  name,
  icon,
  status,
}: {
  name: string;
  icon: string;
  status: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-2xl">{icon}</div>
      <div className="font-medium mt-2">
        {name}
      </div>
      <div className="text-green-400 text-sm">
        {status}
      </div>
    </div>
  );
}

function ChatBubble({
  role,
  text,
  provider,
}: {
  role: string;
  text: string;
  provider?: string;
}) {
  const assistant = role === "assistant";

  return (
    <div
      className={`flex ${assistant ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-xl rounded-2xl p-4 ${assistant ? "bg-slate-800" : "bg-blue-600"}`}
      >
        {provider && (
          <div className="text-xs text-slate-400 mb-2">
            {provider}
          </div>
        )}

        {text}
      </div>
    </div>
  );
}

function ContextCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-slate-800">
      <div className="text-xs uppercase text-slate-400">
        {title}
      </div>

      <div className="mt-2 font-medium">
        {value}
      </div>
    </div>
  );
}
