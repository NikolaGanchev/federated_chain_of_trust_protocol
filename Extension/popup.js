import TokenResponseStorage from "./response/TokenResponseStorage.js";
import IssuerTrustGraphStorage from "./issuer/graph/IssuerTrustGraphStorage.js";
import TokenResponse from "./response/TokenResponse.js";
import IssuerGraphBuilder from "./issuer/graph/IssuerGraphBuilder.js";

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

        result.map(t => TokenResponse.fromJSON(t)).array.forEach(async item => {
            await TokenResponseStorage.add(item);
        });;

        truthGraphs.push(await new IssuerGraphBuilder(url).build())
    } catch (err) {
        console.error(err);
    }
});