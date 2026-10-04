export const KEY_GUI_STYLES = [
  { id: "frost", name: "Frost", detail: "Midnight glass with an electric edge" },
  { id: "terminal", name: "Terminal", detail: "Compact command-console layout" },
  { id: "pulse", name: "Pulse", detail: "Bright outline and soft glow" },
  { id: "minimal", name: "Minimal", detail: "Quiet, focused verification" },
] as const;

export const KEY_GUI_LIBRARIES = [
  { id: "native", name: "Native Roblox" },
  { id: "windui", name: "WindUI" },
  { id: "rayfield", name: "Rayfield" },
  { id: "orion", name: "Orion" },
] as const;

export type KeyGuiStyle = (typeof KEY_GUI_STYLES)[number]["id"];
export type KeyGuiLibrary = (typeof KEY_GUI_LIBRARIES)[number]["id"];

const palette: Record<KeyGuiStyle, { base: string; panel: string; accent: string; soft: string }> = {
  frost: { base: "12, 18, 32", panel: "23, 34, 54", accent: "62, 147, 255", soft: "164, 195, 230" },
  terminal: { base: "9, 17, 19", panel: "17, 31, 32", accent: "82, 220, 164", soft: "167, 216, 195" },
  pulse: { base: "18, 16, 35", panel: "33, 29, 62", accent: "131, 122, 255", soft: "207, 195, 249" },
  minimal: { base: "20, 24, 32", panel: "34, 40, 51", accent: "192, 210, 232", soft: "159, 172, 190" },
};

