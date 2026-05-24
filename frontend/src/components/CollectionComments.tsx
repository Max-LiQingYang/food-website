import React, { useState, useEffect, useCallback } from 'react';
import { getCollectionComments, addCollectionComment, deleteCollectionComment } from '../api';
import { useAuth } from '../context/AuthContext';
import './CollectionComments.css';

interface Comment {
  id: string;
  collectionId: string;
  userId: string;
  content: string;
  user?: { id: string; username: string; nickname: string | null; avatar?: string };
  createdAt: string;
}

interface Props {
  collectionId: string;
  isPublic: boolean;
  ownerId?: string;
}

const CollectionComments: React.FC<Props> = ({ collectionId, isPublic, ownerId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCollectionComments(collectionId);
      setComments(Array.isArray(res) ? res : (res as any).list || []);
    } catch (err: any) {
      setError(err?.message || '加载评论失败');
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSubmit = async () => {
    if (!newContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addCollectionComment(collectionId, newContent.trim());
      setNewContent('');
      await fetchComments();
    } catch (err: any) {
      alert(err?.message || '评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteCollectionComment(collectionId, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err: any) {
      alert(err?.message || '删除失败');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return d.toLocaleDateString('zh-CN');
  };

  const canDelete = (comment: Comment) => {
    if (!user) return false;
    if (comment.userId === user.id) return true;
    return ownerId === user.id;
  };

  return (
    <div className="collection-comments">
      <h3 className="comments-title">评论 ({comments.length})</h3>

      {user && isPublic && (
        <div className="comment-form">
          <textarea
            className="comment-input"
            placeholder="写下你的评论..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="comment-form-actions">
            <span className="comment-char-count">{newContent.length}/500</span>
            <button
              className="comment-submit-btn"
              onClick={handleSubmit}
              disabled={!newContent.trim() || submitting}
            >
              {submitting ? '发布中...' : '发布评论'}
            </button>
          </div>
        </div>
      )}

      {!user && isPublic && (
        <p className="comment-login-hint">登录后可评论收藏夹</p>
      )}

      {loading && <div className="comments-loading">加载评论中...</div>}

      {error && <div className="comments-error">{error} <button onClick={fetchComments}>重试</button></div>}

      {!loading && !error && comments.length === 0 && (
        <p className="comments-empty">暂无评论，快来抢沙发吧 🛋️</p>
      )}

      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className="comment-item">
            <div className="comment-avatar">
              {comment.user?.avatar ? (
                <img src={comment.user.avatar} alt={comment.user.nickname || ''} />
              ) : (
                <span className="comment-avatar-fallback">
                  {(comment.user?.nickname || comment.user?.username || '?')[0]}
                </span>
              )}
            </div>
            <div className="comment-body">
              <div className="comment-header">
                <span className="comment-author">
                  {comment.user?.nickname || comment.user?.username || '匿名用户'}
                </span>
                <span className="comment-time">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="comment-text">{comment.content}</p>
              {canDelete(comment) && (
                <button
                  className="comment-delete-btn"
                  onClick={() => handleDelete(comment.id)}
                >
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollectionComments;