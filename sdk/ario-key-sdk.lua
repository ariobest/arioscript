-- ARIO SCRIPTS Key SDK (client example)
-- Endpoint contract: GET /api/public/keys/validate?key=...&device_id=...
-- Expected JSON: { "valid": true } or { "valid": false, "error": "..." }
-- IMPORTANT: The endpoint must be deployed and tested before relying on this SDK.
-- Do not put service-role keys, admin secrets, or private API tokens in this file.

local HttpService = game:GetService("HttpService")
local Analytics = game:GetService("RbxAnalyticsService")

local ArioKey = {}
ArioKey.__index = ArioKey

function ArioKey.new(options)
    assert(type(options) == "table", "options table required")
    assert(type(options.endpoint) == "string", "endpoint URL required")
    assert(type(options.key) == "string", "license key required")

    return setmetatable({
        endpoint = options.endpoint,
        key = options.key,
        deviceId = options.deviceId or Analytics:GetClientId(),
    }, ArioKey)
end

function ArioKey:Verify()
    local url = self.endpoint
        .. "?key=" .. HttpService:UrlEncode(self.key)
        .. "&device_id=" .. HttpService:UrlEncode(self.deviceId)

    local ok, body = pcall(function()
        return game:HttpGet(url)
    end)
    if not ok then
        return false, "verification_unavailable"
    end

    local decodedOk, result = pcall(function()
        return HttpService:JSONDecode(body)
    end)
    if not decodedOk or type(result) ~= "table" then
        return false, "invalid_server_response"
    end
    if result.valid ~= true then
        return false, tostring(result.error or "invalid_key")
    end
    return true, nil
end

return ArioKey
