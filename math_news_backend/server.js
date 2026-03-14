const express = require('express');
const app = express();
const PORT = 5000;

// Mock data following your requested structure:
// [{isText: false, content: "url"}, {isText: true, content: "title"}]
const mathArticles = [
  { 
    title: "Local Variable Finds Itself, Still Can't Find X", 
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800" 
  },
  { 
    title: "Is 3.14 Really Delicious? Our Review of Pi", 
    image: "https://images.unsplash.com/photo-1509228468518-180dd482180c?w=800" 
  },
  { 
    title: "Parallel Lines Meet at Infinity; Only To Realize They Have Nothing in Common", 
    image: "https://images.unsplash.com/photo-1632605284619-3071f008447d?w=800" 
  },
  { 
    title: "Top 10 Imaginary Friends That Are Just Square Roots of Negatives", 
    image: "https://images.unsplash.com/photo-1596495573826-3946d028b1f3?w=800" 
  },
  { 
    title: "Breaking: Fibonacci Sequence Refuses to Stop Growing", 
    image: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=800" 
  },
  { 
    title: "Zero Claims It's Being Divided For No Reason", 
    image: "https://images.unsplash.com/photo-1635070040809-6e3e15720743?w=800" 
  }
];

// Middleware to allow your React app to talk to this server (CORS)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get('/content', (req, res) => {
  // To test your "forbidden content" error state, 
  // you can uncomment the next line:
  // return res.status(403).send('Forbidden');

  res.json(mathArticles);
});

app.listen(PORT, () => {
  console.log(`Math Backend running at http://localhost:${PORT}`);
});