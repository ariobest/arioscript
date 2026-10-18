-- ARIO SCRIPTS Key SDK — Roblox Luau
-- Public verification endpoint: Supabase Edge Function ario-api?action=validate
-- Never put a Supabase service-role key or other private secret in this file.

local HttpService = game:GetService("HttpService")
local Analytics = game:GetService("RbxAnalyticsService")

local ArioKey = {}
ArioKey.__index = ArioKey

local DEFAULT_ENDPOINT = "https://yxbzblbtzqioexszjjkc.supabase.co/functions/v1/ario-api?action=validate"

local function normalizeResult(payload)
    if type(payload) ~= "table" or type(payload.valid) ~= "boolean" then
        return { valid = false, code = "INVALID_SERVER_RESPONSE", message = "The verification server returned an invalid response." }
    end
    return {
        valid = payload.valid == true,
        code = tostring(payload.code or (payload.valid and "KEY_VALID" or "KEY_INVALID")),
        message = tostring(payload.message or (payload.valid and "Key verified" or "The key could not be verified")),
        expires_at = payload.expires_at,
        key_type = payload.key_type,
        request_id = payload.request_id,
    }
end

function ArioKey.new(options)
    assert(type(options) == "table", "options table required")
    assert(type(options.key) == "string" and #options.key <= 64, "valid license key required")

    local deviceId = options.deviceId
    if type(deviceId) ~= "string" or #deviceId < 16 or #deviceId > 200 then
        local ok, clientId = pcall(function()
            return Analytics:GetClientId()
        end)
        if not ok or type(clientId) ~= "string" or #clientId < 16 then
            error("Could not obtain a stable client identifier. Supply options.deviceId from a supported persistent identifier.")
        end
        deviceId = clientId
    end

    return setmetatable({
        endpoint = options.endpoint or DEFAULT_ENDPOINT,
        key = string.upper(options.key),
        deviceId = deviceId,
        scriptId = options.scriptId,
    }, ArioKey)
end

function ArioKey:Verify()
    if type(self.endpoint) ~= "string" or not self.endpoint:match("^https://") then
        return { valid = false, code = "INVALID_CONFIGURATION", message = "The verification endpoint must use HTTPS." }
    end

    local requestBody = {
        key = self.key,
        device_id = self.deviceId,
        script_id = self.scriptId,
    }

    local ok, response = pcall(function()
        return HttpService:RequestAsync({
            Url = self.endpoint,
            Method = "POST",
            Headers = { ["Content-Type"] = "application/json", ["Accept"] = "application/json" },
            Body = HttpService:JSONEncode(requestBody),
        })
    end)

    if not ok or type(response) ~= "table" then
        return { valid = false, code = "NETWORK_ERROR", message = "Verification is unavailable. Please try again." }
    end

    if response.Success ~= true or type(response.StatusCode) ~= "number" or response.StatusCode < 200 or response.StatusCode >= 300 then
        return { valid = false, code = "VERIFICATION_FAILED", message = "The key could not be verified." }
    end

    local decodedOk, payload = pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)
    if not decodedOk then
        return { valid = false, code = "INVALID_SERVER_RESPONSE", message = "The verification server returned invalid JSON." }
    end

    return normalizeResult(payload)
end

return ArioKey
