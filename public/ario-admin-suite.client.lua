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

    tween(verifyGui, TweenInfo.new(0.25, Enum.EasingStyle.Quint), {
        Size = UDim2.new(0.9, 0, 0, 250),
        BackgroundTransparency = 1,
    })

    for _, child in verifyGui:GetDescendants() do
        if child:IsA("TextLabel") or child:IsA("TextButton") or child:IsA("TextBox") then
            tween(child, TweenInfo.new(0.18), {TextTransparency = 1})
        end
    end

    task.wait(0.28)
    verifyGui:Destroy()

    mainGui = Instance.new("Frame")
    mainGui.Name = "AdminPanel"
    mainGui.AnchorPoint = Vector2.new(0.5, 0.5)
    mainGui.Position = UDim2.fromScale(0.5, 0.56)
    mainGui.Size = UDim2.new(0.94, 0, 0.72, 0)
    mainGui.BackgroundColor3 = Color3.fromRGB(11, 14, 23)
    mainGui.BackgroundTransparency = 0.04
    mainGui.Parent = gui
    corner(mainGui, 14)
    stroke(mainGui, theme, 0.45)
    gradient(mainGui, Color3.fromRGB(21, 26, 40), Color3.fromRGB(11, 14, 23), 90)

    local sizeConstraint = Instance.new("UISizeConstraint")
    sizeConstraint.MaxSize = Vector2.new(700, 470)
    sizeConstraint.MinSize = Vector2.new(320, 330)
    sizeConstraint.Parent = mainGui

    local top = Instance.new("Frame")
    top.BackgroundTransparency = 1
    top.Size = UDim2.new(1, -20, 0, 58)
    top.Position = UDim2.fromOffset(10, 8)
    top.Parent = mainGui

    local title = label(top, "ARIO ADMIN SUITE", 17, Color3.fromRGB(248,250,252), Enum.Font.GothamBold)
    title.Position = UDim2.fromOffset(10, 4)
    title.Size = UDim2.fromOffset(210, 24)

    local version = label(top, "v2.4 PRO", 10, theme, Enum.Font.GothamBold)
    version.Position = UDim2.fromOffset(11, 29)
    version.Size = UDim2.fromOffset(100, 18)

    local avatar = Instance.new("ImageLabel")
    avatar.BackgroundColor3 = Color3.fromRGB(21,26,40)
    avatar.Size = UDim2.fromOffset(38,38)
    avatar.Position = UDim2.new(1, -126, 0, 5)
    avatar.Parent = top
    corner(avatar, 12)

    safe(function()
        local image = Players:GetUserThumbnailAsync(
            player.UserId,
            Enum.ThumbnailType.HeadShot,
            Enum.ThumbnailSize.Size100x100
        )
        avatar.Image = image
    end)

    local minimize = button(top, "-", UDim2.fromOffset(34, 34))
    minimize.Position = UDim2.new(1, -82, 0, 7)

    local close = button(top, "×", UDim2.fromOffset(34, 34))
    close.Position = UDim2.new(1, -42, 0, 7)

    makeDraggable(mainGui, top)

    local sidebar = Instance.new("Frame")
    sidebar.BackgroundColor3 = Color3.fromRGB(8, 11, 18)
    sidebar.BackgroundTransparency = 0.12
    sidebar.Size = UDim2.new(0, 138, 1, -76)
    sidebar.Position = UDim2.fromOffset(10, 68)
    sidebar.Parent = mainGui
    corner(sidebar, 12)
    stroke(sidebar, theme, 0.8)

    local content = Instance.new("Frame")
    content.BackgroundTransparency = 1
    content.Size = UDim2.new(1, -168, 1, -76)
    content.Position = UDim2.fromOffset(158, 68)
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
        page.ScrollBarThickness = 3
        page.Visible = false
        page.Parent = content

        local layout = Instance.new("UIListLayout")
        layout.Padding = UDim.new(0, 10)
        layout.SortOrder = Enum.SortOrder.LayoutOrder
        layout.Parent = page

        local padding = Instance.new("UIPadding")
        padding.PaddingTop = UDim.new(0, 4)
        padding.PaddingRight = UDim.new(0, 4)
        padding.PaddingBottom = UDim.new(0, 8)
        padding.Parent = page

        pages[name] = page
        return page
    end

    local function tab(name, text, page)
        local b = button(sidebar, text, UDim2.new(1, -16, 0, 38))
        b.Position = UDim2.fromOffset(8, 0)
        b.TextXAlignment = Enum.TextXAlignment.Left
        b.TextSize = 12
        table.insert(tabs, b)

        b.Activated:Connect(function()
            for _, t in tabs do
                t.BackgroundColor3 = Color3.fromRGB(21,26,40)
            end
            b.BackgroundColor3 = Color3.fromRGB(30,38,58)

            for _, p in pages do
                p.Visible = false
            end

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
    sideLayout.Padding = UDim.new(0, 7)
    sideLayout.Parent = sidebar
    sideLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
    sideLayout.VerticalAlignment = Enum.VerticalAlignment.Top

    local spacer = Instance.new("Frame")
    spacer.Size = UDim2.fromOffset(1, 5)
    spacer.BackgroundTransparency = 1
    spacer.Parent = sidebar

    tab("Player", "  PLAYER", playerPage)
    tab("Teleport", "  TELEPORT", teleportPage)
    tab("Visuals", "  VISUALS", visualsPage)
    tab("Server", "  SERVER", serverPage)
    tab("Themes", "  THEMES", themePage)

    local function section(parent, titleText, subtitle)
        local card = Instance.new("Frame")
        card.BackgroundColor3 = Color3.fromRGB(21,26,40)
        card.BackgroundTransparency = 0.18
        card.Size = UDim2.new(1, -8, 0, 74)
        card.Parent = parent
        corner(card, 12)
        stroke(card, theme, 0.82)

        local t = label(card, titleText, 14, Color3.fromRGB(248,250,252), Enum.Font.GothamBold)
        t.Position = UDim2.fromOffset(14, 10)
        t.Size = UDim2.new(1, -28, 0, 20)

        local s = label(card, subtitle or "", 11, Color3.fromRGB(148,163,184))
        s.Position = UDim2.fromOffset(14, 34)
        s.Size = UDim2.new(1, -28, 0, 30)
        s.TextWrapped = true

        return card
    end

    local function toggleRow(parent, text, default, callback)
        local row = Instance.new("Frame")
        row.BackgroundColor3 = Color3.fromRGB(21,26,40)
        row.BackgroundTransparency = 0.18
        row.Size = UDim2.new(1, -8, 0, 50)
        row.Parent = parent
        corner(row, 10)

        local l = label(row, text, 12, Color3.fromRGB(248,250,252))
        l.Position = UDim2.fromOffset(14, 0)
        l.Size = UDim2.new(1, -80, 1, 0)

        local b = button(row, default and "ON" or "OFF", UDim2.fromOffset(58, 32))
        b.Position = UDim2.new(1, -68, 0.5, -16)
        b.BackgroundColor3 = default and Color3.fromRGB(30, 90, 70) or Color3.fromRGB(30,38,58)

        local state = default
        b.Activated:Connect(function()
            state = not state
            b.Text = state and "ON" or "OFF"
            b.BackgroundColor3 = state and Color3.fromRGB(30,90,70) or Color3.fromRGB(30,38,58)
            callback(state)
        end)

        return row
    end

    local function numberRow(parent, text, value, minValue, maxValue, callback)
        local row = Instance.new("Frame")
        row.BackgroundColor3 = Color3.fromRGB(21,26,40)
        row.BackgroundTransparency = 0.18
        row.Size = UDim2.new(1, -8, 0, 58)
        row.Parent = parent
        corner(row, 10)

        local l = label(row, text, 12, Color3.fromRGB(248,250,252))
        l.Position = UDim2.fromOffset(14, 0)
        l.Size = UDim2.new(0.5, 0, 1, 0)

        local box = Instance.new("TextBox")
        box.Text = tostring(value)
        box.ClearTextOnFocus = false
        box.TextColor3 = Color3.fromRGB(248,250,252)
        box.TextSize = 12
        box.Font = Enum.Font.GothamSemibold
        box.BackgroundColor3 = Color3.fromRGB(11,14,23)
        box.Size = UDim2.fromOffset(72, 34)
        box.Position = UDim2.new(1, -86, 0.5, -17)
        box.Parent = row
        corner(box, 8)
        stroke(box, theme, 0.75)

        local function commit()
            local n = tonumber(box.Text)
            if not n or not math.isfinite(n) then
                box.Text = tostring(value)
                return
            end
            value = math.clamp(n, minValue, maxValue)
            box.Text = tostring(math.floor(value))
            callback(value)
        end

        box.FocusLost:Connect(commit)

        return row
    end

    numberRow(playerPage, "WalkSpeed", 16, 0, 100, function(value)
        command:FireServer("SetWalkSpeed", {value = value})
    end)

    numberRow(playerPage, "JumpPower", 50, 0, 150, function(value)
        command:FireServer("SetJumpPower", {value = value})
    end)

    toggleRow(playerPage, "Infinite Jump", false, function(enabled)
        command:FireServer("SetInfiniteJump", {enabled = enabled})
    end)

    toggleRow(playerPage, "Fly Mode", false, function(enabled)
        command:FireServer("SetFly", {enabled = enabled, speed = 50})
    end)

    toggleRow(playerPage, "Noclip", false, function(enabled)
        command:FireServer("SetNoclip", {enabled = enabled})
    end)

    section(playerPage, "Player Controls", "All privileged movement changes are sent to the server and require admin + verified license status.")

    section(teleportPage, "Player Teleport", "Choose a player from the live server list and request a server-authorized teleport.")

    local playerDropdown = button(teleportPage, "SELECT PLAYER", UDim2.new(1, -8, 0, 42))
    local teleportButton = button(teleportPage, "TELEPORT TO PLAYER", UDim2.new(1, -8, 0, 42))
    local selectedPlayer

    local dropdownFrame = Instance.new("Frame")
    dropdownFrame.Visible = false
    dropdownFrame.BackgroundColor3 = Color3.fromRGB(11,14,23)
    dropdownFrame.Size = UDim2.new(1, -8, 0, 150)
    dropdownFrame.Parent = teleportPage
    corner(dropdownFrame, 10)
    stroke(dropdownFrame, theme, 0.7)

    local dropLayout = Instance.new("UIListLayout")
    dropLayout.Padding = UDim.new(0, 4)
    dropLayout.Parent = dropdownFrame

    rebuildPlayersUI = function(list)
        for _, child in dropdownFrame:GetChildren() do
            if child:IsA("TextButton") then child:Destroy() end
        end

        for _, info in list do
            local b = button(dropdownFrame, info.displayName .. "  @" .. info.name, UDim2.new(1,-8,0,32))
            b.Position = UDim2.fromOffset(4,0)
            b.Activated:Connect(function()
                selectedPlayer = info.name
                playerDropdown.Text = info.displayName .. "  @" .. info.name
                dropdownFrame.Visible = false
            end)
        end
    end

    playerDropdown.Activated:Connect(function()
        dropdownFrame.Visible = not dropdownFrame.Visible
        command:FireServer("RequestPlayers")
    end)

    teleportButton.Activated:Connect(function()
        if selectedPlayer then
            command:FireServer("TeleportToPlayer", {player = selectedPlayer})
        else
            toast("Select a player first.", false)
        end
    end)

    toggleRow(teleportPage, "Click-to-Teleport", false, function(enabled)
        toast(enabled and "Click-to-Teleport enabled for your experience." or "Click-to-Teleport disabled.", true)
    end)

    section(visualsPage, "Visual Tools", "These controls are UI hooks for your own game's server-authorized admin/visual systems.")

    toggleRow(visualsPage, "Player ESP", false, function(enabled)
        toast(enabled and "ESP requested." or "ESP disabled.", true)
    end)

    toggleRow(visualsPage, "Name + Health Tags", false, function(enabled)
        toast(enabled and "Name/health display enabled." or "Name/health display disabled.", true)
    end)

    toggleRow(visualsPage, "Tracers", false, function(enabled)
        toast(enabled and "Tracers requested." or "Tracers disabled.", true)
    end)

    section(serverPage, "Server Utilities", "Rejoin is server-authorized. Server-hop requires your own matchmaking/server-list service.")

    local rejoin = button(serverPage, "REJOIN SERVER", UDim2.new(1,-8,0,42))
    rejoin.Activated:Connect(function()
        command:FireServer("Rejoin")
    end)

    local copyJob = button(serverPage, "COPY JOB ID", UDim2.new(1,-8,0,42))
    copyJob.Activated:Connect(function()
        if copyText(game.JobId) then
            toast("JobId copied.", true)
        else
            toast("JobId: " .. game.JobId, false)
        end
    end)

    local info = section(serverPage, "Live Server", "JobId: " .. game.JobId .. "\nPlayers: " .. tostring(#Players:GetPlayers()))

    local ping = label(serverPage, "Ping: --", 12, Color3.fromRGB(148,163,184))
    ping.Size = UDim2.new(1,-8,0,28)

    local uptime = label(serverPage, "Uptime: 0s", 12, Color3.fromRGB(148,163,184))
    uptime.Size = UDim2.new(1,-8,0,28)

    local startedAt = os.clock()

    addConnection(RunService.Heartbeat:Connect(function()
        local elapsed = math.floor(os.clock() - startedAt)
        uptime.Text = "Uptime: " .. tostring(elapsed) .. "s"

        local ok, value = safe(function()
            return player:GetNetworkPing() * 1000
        end)
        if ok and typeof(value) == "number" then
            ping.Text = string.format("Ping: %d ms", math.floor(value))
        end
    end))

    local hop = button(serverPage, "SERVER HOP", UDim2.new(1,-8,0,42))
    hop.Activated:Connect(function()
        toast("Server hop requires a server-list/matchmaking backend.", false)
    end)

    section(themePage, "Accent Theme", "Changes the live ARIO accent without changing the fixed license/API configuration.")

    local themeNames = {
        {"Cyan", "CYAN NEON"},
        {"Blue", "ROYAL BLUE"},
        {"Crimson", "BLOOD CRIMSON"},
        {"Emerald", "EMERALD MATRIX"},
        {"Purple", "AMETHYST PURPLE"},
    }

    for _, item in themeNames do
        local b = button(themePage, item[2], UDim2.new(1,-8,0,40))
        b.Activated:Connect(function()
            theme = themes[item[1]]
            command:FireServer("SetTheme", {theme = item[1]})
            toast("Theme changed to " .. item[2] .. ".", true)
        end)
    end

    toggleRow(themePage, "Interface Sounds", true, function(enabled)
        soundEnabled = enabled
    end)

    local fixed = section(themePage, "Protected Configuration", "API endpoint and Get Key portal are compiled into the suite and are not exposed as editable settings.\nAPI: /api/public/keys/validate\nPortal: /keys")

    local closeConfirm = false

    close.Activated:Connect(function()
        if not closeConfirm then
            closeConfirm = true
            toast("Press close again to exit.", false)
            task.delay(2, function() closeConfirm = false end)
            return
        end

        disconnectAll()
        gui:Destroy()
    end)

    minimize.Activated:Connect(function()
        minimized = not minimized
        if minimized then
            content.Visible = false
            sidebar.Visible = false
            mainGui.Size = UDim2.new(0, 300, 0, 68)
        else
            content.Visible = true
            sidebar.Visible = true
            mainGui.Size = UDim2.new(0.94, 0, 0.72, 0)
        end
    end)

    local firstTab = tabs[1]
    if firstTab then
        firstTab.BackgroundColor3 = Color3.fromRGB(30,38,58)
    end
    playerPage.Visible = true
    currentPage = playerPage

    mainGui.Position = UDim2.fromScale(0.5, 0.62)
    mainGui.BackgroundTransparency = 1
    tween(mainGui, TweenInfo.new(0.35, Enum.EasingStyle.Quint), {
        Position = UDim2.fromScale(0.5, 0.5),
        BackgroundTransparency = 0.04,
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
