import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const message = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20000),
});

const input = z.object({
  messages: z.array(message).min(1).max(20),
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        max_tokens: 16000,
        stream: true,
        system: WINDUI_SYSTEM,
        messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (response.status === 429) throw new Error("The assistant is busy right now. Please try again in a moment.");
    if (response.status === 402) throw new Error("AI credits are used up. Add credits to keep using the assistant.");
    if (response.status === 403) throw new Error("The assistant is not allowed to run for this workspace.");
    if (!response.ok || !response.body) throw new Error("The assistant could not answer. Please try again.");

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
          try {
            const event = JSON.parse(payload) as {
              type?: string;
              delta?: { type?: string; text?: string; stop_reason?: string };
              error?: { message?: string };
            };
            if (event.type === "error") throw new Error(event.error?.message ?? "assistant error");
            if (event.delta?.stop_reason === "refusal") refused = true;
            if (event.delta?.type === "text_delta" && event.delta.text) text += event.delta.text;
          } catch {
            /* ignore malformed frame */
          }
        }
      }
    }

    if (refused) throw new Error("The assistant declined this request. Try describing a different script.");
    if (!text.trim()) throw new Error("The assistant returned nothing. Please try again.");
    return { text };
  });
