--[[
    ARIO ADMIN SUITE v2.4 Pro
    Client UI for YOUR Roblox experience.

    Put this LocalScript in StarterPlayerScripts.
    Pair it with the ARIO ADMIN SUITE server Script.

    The privileged operations are sent to the server.
    This client intentionally does not contain executor-only request APIs,
    ESP cheats, or client-side permission bypasses.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local TeleportService = game:GetService("TeleportService")
local GuiService = game:GetService("GuiService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("ArioAdmin")
local command = remotes:WaitForChild("Command")
local verify = remotes:WaitForChild("VerifyLicense")
local status = remotes:WaitForChild("Status")

local GET_KEY_URL = "https://arioscript.lovable.app/keys"
local SAVED_KEY = ""

local themes = {
    Cyan = Color3.fromRGB(34, 211, 238),
    Blue = Color3.fromRGB(59, 130, 246),
    Crimson = Color3.fromRGB(239, 68, 68),
    Emerald = Color3.fromRGB(16, 185, 129),
    Purple = Color3.fromRGB(139, 92, 246),
}

local theme = themes.Blue
local soundEnabled = true
local minimized = false
local connections = {}

local function safe(fn, ...)
    local args = table.pack(...)
    local ok, result = pcall(function()
        return fn(table.unpack(args, 1, args.n))
    end)
    return ok, result
end

local function tween(instance, info, props)
    local ok, result = pcall(function()
        local t = TweenService:Create(instance, info, props)
        t:Play()
        return t
    end)
    return ok, result
end

local function addConnection(connection)
    table.insert(connections, connection)
    return connection
end

local function disconnectAll()
    for _, connection in connections do
        pcall(function() connection:Disconnect() end)
    end
    table.clear(connections)
end

local gui = Instance.new("ScreenGui")
gui.Name = "ArioAdminSuite"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = playerGui

local function corner(parent, radius)
    local c = Instance.new("UICorner")
    c.CornerRadius = UDim.new(0, radius or 12)
    c.Parent = parent
    return c
end

local function stroke(parent, color, transparency)
    local s = Instance.new("UIStroke")
    s.Color = color or theme
    s.Transparency = transparency or 0.5
    s.Thickness = 1
    s.Parent = parent
    return s
end

local function gradient(parent, colorA, colorB, rotation)
    local g = Instance.new("UIGradient")
    g.Color = ColorSequence.new({
        ColorSequenceKeypoint.new(0, colorA),
        ColorSequenceKeypoint.new(1, colorB),
    })
    g.Rotation = rotation or 0
    g.Parent = parent
    return g
end

local function label(parent, text, size, color, font)
    local l = Instance.new("TextLabel")
    l.BackgroundTransparency = 1
    l.Text = text
    l.TextColor3 = color or Color3.fromRGB(248, 250, 252)
    l.TextSize = size or 14
    l.Font = font or Enum.Font.Gotham
    l.TextXAlignment = Enum.TextXAlignment.Left
    l.Parent = parent
    return l
end

local function button(parent, text, size)
    local b = Instance.new("TextButton")
    b.AutoButtonColor = false
    b.Text = text
    b.TextColor3 = Color3.fromRGB(248, 250, 252)
    b.TextSize = 13
    b.Font = Enum.Font.GothamSemibold
    b.BackgroundColor3 = Color3.fromRGB(21, 26, 40)
    b.Size = size or UDim2.fromOffset(140, 38)
    b.Parent = parent
    corner(b, 10)
    stroke(b, theme, 0.72)

    local scale = Instance.new("UIScale")
    scale.Parent = b

    addConnection(b.MouseEnter:Connect(function()
        tween(scale, TweenInfo.new(0.12), {Scale = 1.03})
        tween(b, TweenInfo.new(0.12), {BackgroundColor3 = Color3.fromRGB(30, 38, 58)})
    end))

    addConnection(b.MouseLeave:Connect(function()
        tween(scale, TweenInfo.new(0.12), {Scale = 1})
        tween(b, TweenInfo.new(0.12), {BackgroundColor3 = Color3.fromRGB(21, 26, 40)})
    end))

    return b
end

local function toast(text, success)
    local holder = gui:FindFirstChild("ToastHolder")
    if not holder then
        holder = Instance.new("Frame")
        holder.Name = "ToastHolder"
        holder.AnchorPoint = Vector2.new(0.5, 0)
        holder.Position = UDim2.fromScale(0.5, 0.04)
        holder.Size = UDim2.fromOffset(360, 60)
        holder.BackgroundTransparency = 1
        holder.Parent = gui
    end

    local card = Instance.new("Frame")
    card.Size = UDim2.new(1, 0, 1, 0)
    card.BackgroundColor3 = Color3.fromRGB(11, 14, 23)
    card.BackgroundTransparency = 0.04
    card.Parent = holder
    corner(card, 12)
    stroke(card, success and Color3.fromRGB(16, 185, 129) or theme, 0.35)

    local textLabel = label(card, text, 13, Color3.fromRGB(248, 250, 252))
    textLabel.Position = UDim2.fromOffset(16, 0)
    textLabel.Size = UDim2.new(1, -32, 1, 0)
    textLabel.TextWrapped = true

    card.Position = UDim2.fromOffset(0, -15)
    card.BackgroundTransparency = 1
    textLabel.TextTransparency = 1

    tween(card, TweenInfo.new(0.2), {Position = UDim2.fromOffset(0, 0), BackgroundTransparency = 0.04})
    tween(textLabel, TweenInfo.new(0.2), {TextTransparency = 0})

    task.delay(2.8, function()
        tween(card, TweenInfo.new(0.2), {Position = UDim2.fromOffset(0, -15), BackgroundTransparency = 1})
        tween(textLabel, TweenInfo.new(0.2), {TextTransparency = 1})
        task.wait(0.25)
        card:Destroy()
    end)
end

local function sanitizeKey(raw)
    return string.upper((raw or ""):gsub("[%s\r\n'\"]", ""))
end

local function keyLooksValid(raw)
    local key = sanitizeKey(raw)
    return key:match("^ARIO%-[A-F0-9]+%-[A-F0-9]+%-[A-F0-9]+$") ~= nil
end

local function createInput(parent, placeholder)
    local box = Instance.new("TextBox")
    box.ClearTextOnFocus = false
    box.PlaceholderText = placeholder
    box.PlaceholderColor3 = Color3.fromRGB(100, 116, 139)
    box.TextColor3 = Color3.fromRGB(248, 250, 252)
    box.TextSize = 13
    box.Font = Enum.Font.Gotham
    box.BackgroundColor3 = Color3.fromRGB(11, 14, 23)
    box.Size = UDim2.new(1, 0, 0, 46)
    box.Text = ""
    box.Parent = parent
    corner(box, 10)
    stroke(box, theme, 0.72)
    return box
end

local function makeDraggable(frame, handle)
    local dragging = false
    local dragStart
    local startPosition

    addConnection(handle.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1
            or input.UserInputType == Enum.UserInputType.Touch then
            dragging = true
            dragStart = input.Position
            startPosition = frame.Position
        end
    end))

    addConnection(UserInputService.InputChanged:Connect(function(input)
        if not dragging then return end
        if input.UserInputType ~= Enum.UserInputType.MouseMovement
            and input.UserInputType ~= Enum.UserInputType.Touch then
            return
        end

        local delta = input.Position - dragStart
        frame.Position = UDim2.new(
            startPosition.X.Scale,
            startPosition.X.Offset + delta.X,
            startPosition.Y.Scale,
            startPosition.Y.Offset + delta.Y
        )
    end))

    addConnection(UserInputService.InputEnded:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1
            or input.UserInputType == Enum.UserInputType.Touch then
            dragging = false
        end
    end))
end

local verifyGui = Instance.new("Frame")
verifyGui.Name = "LicenseModal"
verifyGui.AnchorPoint = Vector2.new(0.5, 0.5)
verifyGui.Position = UDim2.fromScale(0.5, 0.5)
verifyGui.Size = UDim2.new(0.9, 0, 0, 290)
verifyGui.BackgroundColor3 = Color3.fromRGB(11, 14, 23)
verifyGui.BackgroundTransparency = 0.04
verifyGui.Parent = gui
corner(verifyGui, 14)
stroke(verifyGui, theme, 0.48)
gradient(verifyGui, Color3.fromRGB(21, 26, 40), Color3.fromRGB(11, 14, 23), 90)

local verifyConstraint = Instance.new("UISizeConstraint")
verifyConstraint.MaxSize = Vector2.new(430, 290)
verifyConstraint.MinSize = Vector2.new(300, 250)
verifyConstraint.Parent = verifyGui

local verifyTitle = label(verifyGui, "ARIO SECURITY", 11, theme, Enum.Font.GothamBold)
verifyTitle.Position = UDim2.fromOffset(22, 18)
verifyTitle.Size = UDim2.new(1, -44, 0, 18)

local verifyHeader = label(verifyGui, "License Verification", 23, Color3.fromRGB(248, 250, 252), Enum.Font.GothamBold)
verifyHeader.Position = UDim2.fromOffset(22, 42)
verifyHeader.Size = UDim2.new(1, -44, 0, 32)

local verifySub = label(verifyGui, "Enter your active license key to unlock the developer tools.", 12, Color3.fromRGB(148, 163, 184))
verifySub.Position = UDim2.fromOffset(22, 78)
verifySub.Size = UDim2.new(1, -44, 0, 36)
verifySub.TextWrapped = true

local keyBox = createInput(verifyGui, "ARIO-XXXXXXXX-XXXXXXXX-XXXXXXXX")
keyBox.Position = UDim2.fromOffset(22, 119)
keyBox.Size = UDim2.new(1, -44, 0, 44)

local verifyStatus = label(verifyGui, "Waiting for license...", 11, Color3.fromRGB(148, 163, 184))
verifyStatus.Position = UDim2.fromOffset(22, 169)
verifyStatus.Size = UDim2.new(1, -44, 0, 18)

local getKeyButton = button(verifyGui, "GET KEY", UDim2.new(0.42, -5, 0, 42))
getKeyButton.Position = UDim2.new(0, 22, 1, -64)

local submitButton = button(verifyGui, "SUBMIT KEY", UDim2.new(0.58, -27, 0, 42))
submitButton.Position = UDim2.new(0.42, 5, 1, -64)
gradient(submitButton, theme, Color3.fromRGB(139, 92, 246), 0)

local function copyText(text)
    local copied = false

    local candidates = {
        function() return setclipboard(text) end,
        function() return toclipboard(text) end,
    }

    for _, fn in candidates do
        local ok = pcall(fn)
        if ok then
            copied = true
            break
        end
    end

    return copied
end

getKeyButton.Activated:Connect(function()
    if copyText(GET_KEY_URL) then
        toast("Get Key link copied.", true)
    else
        toast("Open: " .. GET_KEY_URL, false)
    end
end)

local mainGui
local rebuildPlayersUI

local function openMain()
    if mainGui then return end

    tween(verifyGui, TweenInfo.new(0.3, Enum.EasingStyle.Quint), {
        Size = UDim2.new(0.9, 0, 0, 250),
        BackgroundTransparency = 1,
    })

    for _, child in verifyGui:GetDescendants() do
        if child:IsA("TextLabel") or child:IsA("TextButton") or child:IsA("TextBox") then
            tween(child, TweenInfo.new(0.18), {TextTransparency = 1})
        end
    end

    task.wait(0.3)
    verifyGui:Destroy()

    -- ARIO COMMAND CENTER
    mainGui = Instance.new("Frame")
    mainGui.Name = "AdminPanel"
    mainGui.AnchorPoint = Vector2.new(0.5, 0.5)
    mainGui.Position = UDim2.fromScale(0.5, 0.54)
    mainGui.Size = UDim2.new(0.94, 0, 0.78, 0)
    mainGui.BackgroundColor3 = Color3.fromRGB(7, 10, 18)
    mainGui.BackgroundTransparency = 0.02
    mainGui.Parent = gui
    corner(mainGui, 20)
    stroke(mainGui, theme, 0.55)
    gradient(mainGui, Color3.fromRGB(15, 22, 38), Color3.fromRGB(5, 8, 15), 135)

    local sizeConstraint = Instance.new("UISizeConstraint")
    sizeConstraint.MaxSize = Vector2.new(920, 600)
    sizeConstraint.MinSize = Vector2.new(330, 360)
    sizeConstraint.Parent = mainGui

    local shadow = Instance.new("Frame")
    shadow.Name = "Glow"
    shadow.AnchorPoint = Vector2.new(0.5, 0.5)
    shadow.Position = UDim2.fromScale(0.5, 0.5)
    shadow.Size = UDim2.new(1, 18, 1, 18)
    shadow.BackgroundColor3 = theme
    shadow.BackgroundTransparency = 0.94
    shadow.ZIndex = 0
    shadow.Parent = mainGui
    corner(shadow, 24)

    local top = Instance.new("Frame")
    top.BackgroundTransparency = 1
    top.Size = UDim2.new(1, -34, 0, 68)
    top.Position = UDim2.fromOffset(17, 10)
    top.ZIndex = 5
    top.Parent = mainGui

    local brandDot = Instance.new("Frame")
    brandDot.Size = UDim2.fromOffset(42, 42)
    brandDot.Position = UDim2.fromOffset(2, 11)
    brandDot.BackgroundColor3 = theme
    brandDot.Parent = top
    corner(brandDot, 13)
    gradient(brandDot, theme, Color3.fromRGB(255,255,255), 135)

    local brand = label(brandDot, "A", 22, Color3.fromRGB(255,255,255), Enum.Font.GothamBlack)
    brand.TextXAlignment = Enum.TextXAlignment.Center
    brand.Size = UDim2.fromScale(1,1)

    local title = label(top, "ARIO COMMAND", 18, Color3.fromRGB(248,250,252), Enum.Font.GothamBlack)
    title.Position = UDim2.fromOffset(56, 9)
    title.Size = UDim2.new(1, -250, 0, 24)

    local subtitle = label(top, "ADMIN CONTROL CENTER  •  VERIFIED", 9, theme, Enum.Font.GothamBold)
    subtitle.Position = UDim2.fromOffset(57, 35)
    subtitle.Size = UDim2.new(1, -250, 0, 16)

    local online = Instance.new("Frame")
    online.Size = UDim2.fromOffset(88, 30)
    online.Position = UDim2.new(1, -175, 0, 17)
    online.BackgroundColor3 = Color3.fromRGB(10, 35, 31)
    online.Parent = top
    corner(online, 10)
    local onlineDot = Instance.new("Frame")
    onlineDot.Size = UDim2.fromOffset(7,7)
    onlineDot.Position = UDim2.fromOffset(11,12)
    onlineDot.BackgroundColor3 = Color3.fromRGB(52,211,153)
    onlineDot.Parent = online
    corner(onlineDot, 5)
    local onlineText = label(online, "ONLINE", 9, Color3.fromRGB(167,243,208), Enum.Font.GothamBold)
    onlineText.Position = UDim2.fromOffset(25,0)
    onlineText.Size = UDim2.new(1,-25,1,0)

    local avatar = Instance.new("ImageLabel")
    avatar.BackgroundColor3 = Color3.fromRGB(20,28,45)
    avatar.Size = UDim2.fromOffset(38,38)
    avatar.Position = UDim2.new(1, -82, 0, 13)
    avatar.Parent = top
    corner(avatar, 12)
    safe(function()
        local image = Players:GetUserThumbnailAsync(player.UserId, Enum.ThumbnailType.HeadShot, Enum.ThumbnailSize.Size100x100)
        avatar.Image = image
    end)

    local minimize = button(top, "—", UDim2.fromOffset(32,32))
    minimize.Position = UDim2.new(1, -40, 0, 16)
    minimize.TextSize = 15

    makeDraggable(mainGui, top)

    local line = Instance.new("Frame")
    line.Size = UDim2.new(1, -34, 0, 1)
    line.Position = UDim2.fromOffset(17, 77)
    line.BackgroundColor3 = Color3.fromRGB(35,48,72)
    line.BackgroundTransparency = 0.35
    line.Parent = mainGui

    local sidebar = Instance.new("Frame")
    sidebar.BackgroundColor3 = Color3.fromRGB(9, 14, 24)
    sidebar.BackgroundTransparency = 0.05
    sidebar.Size = UDim2.new(0, 166, 1, -101)
    sidebar.Position = UDim2.fromOffset(17, 88)
    sidebar.Parent = mainGui
    corner(sidebar, 16)
    stroke(sidebar, theme, 0.82)

    local content = Instance.new("Frame")
    content.BackgroundTransparency = 1
    content.Size = UDim2.new(1, -200, 1, -101)
    content.Position = UDim2.fromOffset(191, 88)
    content.Parent = mainGui

    local pages = {}
    local tabs = {}
    local currentPage

    local function createPage(name)
        local page = Instance.new("ScrollingFrame")
        page.Name = name
        page.BackgroundTransparency = 1
        page.BorderSizePixel = 0
        page.Size = UDim2.fromScale(1,1)
        page.CanvasSize = UDim2.fromOffset(0,0)
        page.AutomaticCanvasSize = Enum.AutomaticSize.Y
        page.ScrollBarThickness = 2
        page.ScrollBarImageColor3 = theme
        page.Visible = false
        page.Parent = content

        local layout = Instance.new("UIListLayout")
        layout.Padding = UDim.new(0, 10)
        layout.SortOrder = Enum.SortOrder.LayoutOrder
        layout.Parent = page

        local padding = Instance.new("UIPadding")
        padding.PaddingTop = UDim.new(0, 2)
        padding.PaddingRight = UDim.new(0, 6)
        padding.PaddingBottom = UDim.new(0, 10)
        padding.Parent = page

        pages[name] = page
        return page
    end

    local function tab(name, text, page, icon)
        local holder = Instance.new("Frame")
        holder.BackgroundTransparency = 1
        holder.Size = UDim2.new(1, -16, 0, 46)
        holder.Parent = sidebar

        local b = button(holder, text, UDim2.new(1,0,1,0))
        b.Position = UDim2.fromOffset(0,0)
        b.TextXAlignment = Enum.TextXAlignment.Left
        b.TextSize = 11
        b.Text = "   " .. icon .. "   " .. text

        local indicator = Instance.new("Frame")
        indicator.Size = UDim2.fromOffset(3, 22)
        indicator.Position = UDim2.new(1, -3, 0.5, -11)
        indicator.BackgroundColor3 = theme
        indicator.BackgroundTransparency = 1
        indicator.Parent = b
        corner(indicator, 3)

        tabs[#tabs+1] = {button=b, page=page, indicator=indicator}

        b.Activated:Connect(function()
            for _, t in tabs do
                t.button.BackgroundColor3 = Color3.fromRGB(14,20,32)
                t.button.TextColor3 = Color3.fromRGB(135,148,170)
                t.indicator.BackgroundTransparency = 1
            end
            b.BackgroundColor3 = Color3.fromRGB(24,35,56)
            b.TextColor3 = Color3.fromRGB(248,250,252)
            indicator.BackgroundTransparency = 0

            for _, p in pages do p.Visible = false end
            page.Visible = true
            currentPage = page
        end)

        return b
    end

    local playerPage = createPage("Player")
    local teleportPage = createPage("Teleport")
    local visualsPage = createPage("Visuals")
    local serverPage = createPage("Server")
    local themePage = createPage("Themes")

    local sideLayout = Instance.new("UIListLayout")
    sideLayout.Padding = UDim.new(0, 6)
    sideLayout.Parent = sidebar
    sideLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
    sideLayout.VerticalAlignment = Enum.VerticalAlignment.Top

    local sideTop = Instance.new("Frame")
    sideTop.Size = UDim2.new(1,-16,0,46)
    sideTop.BackgroundTransparency = 1
    sideTop.Parent = sidebar

    local navTitle = label(sideTop, "NAVIGATION", 9, Color3.fromRGB(90,106,132), Enum.Font.GothamBold)
    navTitle.Position = UDim2.fromOffset(4,15)
    navTitle.Size = UDim2.new(1,-8,1,0)

    tab("Player", "PLAYER", playerPage, "●")
    tab("Teleport", "TELEPORT", teleportPage, "↗")
    tab("Visuals", "VISUALS", visualsPage, "◈")
    tab("Server", "SERVER", serverPage, "⌁")
    tab("Themes", "THEMES", themePage, "✦")

    local sideFooter = Instance.new("Frame")
    sideFooter.BackgroundColor3 = Color3.fromRGB(13,19,31)
    sideFooter.Size = UDim2.new(1,-16,0,62)
    sideFooter.Parent = sidebar
    corner(sideFooter, 12)
    stroke(sideFooter, theme, 0.88)

    local foot1 = label(sideFooter, "ACCESS", 8, Color3.fromRGB(90,106,132), Enum.Font.GothamBold)
    foot1.Position = UDim2.fromOffset(10,8)
    foot1.Size = UDim2.new(1,-20,0,14)
    local foot2 = label(sideFooter, "LICENSE VERIFIED", 10, Color3.fromRGB(167,243,208), Enum.Font.GothamBold)
    foot2.Position = UDim2.fromOffset(10,25)
    foot2.Size = UDim2.new(1,-20,0,16)

    local function section(parent, titleText, subtitleText)
        local card = Instance.new("Frame")
        card.BackgroundColor3 = Color3.fromRGB(12,18,30)
        card.BackgroundTransparency = 0.02
        card.Size = UDim2.new(1,-6,0,82)
        card.Parent = parent
        corner(card, 15)
        stroke(card, theme, 0.88)

        local accent = Instance.new("Frame")
        accent.Size = UDim2.fromOffset(3,40)
        accent.Position = UDim2.fromOffset(13,18)
        accent.BackgroundColor3 = theme
        accent.Parent = card
        corner(accent, 3)

        local t = label(card, titleText, 14, Color3.fromRGB(248,250,252), Enum.Font.GothamBold)
        t.Position = UDim2.fromOffset(27,12)
        t.Size = UDim2.new(1,-42,0,21)

        local s = label(card, subtitleText or "", 10, Color3.fromRGB(123,139,164))
        s.Position = UDim2.fromOffset(27,36)
        s.Size = UDim2.new(1,-42,0,34)
        s.TextWrapped = true

        return card
    end

    local function toggleRow(parent, text, default, callback)
        local row = Instance.new("Frame")
        row.BackgroundColor3 = Color3.fromRGB(12,18,30)
        row.Size = UDim2.new(1,-6,0,54)
        row.Parent = parent
        corner(row, 13)
        stroke(row, Color3.fromRGB(39,53,78), 0.55)

        local l = label(row, text, 11, Color3.fromRGB(226,232,240), Enum.Font.GothamSemibold)
        l.Position = UDim2.fromOffset(15,0)
        l.Size = UDim2.new(1,-92,1,0)

        local b = button(row, default and "ON" or "OFF", UDim2.fromOffset(62,32))
        b.Position = UDim2.new(1,-76,0.5,-16)
        b.BackgroundColor3 = default and Color3.fromRGB(21,76,61) or Color3.fromRGB(20,29,45)
        b.TextSize = 9

        local state = default
        b.Activated:Connect(function()
            state = not state
            b.Text = state and "ON" or "OFF"
            b.BackgroundColor3 = state and Color3.fromRGB(21,76,61) or Color3.fromRGB(20,29,45)
            callback(state)
        end)
        return row
    end

    local function numberRow(parent, text, value, minValue, maxValue, callback)
        local row = Instance.new("Frame")
        row.BackgroundColor3 = Color3.fromRGB(12,18,30)
        row.Size = UDim2.new(1,-6,0,58)
        row.Parent = parent
        corner(row, 13)
        stroke(row, Color3.fromRGB(39,53,78), 0.55)

        local l = label(row, text, 11, Color3.fromRGB(226,232,240), Enum.Font.GothamSemibold)
        l.Position = UDim2.fromOffset(15,0)
        l.Size = UDim2.new(0.55,0,1,0)

        local box = Instance.new("TextBox")
        box.Text = tostring(value)
        box.ClearTextOnFocus = false
        box.TextColor3 = Color3.fromRGB(248,250,252)
        box.TextSize = 11
        box.Font = Enum.Font.GothamBold
        box.BackgroundColor3 = Color3.fromRGB(7,11,19)
        box.Size = UDim2.fromOffset(78,34)
        box.Position = UDim2.new(1,-94,0.5,-17)
        box.Parent = row
        corner(box, 10)
        stroke(box, theme, 0.72)

        local function commit()
            local n = tonumber(box.Text)
            if not n or not math.isfinite(n) then box.Text=tostring(value); return end
            value = math.clamp(n,minValue,maxValue)
            box.Text = tostring(math.floor(value))
            callback(value)
        end
        box.FocusLost:Connect(commit)
        return row
    end

    numberRow(playerPage, "WalkSpeed", 16, 0, 100, function(value)
        command:FireServer("SetWalkSpeed", {value=value})
    end)
    numberRow(playerPage, "JumpPower", 50, 0, 150, function(value)
        command:FireServer("SetJumpPower", {value=value})
    end)
    toggleRow(playerPage, "Infinite Jump", false, function(enabled)
        command:FireServer("SetInfiniteJump", {enabled=enabled})
    end)
    toggleRow(playerPage, "Fly Mode", false, function(enabled)
        command:FireServer("SetFly", {enabled=enabled, speed=50})
    end)
    toggleRow(playerPage, "Noclip", false, function(enabled)
        command:FireServer("SetNoclip", {enabled=enabled})
    end)
    section(playerPage, "PLAYER CONTROL", "Movement permissions are validated by the server. Your verified license remains active for this session.")

    section(teleportPage, "PLAYER TELEPORT", "Select an active player and use the server-authorized teleport command.")
    local playerDropdown = button(teleportPage, "SELECT PLAYER", UDim2.new(1,-6,0,46))
    local teleportButton = button(teleportPage, "TELEPORT TO PLAYER", UDim2.new(1,-6,0,46))
    local selectedPlayer

    local dropdownFrame = Instance.new("Frame")
    dropdownFrame.Visible = false
    dropdownFrame.BackgroundColor3 = Color3.fromRGB(8,13,22)
    dropdownFrame.Size = UDim2.new(1,-6,0,150)
    dropdownFrame.Parent = teleportPage
    corner(dropdownFrame, 13)
    stroke(dropdownFrame, theme, 0.72)

    local dropLayout = Instance.new("UIListLayout")
    dropLayout.Padding = UDim.new(0,4)
    dropLayout.Parent = dropdownFrame

    rebuildPlayersUI = function(list)
        for _, child in dropdownFrame:GetChildren() do
            if child:IsA("TextButton") then child:Destroy() end
        end
        for _, info in list do
            local b = button(dropdownFrame, info.displayName .. "  @" .. info.name, UDim2.new(1,-8,0,32))
            b.Position = UDim2.fromOffset(4,0)
            b.Activated:Connect(function()
                selectedPlayer=info.name
                playerDropdown.Text=info.displayName .. "  @" .. info.name
                dropdownFrame.Visible=false
            end)
        end
    end

    playerDropdown.Activated:Connect(function()
        dropdownFrame.Visible=not dropdownFrame.Visible
        command:FireServer("RequestPlayers")
    end)
    teleportButton.Activated:Connect(function()
        if selectedPlayer then
            command:FireServer("TeleportToPlayer",{player=selectedPlayer})
        else
            toast("Select a player first.",false)
        end
    end)
    toggleRow(teleportPage,"Click-to-Teleport",false,function(enabled)
        toast(enabled and "Click-to-Teleport enabled for your experience." or "Click-to-Teleport disabled.",true)
    end)

    section(visualsPage,"VISUAL TOOLS","These are presentation hooks for visual/admin systems in your own Roblox experience.")
    toggleRow(visualsPage,"Player ESP",false,function(enabled)
        toast(enabled and "ESP requested." or "ESP disabled.",true)
    end)
    toggleRow(visualsPage,"Name + Health Tags",false,function(enabled)
        toast(enabled and "Name/health display enabled." or "Name/health display disabled.",true)
    end)
    toggleRow(visualsPage,"Tracers",false,function(enabled)
        toast(enabled and "Tracers requested." or "Tracers disabled.",true)
    end)

    section(serverPage,"SERVER OVERVIEW","Live connection information and server utilities.")
    local stats = Instance.new("Frame")
    stats.BackgroundTransparency=1
    stats.Size=UDim2.new(1,-6,0,78)
    stats.Parent=serverPage

    local statsLayout=Instance.new("UIGridLayout")
    statsLayout.CellPadding=UDim2.fromOffset(8,0)
    statsLayout.CellSize=UDim2.new(0.5,-4,1,0)
    statsLayout.Parent=stats

    local function statCard(titleText,valueText)
        local c=Instance.new("Frame")
        c.BackgroundColor3=Color3.fromRGB(12,18,30)
        c.Parent=stats
        corner(c,13)
        stroke(c,Color3.fromRGB(39,53,78),0.55)
        local t=label(c,titleText,8,Color3.fromRGB(90,106,132),Enum.Font.GothamBold)
        t.Position=UDim2.fromOffset(12,10)
        t.Size=UDim2.new(1,-24,0,14)
        local v=label(c,valueText,15,Color3.fromRGB(248,250,252),Enum.Font.GothamBold)
        v.Position=UDim2.fromOffset(12,30)
        v.Size=UDim2.new(1,-24,0,26)
        return v
    end

    local playerCount=statCard("PLAYERS",tostring(#Players:GetPlayers()))
    local jobShort=string.sub(game.JobId,1,8)
    local jobValue=statCard("JOB ID",jobShort)

    local rejoin=button(serverPage,"REJOIN SERVER",UDim2.new(1,-6,0,44))
    rejoin.Activated:Connect(function() command:FireServer("Rejoin") end)

    local copyJob=button(serverPage,"COPY JOB ID",UDim2.new(1,-6,0,44))
    copyJob.Activated:Connect(function()
        if copyText(game.JobId) then toast("JobId copied.",true) else toast("JobId: "..game.JobId,false) end
    end)

    local ping=label(serverPage,"Ping: --",10,Color3.fromRGB(123,139,164))
    ping.Size=UDim2.new(1,-6,0,24)
    local uptime=label(serverPage,"Uptime: 0s",10,Color3.fromRGB(123,139,164))
    uptime.Size=UDim2.new(1,-6,0,24)
    local startedAt=os.clock()

    addConnection(RunService.Heartbeat:Connect(function()
        uptime.Text="Uptime: "..tostring(math.floor(os.clock()-startedAt)).."s"
        local ok,value=safe(function() return player:GetNetworkPing()*1000 end)
        if ok and typeof(value)=="number" then ping.Text=string.format("Ping: %d ms",math.floor(value)) end
        playerCount.Text=tostring(#Players:GetPlayers())
    end))

    local hop=button(serverPage,"SERVER HOP",UDim2.new(1,-6,0,44))
    hop.Activated:Connect(function()
        toast("Server hop requires a server-list/matchmaking backend.",false)
    end)

    section(themePage,"ACCENT SYSTEM","Switch the Command Center accent without changing protected license/API configuration.")
    local themeNames={
        {"Cyan","CYAN NEON"},
        {"Blue","ROYAL BLUE"},
        {"Crimson","CRIMSON"},
        {"Emerald","EMERALD"},
        {"Purple","AMETHYST"},
    }
    for _,item in themeNames do
        local b=button(themePage,item[2],UDim2.new(1,-6,0,42))
        b.Activated:Connect(function()
            theme=themes[item[1]]
            command:FireServer("SetTheme",{theme=item[1]})
            toast("Accent changed to "..item[2]..".",true)
        end)
    end
    toggleRow(themePage,"Interface Sounds",true,function(enabled) soundEnabled=enabled end)
    section(themePage,"PROTECTED CONFIGURATION","API validation and Get Key portal are compiled into the suite and cannot be edited from the panel.")

    local closeConfirm=false
    minimize.Activated:Connect(function()
        minimized=not minimized
        if minimized then
            sidebar.Visible=false
            content.Visible=false
            line.Visible=false
            mainGui.Size=UDim2.fromOffset(310,70)
        else
            sidebar.Visible=true
            content.Visible=true
            line.Visible=true
            mainGui.Size=UDim2.new(0.94,0,0.78,0)
        end
    end)

    local first=tabs[1]
    if first then
        first.button.BackgroundColor3=Color3.fromRGB(24,35,56)
        first.button.TextColor3=Color3.fromRGB(248,250,252)
        first.indicator.BackgroundTransparency=0
    end
    playerPage.Visible=true
    currentPage=playerPage

    mainGui.Position=UDim2.fromScale(0.5,0.62)
    mainGui.BackgroundTransparency=1
    tween(mainGui,TweenInfo.new(0.4,Enum.EasingStyle.Quint),{
        Position=UDim2.fromScale(0.5,0.5),
        BackgroundTransparency=0.02,
    })

    command:FireServer("RequestPlayers")
end

submitButton.Activated:Connect(function()
    local key = sanitizeKey(keyBox.Text)

    if not keyLooksValid(key) then
        verifyStatus.Text = "Invalid key format."
        verifyStatus.TextColor3 = Color3.fromRGB(239,68,68)
        return
    end

    submitButton.Active = false
    submitButton.Text = "CHECKING..."
    verifyStatus.Text = "Checking license..."
    verifyStatus.TextColor3 = Color3.fromRGB(148,163,184)

    local ok, accepted, message = pcall(function()
        local result, reason = verify:InvokeServer(key)
        return result, reason
    end)

    if ok and accepted then
        SAVED_KEY = key
        verifyStatus.Text = message or "Key accepted! Welcome."
        verifyStatus.TextColor3 = Color3.fromRGB(16,185,129)
        task.wait(0.4)
        openMain()
    else
        verifyStatus.Text = (ok and message) or "License verification failed."
        verifyStatus.TextColor3 = Color3.fromRGB(239,68,68)
        submitButton.Active = true
        submitButton.Text = "SUBMIT KEY"
    end
end)

status.OnClientEvent:Connect(function(kind, message)
    if kind == "verified" then
        openMain()
        toast(tostring(message or "Saved license accepted."), true)
    elseif kind == "success" then
        toast(tostring(message), true)
    elseif kind == "error" then
        toast(tostring(message), false)
    elseif kind == "players" and type(message) == "table" then
        if rebuildPlayersUI then
            rebuildPlayersUI(message)
        end
    end
end)

local isAdmin = player:GetAttribute("ArioAdmin")
if isAdmin ~= true then
    verifyGui.Visible = false
    toast("ARIO ADMIN is restricted to authorized users.", false)
    task.delay(2, function()
        if gui then gui:Destroy() end
    end)
else
    local cached = player:GetAttribute("ArioLicenseVerified")
    if cached == true then
        openMain()
    end
end

-- Client-side movement helpers are only activated by server attributes.
-- They do not grant permission; the server decides whether the attributes exist.
addConnection(UserInputService.JumpRequest:Connect(function()
    if player:GetAttribute("ArioInfiniteJump") ~= true then return end
    local character = player.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    if humanoid then
        humanoid:ChangeState(Enum.HumanoidStateType.Jumping)
    end
end))

addConnection(RunService.Stepped:Connect(function()
    local character = player.Character
    if not character then return end

    if player:GetAttribute("ArioNoclip") == true then
        for _, object in character:GetDescendants() do
            if object:IsA("BasePart") then
                object.CanCollide = false
            end
        end
    end
end))

-- Keep server-provided movement values applied after respawn.
addConnection(player.CharacterAdded:Connect(function(character)
    task.wait(0.2)
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then return end

    local speed = player:GetAttribute("ArioWalkSpeed")
    local jump = player:GetAttribute("ArioJumpPower")

    if typeof(speed) == "number" then
        humanoid.WalkSpeed = speed
    end

    if typeof(jump) == "number" then
        humanoid.UseJumpPower = true
        humanoid.JumpPower = jump
    end
end))
