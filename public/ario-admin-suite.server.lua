--[[
    ARIO ADMIN SUITE v2.4 Pro
    Server-side controller for YOUR Roblox experience.

    Put this Script in ServerScriptService.
    Enable HTTP Requests in Game Settings.
    Replace ADMIN_USER_IDS with your Roblox UserIds.

    Security model:
      - The client never receives the ARIO validation URL as an editable setting.
      - License verification and all privileged actions happen on the server.
      - Remote inputs are type/range/permission checked.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local TeleportService = game:GetService("TeleportService")
local DataStoreService = game:GetService("DataStoreService")

local API_URL = "https://arioscript.lovable.app/api/public/keys/validate"
local LICENSE_STORE = DataStoreService:GetDataStore("ARIO_Admin_LicenseCache_v1")

local ADMIN_USER_IDS = {
    -- [123456789] = true,
}

local MAX_WALK_SPEED = 100
local MAX_JUMP_POWER = 150
local MAX_FLY_SPEED = 100

local verified = {}
local lastAction = {}

local remoteFolder = ReplicatedStorage:FindFirstChild("ArioAdmin") or Instance.new("Folder")
remoteFolder.Name = "ArioAdmin"
remoteFolder.Parent = ReplicatedStorage

local function remote(name, className)
    local object = remoteFolder:FindFirstChild(name)
    if object and object.ClassName == className then
        return object
    end
    if object then
        object:Destroy()
    end
    object = Instance.new(className)
    object.Name = name
    object.Parent = remoteFolder
    return object
end

local command = remote("Command", "RemoteEvent")
local verify = remote("VerifyLicense", "RemoteFunction")
local status = remote("Status", "RemoteEvent")

local function isAdmin(player)
    return ADMIN_USER_IDS[player.UserId] == true
end

local function sanitizeKey(value)
    if typeof(value) ~= "string" then
        return ""
    end
    return string.upper((value:gsub("[%s\r\n'\"]", "")))
end

local function validFormat(key)
    return key:match("^ARIO%-[A-F0-9]+%-[A-F0-9]+%-[A-F0-9]+$") ~= nil
end

local function checkLicense(key)
    key = sanitizeKey(key)

    if not validFormat(key) then
        return false, "Invalid format"
    end

    local encoded = HttpService:UrlEncode(key)
    local success, body = pcall(function()
        return HttpService:GetAsync(API_URL .. "?key=" .. encoded, true)
    end)

    if not success or typeof(body) ~= "string" then
        return false, "License server unavailable"
    end

    local decodedOk, data = pcall(function()
        return HttpService:JSONDecode(body)
    end)

    if decodedOk and type(data) == "table" and data.valid == true then
        return true, "Key accepted! Welcome."
    end

    return false, "Invalid or expired key."
end

local function saveLicense(player, key)
    pcall(function()
        LICENSE_STORE:SetAsync("u_" .. player.UserId, {
            key = key,
            verifiedAt = os.time(),
        })
    end)
end

local function loadLicense(player)
    local success, value = pcall(function()
        return LICENSE_STORE:GetAsync("u_" .. player.UserId)
    end)

    if success and type(value) == "table" and typeof(value.key) == "string" then
        return sanitizeKey(value.key)
    end

    return nil
end

local function rateLimit(player, actionName, interval)
    local now = os.clock()
    lastAction[player] = lastAction[player] or {}
    local previous = lastAction[player][actionName] or 0

    if now - previous < interval then
        return false
    end

    lastAction[player][actionName] = now
    return true
end

local function send(player, kind, message)
    status:FireClient(player, kind, message)
end

local function findPlayer(value)
    if typeof(value) ~= "string" then
        return nil
    end

    local lowered = value:lower()

    for _, player in Players:GetPlayers() do
        if player.Name:lower() == lowered or player.DisplayName:lower() == lowered then
            return player
        end
    end

    for _, player in Players:GetPlayers() do
        if player.Name:lower():sub(1, #lowered) == lowered then
            return player
        end
    end

    return nil
end

verify.OnServerInvoke = function(player, rawKey)
    if not isAdmin(player) then
        return false, "You are not authorized to use ARIO ADMIN."
    end

    local key = sanitizeKey(rawKey)
    if key == "" then
        return false, "Enter a license key."
    end

    if not rateLimit(player, "verify", 3) then
        return false, "Please wait before trying again."
    end

    local ok, message = checkLicense(key)

    if ok then
        verified[player.UserId] = true
        saveLicense(player, key)
        return true, message
    end

    return false, message
end

local function applyCharacterState(player)
    local character = player.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    if not humanoid then
        return
    end

    local walkSpeed = player:GetAttribute("ArioWalkSpeed")
    local jumpPower = player:GetAttribute("ArioJumpPower")

    if typeof(walkSpeed) == "number" then
        humanoid.WalkSpeed = math.clamp(walkSpeed, 0, MAX_WALK_SPEED)
    end

    if typeof(jumpPower) == "number" then
        humanoid.UseJumpPower = true
        humanoid.JumpPower = math.clamp(jumpPower, 0, MAX_JUMP_POWER)
    end
end

local function setAdminAttribute(player, name, value)
    if typeof(value) == "boolean" then
        player:SetAttribute(name, value)
    elseif typeof(value) == "number" and math.isfinite(value) then
        player:SetAttribute(name, value)
    end
end

command.OnServerEvent:Connect(function(player, action, payload)
    if not isAdmin(player) or not verified[player.UserId] then
        return
    end

    if typeof(action) ~= "string" then
        return
    end

    payload = typeof(payload) == "table" and payload or {}

    if action == "SetWalkSpeed" then
        if not rateLimit(player, action, 0.08) then return end
        local value = tonumber(payload.value)
        if not value or not math.isfinite(value) then return end
        value = math.clamp(value, 0, MAX_WALK_SPEED)
        setAdminAttribute(player, "ArioWalkSpeed", value)
        applyCharacterState(player)

    elseif action == "SetJumpPower" then
        if not rateLimit(player, action, 0.08) then return end
        local value = tonumber(payload.value)
        if not value or not math.isfinite(value) then return end
        value = math.clamp(value, 0, MAX_JUMP_POWER)
        setAdminAttribute(player, "ArioJumpPower", value)
        applyCharacterState(player)

    elseif action == "SetInfiniteJump" then
        if not rateLimit(player, action, 0.15) then return end
        setAdminAttribute(player, "ArioInfiniteJump", payload.enabled == true)

    elseif action == "SetFly" then
        if not rateLimit(player, action, 0.15) then return end
        setAdminAttribute(player, "ArioFly", payload.enabled == true)
        local speed = tonumber(payload.speed)
        if speed and math.isfinite(speed) then
            setAdminAttribute(player, "ArioFlySpeed", math.clamp(speed, 10, MAX_FLY_SPEED))
        end

    elseif action == "SetNoclip" then
        if not rateLimit(player, action, 0.15) then return end
        setAdminAttribute(player, "ArioNoclip", payload.enabled == true)

    elseif action == "TeleportToPlayer" then
        if not rateLimit(player, action, 1) then return end

        local target = findPlayer(payload.player)
        if not target or target == player then
            send(player, "error", "Player not found.")
            return
        end

        local sourceCharacter = player.Character
        local targetCharacter = target.Character
        local sourceRoot = sourceCharacter and sourceCharacter:FindFirstChild("HumanoidRootPart")
        local targetRoot = targetCharacter and targetCharacter:FindFirstChild("HumanoidRootPart")

        if sourceRoot and targetRoot then
            sourceRoot.CFrame = targetRoot.CFrame + Vector3.new(0, 3, 0)
            send(player, "success", "Teleported to " .. target.Name)
        end

    elseif action == "Rejoin" then
        if not rateLimit(player, action, 5) then return end

        local success, err = pcall(function()
            TeleportService:TeleportAsync(game.PlaceId, { player })
        end)

        if not success then
            send(player, "error", "Rejoin failed: " .. tostring(err))
        end

    elseif action == "RequestPlayers" then
        if not rateLimit(player, action, 0.5) then return end

        local list = {}
        for _, target in Players:GetPlayers() do
            table.insert(list, {
                name = target.Name,
                displayName = target.DisplayName,
                userId = target.UserId,
            })
        end

        status:FireClient(player, "players", list)

    elseif action == "SetTheme" then
        if not rateLimit(player, action, 0.15) then return end
        local theme = tostring(payload.theme or "")
        local allowed = {
            Cyan = true,
            Blue = true,
            Crimson = true,
            Emerald = true,
            Purple = true,
        }
        if allowed[theme] then
            player:SetAttribute("ArioTheme", theme)
        end
    end
end)

local function setupPlayer(player)
    if not isAdmin(player) then
        return
    end

    player:SetAttribute("ArioAdmin", true)
    player:SetAttribute("ArioWalkSpeed", 16)
    player:SetAttribute("ArioJumpPower", 50)
    player:SetAttribute("ArioFlySpeed", 50)
    player:SetAttribute("ArioInfiniteJump", false)
    player:SetAttribute("ArioFly", false)
    player:SetAttribute("ArioNoclip", false)

    player.CharacterAdded:Connect(function()
        task.wait(0.25)
        applyCharacterState(player)
    end)

    task.spawn(function()
        local cachedKey = loadLicense(player)
        if cachedKey then
            local ok = checkLicense(cachedKey)
            if ok then
                verified[player.UserId] = true
                status:FireClient(player, "verified", "Saved license accepted.")
            end
        end
    end)
end

Players.PlayerAdded:Connect(setupPlayer)

Players.PlayerRemoving:Connect(function(player)
    verified[player.UserId] = nil
    lastAction[player] = nil
end)

for _, player in Players:GetPlayers() do
    task.spawn(setupPlayer, player)
end
