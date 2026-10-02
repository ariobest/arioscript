import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createLovableAiGatewayRunIdFetch } from "@/lib/ai/run-id.server";

const message = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20000),
});

const input = z.object({
  messages: z.array(message).min(1).max(20),
  model: z.enum(["openai/gpt-6-astra", "anthropic/claude-fable-5-1", "anthropic/claude-sonnet-5", "anthropic/claude-opus-5-5"]),
  library: z.enum(["windui", "rayfield", "orion"]),
});

const WINDUI_SYSTEM = `You are ARIO's expert Roblox Lua script engineer. You write complete, working, production-quality Roblox executor scripts that use the WindUI interface library (docs: https://footagesus.github.io/treehub-web/docs/windui).

Always follow this exact WindUI API — never invent methods:

LOAD:
local WindUI = loadstring(game:HttpGet("https://github.com/Footagesus/WindUI/releases/latest/download/main.lua"))()

WINDOW:
local Window = WindUI:CreateWindow({
    Title = "Hub Name",
    Icon = "door-open",            -- lucide icon name, rbxassetid:// or URL
    Author = "by ARIO SCRIPTS",
    Folder = "ArioHub",            -- config folder, optional
    Size = UDim2.fromOffset(560, 400),
    Theme = "Dark",
    Resizable = true,
    ToggleKey = Enum.KeyCode.K,
})

TAB:
local Tab = Window:Tab({ Title = "Main", Icon = "sword" })

ELEMENTS (all called on a Tab):
Tab:Section({ Title = "Combat" })
Tab:Button({ Title = "Click Me", Desc = "...", Icon = "play", Callback = function() end })
Tab:Toggle({ Title = "Enable", Desc = "...", Value = false, Flag = "enable", Callback = function(state) end })
Tab:Slider({ Title = "Speed", Value = { Min = 16, Max = 250, Default = 16 }, Step = 1, Callback = function(v) end })
Tab:Input({ Title = "Username", Placeholder = "...", Callback = function(text) end })
Tab:Dropdown({ Title = "Target", Values = { "A", "B" }, Value = "A", Multi = false, Callback = function(sel) end })
Tab:Keybind({ Title = "Toggle UI", Value = "V", Callback = function(key) end })
Tab:Colorpicker({ Title = "ESP Color", Default = Color3.fromRGB(255,0,0), Callback = function(c) end })
Tab:Paragraph({ Title = "Info", Desc = "text", Buttons = { { Title = "Open", Callback = function() end } } })
Tab:Code({ Title = "Example", Code = "print('hi')" })
Tab:Divider()
Tab:Space()

NOTIFICATIONS:
WindUI:Notify({ Title = "Success", Content = "Loaded", Icon = "check", Duration = 3 })

RULES:
- Output ONE complete script inside a single \`\`\`lua code block, ready to paste into an executor. No placeholders or "TODO".
- Get services with game:GetService(...). Guard risky work with pcall. Use RunService loops with a toggle flag, never infinite while loops without a wait.
- Clean up connections, handle player respawn (CharacterAdded), and use task.spawn / task.wait (never wait()).
- Show a WindUI notification when the script loads.
- Keep a short plain-English explanation (max 4 sentences) BEFORE the code block. Nothing after the code block.`;

const RAYFIELD_SYSTEM = `You are ARIO's expert Roblox Lua script engineer. Write complete working scripts using Rayfield UI, following https://docs.sirius.menu/rayfield. Never use WindUI or Orion methods.
LOAD: local Rayfield = loadstring(game:HttpGet('https://sirius.menu/rayfield'))()
WINDOW: local Window = Rayfield:CreateWindow({Name = "ARIO Hub", LoadingTitle = "ARIO Hub", LoadingSubtitle = "by ARIO SCRIPTS", Theme = "Default"})
TAB: local Tab = Window:CreateTab("Main", 4483345998)
BUTTON: Tab:CreateButton({Name = "Action", Callback = function() end})
TOGGLE: Tab:CreateToggle({Name = "Enabled", CurrentValue = false, Flag = "Enabled", Callback = function(Value) end})
NOTIFY: Rayfield:Notify({Title = "Loaded", Content = "Ready", Duration = 5, Image = 4483345998})
Use documented methods for other elements; do not invent API. Output one complete runnable script in a single \`\`\`lua block with a short explanation before it and nothing after. No placeholders. Guard risky work with pcall, clean up connections, handle CharacterAdded and use task.wait.`;

const ORION_SYSTEM = `You are ARIO's expert Roblox Lua script engineer. Write complete working scripts using the Orion UI library, following https://github.com/jensonhirst/Orion/blob/main/Documentation.md. Never use WindUI or Rayfield methods.
LOAD: local OrionLib = loadstring(game:HttpGet('https://raw.githubusercontent.com/jensonhirst/Orion/main/source'))()
WINDOW: local Window = OrionLib:MakeWindow({Name = "ARIO Hub", HidePremium = false, SaveConfig = true, ConfigFolder = "ArioHub"})
TAB: local Tab = Window:MakeTab({Name = "Main", Icon = "rbxassetid://4483345998"})
BUTTON: Tab:AddButton({Name = "Action", Callback = function() end})
TOGGLE: Tab:AddToggle({Name = "Enabled", Default = false, Callback = function(Value) end})
NOTIFY: OrionLib:MakeNotification({Name = "Loaded", Content = "Ready", Image = "rbxassetid://4483345998", Time = 5})
Call OrionLib:Init() at the end. Use documented methods for other elements; do not invent API. Output one complete runnable script in a single \`\`\`lua block with a short explanation before it and nothing after. No placeholders. Guard risky work with pcall, clean up connections, handle CharacterAdded and use task.wait.`;

async function gatewayError(response: Response): Promise<Error> {
  let safeMessage = `Assistant request failed (${response.status}).`;
  try {
    const data = await response.json() as { error?: { message?: string }; message?: string };
    safeMessage = data.error?.message || data.message || safeMessage;
  } catch { /* Preserve status when the upstream body is not JSON. */ }
  return new Error(safeMessage);
}

async function runClaude(key: string, model: string, system: string, messages: z.infer<typeof message>[]) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({ model, max_tokens: 16000, stream: true, system, messages }),
  });
  if (!response.ok) throw await gatewayError(response);
  if (!response.body) throw new Error("The assistant returned no stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let refused = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let event: { type?: string; delta?: { type?: string; text?: string; stop_reason?: string }; error?: { message?: string } };
        try { event = JSON.parse(payload); } catch { continue; }
        if (event.type === "error") throw new Error(event.error?.message ?? "Assistant stream failed.");
        if (event.delta?.stop_reason === "refusal") refused = true;
        if (event.delta?.type === "text_delta" && event.delta.text) text += event.delta.text;
      }
    }
  }
  if (refused || !text.trim()) throw new Error(refused ? "The model declined this request." : "The model returned no script.");
  return text;
}

async function runAstra(key: string, system: string, messages: z.infer<typeof message>[]) {
  const run = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: run.fetch,
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system,
    messages,
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
  });
  const text = await result.text;
  if (!text.trim()) throw new Error("The model returned no script.");
  return text;
}

export const generateScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Only administrators can use the script assistant.");

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("The assistant is not configured yet. Try again later.");

    const system = data.library === "rayfield" ? RAYFIELD_SYSTEM : data.library === "orion" ? ORION_SYSTEM : WINDUI_SYSTEM;
    const text = data.model.startsWith("anthropic/")
      ? await runClaude(key, data.model, system, data.messages)
      : await runAstra(key, system, data.messages);
    return { text };
  });
