import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import api from '../../lib/axios';
import './Docs.css';
import 'highlight.js/styles/github-dark.css';

const MarkdownDocViewer = () => {
  const { docId } = useParams();
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocs = async () => {
      if (!docId) return;
      try {
        setLoading(true);
        // Using the generic API endpoint
        const response = await api.get(`/docs/${docId}`);
        setMarkdown(response.data.content);
        setError(null);
      } catch (err) {
        console.error('Error fetching documentation:', err);
        setError('Failed to load documentation. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [docId]);

  if (loading) {
    return (
      <div className="docs-loading">
        <div className="docs-spinner"></div>
        <p>Loading Documentation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="docs-error">
        <div className="docs-error-icon">⚠️</div>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownDocViewer;
