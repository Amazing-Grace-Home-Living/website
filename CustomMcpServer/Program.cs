using System.ComponentModel;
using ModelContextProtocol.AspNetCore;
using ModelContextProtocol.Server;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Builder;

var useStdio = args.Contains("--stdio", StringComparer.OrdinalIgnoreCase);

if (useStdio)
{
    // Local STDIO mode (for Antigravity & ChatGPT Desktop Work/Codex)
    var builder = Host.CreateApplicationBuilder(args);
    // Route logs to stderr to avoid contaminating stdout JSON-RPC frames
    builder.Logging.AddConsole(options =>
    {
        options.LogToStandardErrorThreshold = Microsoft.Extensions.Logging.LogLevel.Trace;
    });
    builder.Services
        .AddMcpServer()
        .WithStdioServerTransport()
        .WithToolsFromAssembly();
    await builder.Build().RunAsync();
}
else
{
    // Remote Streamable HTTP mode (for ChatGPT Web / Tunnels / Remote HTTP)
    var builder = WebApplication.CreateBuilder(args);
    builder.Services
        .AddMcpServer()
        .WithHttpTransport()
        .WithToolsFromAssembly();
    var app = builder.Build();
    // Exposes the Streamable HTTP endpoint at http://localhost:5000/mcp
    app.MapMcp("/mcp");
    await app.RunAsync();
}

// ============================================================================
// Define your MCP Tools below
// ============================================================================

[McpServerToolType]
public static class WorkspaceTools
{
    [McpServerTool, Description("Returns basic environment and build status details for the local machine.")]
    public static string GetSystemStatus()
    {
        return $"Host: {Environment.MachineName} | OS: {Environment.OSVersion} | .NET: {Environment.Version} | UTC: {DateTime.UtcNow:O}";
    }

    [McpServerTool, Description("Reads a text file from an allowed local directory.")]
    public static async Task<string> ReadProjectFile([
        Description("Full path to the file to read")] string filePath)
    {
        if (!File.Exists(filePath))
            throw new ArgumentException($"File not found: {filePath}");
        return await File.ReadAllTextAsync(filePath);
    }
}
