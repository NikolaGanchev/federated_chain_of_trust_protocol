import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRetry, setIsRetry] = useState(false);

  useEffect(() => {
    function fctp_send_again(e) {
      if (e.data.action && e.data.action == "RETRY_FCTP_REQUEST") {
        if (!e.data.url || !e.data.method) {
          console.err("missing");
        }

        let entries = JSON.parse(localStorage.getItem("fctp_send_again"));
        if(entries == null) entries = [];

        entries.push({
          url: e.data.url,
          method: e.data.method
        });

        localStorage.setItem("fctp_send_again", JSON.stringify(entries));
        setIsRetry(true);
      }
    }

   if (!isRetry) {
    window.addEventListener('message', fctp_send_again);
   }

   fetch('http://localhost:5001/content')
      .then((res) => {
        if (res.status == 403 && !isRetry) {
          return;
        } else if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        const formatted = [];
        for (let i = 0; i < data.length; i++) {
          formatted.push({
              image: data[i].image,
              title: data[i].title
          });
        }
        setArticles(formatted);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [isRetry]);

  if (loading) return <div className="status-message">Loading Constants...</div>;
  if (error) return <div className="status-message error-text">forbidden content</div>;

  return (
    <div className="math-news-container">
      <header className="math-news-header">
        <h1>Math News</h1>
      </header>

      <div className="articles-grid">
        {articles.map((article, index) => (
          <div key={index} className="article-card">
            <div className="thumbnail-wrapper">
              <img 
                src={article.image} 
                alt="Thumbnail" 
                className="thumbnail-img" 
              />
            </div>
            <div className="article-info">
              <h3 className="article-title">{article.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;