// src/agent-tools.js – tool execution for Nexus Toolbox
/**
 * Runs a tool requested by the LLM.
 * Supported tools: DOM_QUERY, CLICK_ELEMENT.
 * @param {string} name - Tool name.
 * @param {object} args - Arguments parsed from model response.
 * @returns {Promise<object>} Result object {success:boolean, payload?, error?}
 */
export async function runTool(name, args) {
  // Get the active tab where the tool should run
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return { success: false, error: 'No active tab found' };
  }

  // Helper to execute a function inside the page context
  const execInPage = async (fn, fnArgs) => {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fn,
      args: fnArgs,
    });
    return result;
  };

  if (name === 'DOM_QUERY') {
    const { selector, attribute } = args;
    const res = await execInPage((sel, attr) => {
      try {
        const el = document.querySelector(sel);
        if (!el) return { found: false };
        if (attr) {
          const val = el.getAttribute(attr) ?? el[attr] ?? null;
          return { found: true, value: val };
        }
        return { found: true, value: el.outerHTML };
      } catch (e) {
        return { found: false, error: e.message };
      }
    }, [selector, attribute]);
    return res.found
      ? { success: true, payload: res.value }
      : { success: false, error: res.error || `Selector "${selector}" not found` };
  }

  if (name === 'CLICK_ELEMENT') {
    const { selector } = args;
    const res = await execInPage(sel => {
      try {
        const el = document.querySelector(sel);
        if (!el) return { clicked: false };
        el.click();
        return { clicked: true };
      } catch (e) {
        return { clicked: false, error: e.message };
      }
    }, [selector]);
    return res.clicked
      ? { success: true, payload: `Clicked element "${selector}"` }
      : { success: false, error: res.error || `Element "${selector}" not found` };
  }

  return { success: false, error: `Unsupported tool "${name}"` };
}
