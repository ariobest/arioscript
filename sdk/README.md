# ARIO SCRIPTS Key SDK (Roblox Luau)

This SDK uses the ARIO production Supabase project and the POST JSON contract. It never contains a service-role key.

## Endpoint

`https://yxbzblbtzqioexszjjkc.supabase.co/functions/v1/ario-api?action=validate`

- Method: `POST`
- Content-Type: `application/json`
- Body: `{"key":"ARIO-A1-B2C3-D4","device_id":"stable-client-id","script_id":"optional-script-id"}`
- Response: `{"valid":true,"code":"KEY_VALID","message":"Key verified","expires_at":null,"key_type":"premium","request_id":"..."}`

The endpoint is an Edge Function route; do not assume `/api/public/keys/validate` is deployed unless a deployment explicitly maps it there.

## Roblox usage

Enable **Allow HTTP Requests** in the experience's security settings. Put this module in a ModuleScript, or host its exact source where your intended environment can load it.

```lua
local ArioKey = require(path.to.SDK)
local verifier = ArioKey.new({
    key = "ARIO-A1-B2C3-D4",
    scriptId = "my-protected-script",
})

local result = verifier:Verify()
if not result.valid then
    warn("ARIO verification failed: " .. tostring(result.code))
    return
end

-- Continue only after successful server verification.
```

For loadstring-compatible environments, the module must return the SDK table, so the caller can do:

```lua
local ArioKey = loadstring(game:HttpGet("YOUR_PUBLISHED_SDK_RAW_URL"))()
local result = ArioKey.new({ key = "ARIO-A1-B2C3-D4", scriptId = "my-protected-script" }):Verify()
if not result.valid then return end
```

## Device identifier limits

The default uses Roblox's `RbxAnalyticsService:GetClientId()` when available. This is a client identifier, not tamper-proof hardware identity. Environments where that API is unavailable must provide a stable identifier through `deviceId`; do not invent a hardware fingerprint.

## Important status

The SDK fails closed on network errors, non-2xx HTTP responses, malformed JSON, or a response without a boolean `valid` field. The server-side validation RPC and the deployed Edge Function must both be updated before using this SDK in production. The SDK alone does not protect source code that is already shipped to the client.
