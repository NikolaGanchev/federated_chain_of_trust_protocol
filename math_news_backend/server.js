const express = require('express');
const app = express();
const PORT = 5001;

// Mock data following your requested structure:
// [{isText: false, content: "url"}, {isText: true, content: "title"}]
const mathArticles = [
  { 
    title: "Local Variable Finds Itself, Still Can't Find X", 
    image: "https://i.sstatic.net/LWPJy.png"
  },
  { 
    title: "A new mathemathical breakthrough changes everything we know about...", 
    image: "https://pbs.twimg.com/media/Euy5MtLWgAI75qo.jpg"
  },
  { 
    title: "New type of square root found", 
    image: "https://i0.wp.com/boingboing.net/wp-content/uploads/2016/05/square-root.jpg?fit=930%2C620&quality=60&ssl=1"
  },
  { 
    title: "Scientists found math and music are fundamentally intertwined", 
    image: "https://media.tenor.com/jiku0obSsyEAAAAe/ascending-spongebob.png" 
  },
  { 
    title: "The method of solving equations they don't want you to know about", 
    image: "https://st4.depositphotos.com/2487349/25360/i/450/depositphotos_253607274-stock-photo-discriminant-quadratic-equation-written-chalk.jpg" 
  },
  { 
    title: "Zero Claims It's Being Divided For No Reason", 
    image: "https://www.mathsisfun.com/numbers/images/divide-by-zero.jpg" 
  }
];

// Middleware to allow your React app to talk to this server (CORS)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get('/content', (req, res) => {
  if (
    !req.headers["fctp-nonce"] || 
    !req.headers["fctp-token"] || 
    !req.headers["fctp-issuer"] || 
    !req.headers["fctp-token-type"]
  ) {
    res.header("fctp-claim", "age_over_18");
    res.header("fctp-trustees", "http://localhost:3005");
    return res.status(403).send("");
  }
  let nonce = req.get("fctp-nonce");
  let token = req.get("fctp-token");
  let issuer = req.get("fctp-issuer");
  let tokenType = req.get("fctp-token-type");

  if (issuer !== "http://localhost:3005") {
    return res.status(403).send("");
  }

  fetch("http://localhost:3005/verify_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nonce: nonce,
      claim: "age_over_18",
      token_type: tokenType,
      token: token
    })
  })
    .then(async (res1) => {
      if (res1.ok) {
        const data = await res1.json(); 
        
        res.header("fctp-proof", data.nonce_sig);
        return res.status(200).json(mathArticles);
      } else {
        return res.status(403).send("");
      }
    })
    .catch((err) => {
      return res.status(403).send("");
    });
  });

app.listen(PORT, () => {
  console.log(`Math Backend running at http://localhost:${PORT}`);
});