import { labelFor, patternFor, serverPatterns } from "./servers.js";

const list = document.getElementById("servers");
const empty = document.getElementById("empty");
const form = document.getElementById("add");
const address = document.getElementById("address");
const error = document.getElementById("error");

function showError(message) {
  error.textContent = message;
  error.hidden = !message;
}

async function render() {
  const patterns = await serverPatterns();
  list.replaceChildren(
    ...patterns.map((pattern) => {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.textContent = labelFor(pattern);
      const remove = document.createElement("button");
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        chrome.permissions.remove({ origins: [pattern] }).then(render);
      });
      item.append(label, remove);
      return item;
    }),
  );
  empty.hidden = patterns.length > 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const pattern = patternFor(address.value);
  if (!pattern) {
    showError("That doesn't look like an address. Try something like 192.168.1.20:8080.");
    return;
  }
  showError("");
  // Browsers only ask for access straight from a click, so nothing is
  // awaited before this
  chrome.permissions.request({ origins: [pattern] }).then((granted) => {
    if (!granted) {
      showError("Chipper needs access to that address to work with the server there.");
      return;
    }
    address.value = "";
    render();
  });
});

// The background script registers the bridge when access changes, including
// when it's removed from the browser's own extension settings
chrome.permissions.onAdded.addListener(render);
chrome.permissions.onRemoved.addListener(render);
render();
