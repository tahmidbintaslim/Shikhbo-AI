# Shikbo AI Database Schema Design

## Overview

This database schema is designed for a scalable AI tutoring platform supporting millions of users, conversations, and educational content.

## Technology Stack

- **Primary Database**: PostgreSQL (for relational data)
- **Cache Layer**: Redis/Vercel KV (for session and response caching)
- **File Storage**: Vercel Blob/AWS S3 (for exported conversations, audio files)
- **Search**: Elasticsearch (for conversation search and analytics)

## Core Tables

### 1. users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    avatar_url TEXT,
    locale VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(10) DEFAULT 'light',
    grade_preference INTEGER CHECK (grade_preference BETWEEN 1 AND 12),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    total_messages INTEGER DEFAULT 0,
    total_conversations INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active, last_active_at);
CREATE INDEX idx_users_created ON users(created_at);
```

### 2. conversations

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    grade INTEGER CHECK (grade BETWEEN 1 AND 12),
    subject VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    message_count INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    tags TEXT[], -- For categorization
    metadata JSONB -- Store additional conversation data
);

-- Indexes
CREATE INDEX idx_conversations_user ON conversations(user_id, created_at DESC);
CREATE INDEX idx_conversations_grade ON conversations(grade);
CREATE INDEX idx_conversations_subject ON conversations(subject);
CREATE INDEX idx_conversations_active ON conversations(is_archived, last_message_at DESC);
CREATE INDEX idx_conversations_tags ON conversations USING GIN(tags);
```

### 3. messages

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text', -- text, markdown, code, etc.
    tokens_used INTEGER,
    model_used VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB, -- Store message-specific data like code language, etc.

    -- Full-text search
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', content)
    ) STORED
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_user ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_role ON messages(role);
CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);
CREATE INDEX idx_messages_created ON messages(created_at);
```

### 4. user_sessions

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_sessions_user ON user_sessions(user_id, created_at DESC);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

### 5. api_usage

```sql
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time INTEGER, -- in milliseconds
    tokens_used INTEGER,
    cost_cents INTEGER, -- cost in cents
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE api_usage_2024_01 PARTITION OF api_usage
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes
CREATE INDEX idx_api_usage_user ON api_usage(user_id, created_at DESC);
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint, created_at);
CREATE INDEX idx_api_usage_created ON api_usage(created_at);
```

### 6. feedback

```sql
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    feedback_type VARCHAR(50), -- 'accuracy', 'helpfulness', 'relevance', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feedback_user ON feedback(user_id, created_at DESC);
CREATE INDEX idx_feedback_message ON feedback(message_id);
CREATE INDEX idx_feedback_type ON feedback(feedback_type);
```

### 7. educational_content

```sql
CREATE TABLE educational_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT,
    content_type VARCHAR(50), -- 'lesson', 'exercise', 'quiz', 'reference'
    subject VARCHAR(100),
    grade INTEGER CHECK (grade BETWEEN 1 AND 12),
    language VARCHAR(10) DEFAULT 'en',
    difficulty VARCHAR(20) DEFAULT 'medium',
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_published BOOLEAN DEFAULT false,

    -- Full-text search
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || content)
    ) STORED
);

-- Indexes
CREATE INDEX idx_content_subject ON educational_content(subject, grade);
CREATE INDEX idx_content_type ON educational_content(content_type);
CREATE INDEX idx_content_published ON educational_content(is_published, updated_at DESC);
CREATE INDEX idx_content_tags ON educational_content USING GIN(tags);
CREATE INDEX idx_content_search ON educational_content USING GIN(search_vector);
```

## Redis/Vercel KV Usage

### Cache Keys Structure:

```
cache:response:{grade}:{normalized_input}  # AI responses
session:{user_id}:{session_token}          # User sessions
rate_limit:{ip_address}                    # Rate limiting
user:{user_id}:conversations               # User's recent conversations
analytics:daily:{date}                     # Daily usage stats
```

### Cache TTLs:

- AI Responses: 5 minutes
- User Sessions: 24 hours
- Rate Limits: 1 minute
- Analytics: 30 days

## Migration Strategy

### Phase 1: Basic Setup

1. Users table with basic auth
2. Conversations and messages with localStorage fallback
3. Basic analytics

### Phase 2: Enhanced Features

1. Full user authentication
2. Advanced search and filtering
3. Feedback system
4. Educational content library

### Phase 3: Scale

1. Database partitioning
2. Read replicas
3. Advanced caching strategies
4. Real-time features

## Performance Optimizations

### Query Optimizations:

- Use database indexes strategically
- Implement query result caching
- Use database connection pooling
- Optimize N+1 queries with joins

### Caching Strategy:

- Redis for hot data (responses, sessions)
- CDN for static assets
- Browser caching for UI components

### Monitoring:

- Query performance monitoring
- Cache hit rates
- API response times
- User engagement metrics

This schema provides a solid foundation for scaling Shikbo AI to millions of users while maintaining excellent performance and user experience.
