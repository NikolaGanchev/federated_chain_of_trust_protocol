import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const populated = useRef(false);

  useEffect(() => {
    if (!populated.current) {
      fetch('http://localhost:5001/content')
        .then((res) => {
          if (!res.ok) throw new Error("Unauthorized");
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
        populated.current = true;
      }
  }, []);

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