import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SmartFAQRecommendations({ userQuery, onSelectFAQ, authHeaders }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({});

  useEffect(() => {
    if (userQuery && userQuery.length > 3) {
      const debounceTimer = setTimeout(() => {
        getRecommendations(userQuery);
      }, 500);
      return () => clearTimeout(debounceTimer);
    } else {
      setRecommendations([]);
    }
  }, [userQuery]);

  const getRecommendations = async (query) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/smart-faq-recommendations`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ query, limit: 5 })
      });
      
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to get FAQ recommendations:', error);
      // Fallback to simple matching
      generateFallbackRecommendations(query);
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackRecommendations = (query) => {
    const mockFAQs = [
      {
        id: 1,
        question: "How do I reset my password?",
        answer: "You can reset your password by clicking the 'Forgot Password' link on the login page and following the instructions sent to your email.",
        category: "Account",
        confidence: 0.85,
        relevanceScore: 0.9
      },
      {
        id: 2,
        question: "How do I update my billing information?",
        answer: "To update billing information, go to Settings > Billing in your dashboard and click 'Update Payment Method'.",
        category: "Billing",
        confidence: 0.75,
        relevanceScore: 0.8
      },
      {
        id: 3,
        question: "How do I cancel my subscription?",
        answer: "You can cancel your subscription anytime in Settings > Subscription. Your access will continue until the end of your billing period.",
        category: "Billing",
        confidence: 0.70,
        relevanceScore: 0.7
      }
    ];

    // Simple keyword matching for fallback
    const queryLower = query.toLowerCase();
    const filtered = mockFAQs.filter(faq => 
      faq.question.toLowerCase().includes(queryLower) ||
      faq.answer.toLowerCase().includes(queryLower) ||
      faq.category.toLowerCase().includes(queryLower)
    );

    setRecommendations(filtered.slice(0, 3));
  };

  const handleFeedback = async (faqId, isHelpful) => {
    setFeedback(prev => ({ ...prev, [faqId]: isHelpful }));
    
    try {
      await fetch(`${API}/api/faq-feedback`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          faq_id: faqId,
          query: userQuery,
          is_helpful: isHelpful,
          feedback_type: 'recommendation'
        })
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'var(--success)';
    if (confidence >= 0.6) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (!userQuery || userQuery.length <= 3) return null;

  return (
    <div className="smart-faq-recommendations">
      <div className="recommendations-header">
        <h4>💡 Related FAQs</h4>
        {loading && <div className="mini-spinner"></div>}
      </div>

      {recommendations.length > 0 ? (
        <div className="recommendations-list">
          {recommendations.map((faq, index) => (
            <div key={faq.id || index} className="recommendation-item">
              <div className="recommendation-header">
                <div className="confidence-indicator">
                  <span 
                    className="confidence-dot"
                    style={{ background: getConfidenceColor(faq.confidence || 0.7) }}
                  ></span>
                  <span className="confidence-label">
                    {getConfidenceLabel(faq.confidence || 0.7)} match
                  </span>
                </div>
                <span className="category-badge">{faq.category}</span>
              </div>
              
              <div className="recommendation-content">
                <h5 className="faq-question" onClick={() => onSelectFAQ(faq)}>
                  {faq.question}
                </h5>
                <p className="faq-preview">
                  {faq.answer.substring(0, 120)}...
                </p>
              </div>

              <div className="recommendation-actions">
                <button 
                  className="use-faq-btn"
                  onClick={() => onSelectFAQ(faq)}
                >
                  Use This FAQ
                </button>
                
                <div className="feedback-buttons">
                  <button
                    className={`feedback-btn ${feedback[faq.id] === true ? 'active' : ''}`}
                    onClick={() => handleFeedback(faq.id, true)}
                    title="This was helpful"
                  >
                    👍
                  </button>
                  <button
                    className={`feedback-btn ${feedback[faq.id] === false ? 'active' : ''}`}
                    onClick={() => handleFeedback(faq.id, false)}
                    title="This wasn't helpful"
                  >
                    👎
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !loading && (
        <div className="no-recommendations">
          <p>No matching FAQs found. The AI will provide a custom response.</p>
          <button className="create-faq-btn">
            📝 Suggest FAQ Creation
          </button>
        </div>
      )}

      <div className="recommendations-footer">
        <span className="ai-note">
          🤖 Powered by AI semantic search
        </span>
        <button className="improve-btn">
          Help improve suggestions
        </button>
      </div>
    </div>
  );
}