export function makeKeyGui(style: KeyGuiStyle, library: KeyGuiLibrary, origin: string) {
  const c = palette[style];
  const url = `${origin}/api/public/keys/validate`;
  const libraryCode: Record<KeyGuiLibrary, string> = {
    native: `-- Native edition: the ARIO gate below is the entire interface.\nprint("ARIO: key verified; place your protected script below this line")`,
    windui: `-- WindUI edition: the ARIO gate runs BEFORE loading the library.\nlocal WindUI = loadstring(game:HttpGet("https://github.com/Footagesus/WindUI/releases/latest/download/main.lua"))()\nlocal Window = WindUI:CreateWindow({ Title = "ARIO SCRIPTS", Author = "Verified session", Size = UDim2.fromOffset(520, 360), Theme = "Dark" })\nlocal Tab = Window:Tab({ Title = "Home", Icon = "shield-check" })\nTab:Paragraph({ Title = "Access granted", Desc = "Your key was checked with ARIO." })\nWindUI:Notify({ Title = "ARIO", Content = "Key verified", Duration = 3 })`,
    rayfield: `-- Rayfield edition: the ARIO gate runs BEFORE loading the library.\nlocal Rayfield = loadstring(game:HttpGet("https://sirius.menu/rayfield"))()\nlocal Window = Rayfield:CreateWindow({ Name = "ARIO SCRIPTS", LoadingTitle = "ARIO SCRIPTS", LoadingSubtitle = "Verified session", Theme = "Default" })\nlocal Tab = Window:CreateTab("Home", 4483345998)\nTab:CreateButton({ Name = "Key verified", Callback = function() print("ARIO ready") end })\nRayfield:Notify({ Title = "ARIO", Content = "Key verified", Duration = 4, Image = 4483345998 })`,
    orion: `-- Orion edition: the ARIO gate runs BEFORE loading the library.\nlocal OrionLib = loadstring(game:HttpGet("https://raw.githubusercontent.com/jensonhirst/Orion/main/source"))()\nlocal Window = OrionLib:MakeWindow({ Name = "ARIO SCRIPTS", HidePremium = false, SaveConfig = false })\nlocal Tab = Window:MakeTab({ Name = "Home", Icon = "rbxassetid://4483345998" })\nTab:AddButton({ Name = "Key verified", Callback = function() print("ARIO ready") end })\nOrionLib:MakeNotification({ Name = "ARIO", Content = "Key verified", Time = 4, Image = "rbxassetid://4483345998" })\nOrionLib:Init()`,
  };

  return `-- ARIO SCRIPTS | ${style.toUpperCase()} | ${library.toUpperCase()}
-- Paste this block BEFORE the rest of your script. The remaining code runs only after verification.
-- The GUI appears on every execution. Saved keys are prefilled, never silently accepted.
-- Client-side gates can be removed by a modified executor; do not treat this as server-side DRM.
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local TweenService = game:GetService("TweenService")
local player = Players.LocalPlayer
local keyFile = "ArioKey.txt"
local endpoint = "${url}"
local accessGranted = false
local cancelled = false

local function color(rgb) return Color3.fromRGB(rgb) end
local base = color(${c.base})
local panel = color(${c.panel})
local accent = color(${c.accent})
local soft = color(${c.soft})
local function corner(parent, radius)
    local item = Instance.new("UICorner")
    item.CornerRadius = UDim.new(0, radius)
    item.Parent = parent
end
local function label(parent, text, y, height, size, tint, bold)
    local item = Instance.new("TextLabel")
    item.BackgroundTransparency = 1
    item.Position = UDim2.fromOffset(22, y)
    item.Size = UDim2.new(1, -44, 0, height)
    item.Text = text
    item.TextColor3 = tint
    item.Font = bold and Enum.Font.GothamBold or Enum.Font.Gotham
    item.TextSize = size
    item.TextXAlignment = Enum.TextXAlignment.Left
    item.TextTruncate = Enum.TextTruncate.AtEnd
    item.Parent = parent
    return item
end
local function verify(key)
    key = key:gsub("%s+", ""):upper()
    if not key:match("^ARIO%-%x%x%x%x%x%x%x%x%-%x%x%x%x%x%x%x%x%-%x%x%x%x%x%x%x%x$") then
        return false, "Enter a complete ARIO key"
    end
    local ok, result = pcall(function()
        local requestFn = (syn and syn.request) or (http and http.request) or http_request or request
        if requestFn then
            local response = requestFn({ Url = endpoint, Method = "POST", Headers = { ["Content-Type"] = "application/json" }, Body = HttpService:JSONEncode({ key = key }) })
            if response.StatusCode ~= 200 then error("Service unavailable") end
            return HttpService:JSONDecode(response.Body)
        end
        return HttpService:JSONDecode(game:HttpGet(endpoint .. "?key=" .. HttpService:UrlEncode(key)))
    end)
    if not ok then return false, "Could not reach ARIO. Try again." end
    return result.valid == true, result.valid and "Verified" or "Invalid, expired or revoked key"
end

local previous = game:GetService("CoreGui"):FindFirstChild("ArioKeyGate")
if previous then previous:Destroy() end
local gui = Instance.new("ScreenGui")
gui.Name = "ArioKeyGate"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.DisplayOrder = 10000
gui.Parent = game:GetService("CoreGui")
local shade = Instance.new("Frame")
shade.Size = UDim2.fromScale(1, 1)
shade.BackgroundColor3 = Color3.new(0, 0, 0)
shade.BackgroundTransparency = 0.35
shade.Parent = gui

local card = Instance.new("Frame")
card.AnchorPoint = Vector2.new(0.5, 0.5)
card.Position = UDim2.fromScale(0.5, 0.5)
card.Size = UDim2.fromOffset(420, 370)
card.BackgroundColor3 = base
card.Parent = shade
corner(card, 18)
local stroke = Instance.new("UIStroke")
stroke.Color = accent
stroke.Thickness = 2
stroke.Transparency = 0.15
stroke.Parent = card
local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new(accent, soft)
gradient.Parent = stroke
local alive = true
task.spawn(function()
    while alive and stroke.Parent do
        TweenService:Create(gradient, TweenInfo.new(4, Enum.EasingStyle.Linear), { Rotation = gradient.Rotation + 360 }):Play()
        task.wait(4)
    end
end)
local scale = Instance.new("UIScale")
scale.Parent = card
local camera = workspace.CurrentCamera
local function fit()
    local viewport = camera.ViewportSize
    scale.Scale = math.min(1, (viewport.X - 24) / 420, (viewport.Y - 24) / 370)
end
fit()
local resizeConnection = camera:GetPropertyChangedSignal("ViewportSize"):Connect(fit)
local top = Instance.new("Frame")
top.Size = UDim2.new(1, 0, 0, 154)
top.BackgroundColor3 = panel
top.Parent = card
corner(top, 18)
label(top, "ARIO  /  ACCESS CONTROL", 15, 23, 16, accent, true)
label(top, player.DisplayName .. "  @" .. player.Name, 48, 22, 14, Color3.new(1, 1, 1), true)
local executor = "Executor"
pcall(function() executor = identifyexecutor() end)
label(top, executor .. "  ·  " .. game.Name, 76, 20, 12, soft, false)
local avatar = Instance.new("ImageLabel")
avatar.Position = UDim2.new(1, -78, 0, 44)
avatar.Size = UDim2.fromOffset(54, 54)
avatar.BackgroundColor3 = base
avatar.Image = "rbxthumb://type=AvatarHeadShot&id=" .. player.UserId .. "&w=150&h=150"
avatar.Parent = top
corner(avatar, 27)
label(top, "Secure key verification", 113, 22, 14, soft, false)

local close = Instance.new("TextButton")
close.Position = UDim2.new(1, -42, 0, 8)
close.Size = UDim2.fromOffset(32, 32)
close.BackgroundTransparency = 1
close.Text = "×"
close.TextSize = 24
close.TextColor3 = soft
close.Parent = card
local input = Instance.new("TextBox")
input.Position = UDim2.fromOffset(22, 174)
input.Size = UDim2.new(1, -44, 0, 48)
input.BackgroundColor3 = panel
input.TextColor3 = Color3.new(1, 1, 1)
input.PlaceholderColor3 = soft
input.PlaceholderText = "ARIO-XXXXXXXX-XXXXXXXX-XXXXXXXX"
input.Text = ""
input.ClearTextOnFocus = false
input.Font = Enum.Font.Code
input.TextSize = 14
input.Parent = card
corner(input, 10)
pcall(function() if isfile and isfile(keyFile) and readfile then input.Text = readfile(keyFile) end end)
local status = label(card, "Your key is checked with ARIO on every run.", 231, 25, 12, soft, false)
local verifyButton = Instance.new("TextButton")
verifyButton.Position = UDim2.fromOffset(22, 270)
verifyButton.Size = UDim2.new(1, -44, 0, 48)
verifyButton.BackgroundColor3 = accent
verifyButton.TextColor3 = base
verifyButton.Text = "VERIFY KEY  →"
verifyButton.Font = Enum.Font.GothamBold
verifyButton.TextSize = 14
verifyButton.Parent = card
corner(verifyButton, 10)
local getKey = Instance.new("TextButton")
getKey.Position = UDim2.fromOffset(22, 328)
getKey.Size = UDim2.new(1, -44, 0, 26)
getKey.BackgroundTransparency = 1
getKey.TextColor3 = soft
getKey.Font = Enum.Font.Gotham
getKey.TextSize = 12
getKey.Text = "GET A KEY  ·  ${origin}/keys"
getKey.Parent = card
getKey.MouseButton1Click:Connect(function()
    if setclipboard then setclipboard("${origin}/keys") end
    status.Text = "Key page link copied"
end)
close.MouseButton1Click:Connect(function() cancelled = true; alive = false; resizeConnection:Disconnect(); gui:Destroy() end)
verifyButton.MouseButton1Click:Connect(function()
    if verifyButton.Text == "CHECKING…" then return end
    verifyButton.Text = "CHECKING…"
    local ok, message = verify(input.Text)
    if cancelled then return end
    status.Text = message
    if ok then
        pcall(function() if writefile then writefile(keyFile, input.Text:gsub("%s+", ""):upper()) end end)
        accessGranted = true
        alive = false
        resizeConnection:Disconnect()
        gui:Destroy()
    else
        verifyButton.Text = "VERIFY KEY  →"
    end
end)
while not accessGranted and not cancelled do task.wait(0.15) end
if not accessGranted then return end

${libraryCode[library]}

-- Place the rest of your script BELOW this line.
`;
}