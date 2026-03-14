console.log("Content script loaded");

chrome.runtime.sendMessage({ type: "PING" }, (response) => {
  console.log("Background response:", response);
});