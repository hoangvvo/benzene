local open = io.open

local function read_file(path)
    local file = open(path, "rb") -- r read mode and b binary mode
    if not file then return nil end
    local content = file:read "*a" -- *a or *all reads the whole file
    file:close()
    return content
end

wrk.method = "POST"
wrk.body   = read_file("./src/body.json")
wrk.headers["Content-Type"] = "application/json"

done = function(summary, latency, requests)
  io.write("json result:\n")
  io.write(string.format(
      "{\"requests_sec\":%.2f,\"avg_latency_sec\":%.4f,\"transfer_sec\":%.2f}",
      summary.requests/(summary.duration/1000000),
      (latency.mean/1000000),
      (summary.bytes/(1024*1024))
      ))
end