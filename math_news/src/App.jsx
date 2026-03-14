import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
   fetch('http://localhost:5000/content')
      .then((res) => {
        if (!res.ok) throw new Error('Forbidden');
        return res.json();
      })
      .then((data) => {
        // Grouping the pairs: [ {img}, {text}, {img}, {text} ]
        const formatted = [];
        for (let i = 0; i < data.length; i++) {
          if (data[i].isText === false) {
            formatted.push({
              image: data[i].content,
              title: data[i + 1]?.isText ? data[i + 1].content : "Untitled Proof"
            });
          }
        }
        setArticles(formatted);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="status-message">Loading Constants...</div>;
  if (error) return <div className="status-message error-text">forbidden content</div>;

  return (
    <div className="math-news-container">
      <header className="math-news-header">
        <h1>MathTube News</h1>
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
              <p className="article-meta">3.14M views • 1.618 hours ago</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;