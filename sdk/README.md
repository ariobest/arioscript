# ARIO SCRIPTS Key SDK

This folder contains a minimal Lua client example for calling the ARIO key-verification API.

## Endpoint contract

`GET /api/public/keys/validate?key=YOUR_KEY&device_id=YOUR_DEVICE_ID`

Expected JSON:

- Valid: `{"valid":true}`
- Invalid: `{"valid":false,"error":"invalid_key"}`

## Important deployment note

The Admin Key System screen displays the expected verification URL, but the website repository did not contain a matching `/api/public/keys/validate` route when this SDK was added. Deploy and test a server-side validation handler before using the SDK to gate protected code. The client sample is not a substitute for server-side key checks. Never expose Supabase service-role credentials in a Lua loader or browser bundle.

## Example

```lua
local ArioKey = loadstring(game:HttpGet("YOUR_HOSTED_SDK_URL"))()
local verifier = ArioKey.new({
    endpoint = "https://arioscript.lovable.app/api/public/keys/validate",
    key = "YOUR_LICENSE_KEY",
})
local valid, reason = verifier:Verify()
if not valid then
    warn("ARIO verification failed: " .. tostring(reason))
    return
end
print("ARIO key verified")
```

The SDK expects the endpoint to validate key status, expiry, usage limits, and device binding on the server and to return JSON consistently.
