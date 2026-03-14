import TokenResponseStorage from "./response/TokenResponseStorage";
import IssuerTrustGraphStorage from "./issuer/graph/IssuerTrustGraphStorage";
import TokenResponse from "./response/TokenResponse";
import IssuerGraphBuilder from "./issuer/graph/IssuerGraphBuilder";

let tokenResponses = await TokenResponseStorage.loadResponses()
let truthGraphs = await IssuerTrustGraphStorage.loadGraphs()

async function sendLoginForm(url) {
    const form = document.getElementById("login-form");

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });

    if (!response.ok) {
        throw new Error("Request failed");
    }

    const json = await response.json();
    return json;
}

document.getElementById("login-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    try {
        const url = 'https://example.com/api/login';
        const result = await sendLoginForm(url);
        const tokenResponseList = result.map(t => TokenResponse.fromJSON(t));

        for (const response of tokenResponseList) {
            if (!response.isExpired()) {
                tokenResponses.set(response.username, response);
            }
        }

        truthGraphs.push(await new IssuerGraphBuilder(url).build())
        await TokenResponseStorage.saveTokenResponses(tokenResponses)
    } catch (err) {
        console.error(err);
    }
});