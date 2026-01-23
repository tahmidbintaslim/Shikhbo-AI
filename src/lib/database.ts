// Redis Schema Design for Shikhbo AI (Upstash/Vercel KV)
//
// Key Patterns:
// - user:{userId} - User profile data (JSON)
// - conversation:{userId}:{conversationId} - Conversation data (JSON)
// - messages:{conversationId} - List of message IDs
// - message:{messageId} - Individual message data (JSON)
// - analytics:{date}:{metric} - Daily analytics (Hash)
// - ratelimit:{ip} - Rate limiting counters
// - cache:{key} - Response caching

export interface User {
    id: string;
    createdAt: number;
    lastActive: number;
    preferences: {
        locale: 'en' | 'bn';
        theme: 'light' | 'dark';
        grade: string;
    };
    stats: {
        totalConversations: number;
        totalMessages: number;
        favoriteSubject?: string;
    };
}

export interface Conversation {
    id: string;
    userId: string;
    title: string; // Auto-generated from first message
    createdAt: number;
    updatedAt: number;
    grade: string;
    messageCount: number;
    isActive: boolean;
}

export interface Message {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    metadata?: {
        tokens?: number;
        processingTime?: number;
        cached?: boolean;
    };
}

// Analytics Schema
export interface DailyAnalytics {
    date: string; // YYYY-MM-DD
    totalUsers: number;
    totalConversations: number;
    totalMessages: number;
    avgResponseTime: number;
    errorRate: number;
    popularGrades: Record<string, number>;
    languageUsage: Record<string, number>;
}

// Redis Operations
export class ShikhboDatabase {
    constructor(private kv: any) { }

    // User Management
    async createUser(userId: string, initialData: Partial<User>): Promise<void> {
        const user: User = {
            id: userId,
            createdAt: Date.now(),
            lastActive: Date.now(),
            preferences: {
                locale: 'en',
                theme: 'light',
                grade: '5',
                ...initialData.preferences
            },
            stats: {
                totalConversations: 0,
                totalMessages: 0,
                ...initialData.stats
            }
        };
        await this.kv.set(`user:${userId}`, JSON.stringify(user));
    }

    async getUser(userId: string): Promise<User | null> {
        const data = await this.kv.get(`user:${userId}`);
        return data ? JSON.parse(data) : null;
    }

    async updateUser(userId: string, updates: Partial<User>): Promise<void> {
        const user = await this.getUser(userId);
        if (!user) return;

        const updatedUser = { ...user, ...updates, lastActive: Date.now() };
        await this.kv.set(`user:${userId}`, JSON.stringify(updatedUser));
    }

    // Conversation Management
    async createConversation(userId: string, conversationData: Omit<Conversation, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'messageCount' | 'isActive'>): Promise<string> {
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const conversation: Conversation = {
            id: conversationId,
            userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageCount: 0,
            isActive: true,
            ...conversationData
        };

        await this.kv.set(`conversation:${userId}:${conversationId}`, JSON.stringify(conversation));
        await this.kv.lpush(`conversations:${userId}`, conversationId);

        // Update user stats
        const user = await this.getUser(userId);
        if (user) {
            user.stats.totalConversations++;
            await this.updateUser(userId, user);
        }

        return conversationId;
    }

    async getConversation(userId: string, conversationId: string): Promise<Conversation | null> {
        const data = await this.kv.get(`conversation:${userId}:${conversationId}`);
        return data ? JSON.parse(data) : null;
    }

    async getUserConversations(userId: string, limit = 50): Promise<Conversation[]> {
        const conversationIds = await this.kv.lrange(`conversations:${userId}`, 0, limit - 1);
        const conversations: Conversation[] = [];

        for (const id of conversationIds) {
            const conv = await this.getConversation(userId, id);
            if (conv) conversations.push(conv);
        }

        return conversations;
    }

    // Message Management
    async addMessage(conversationId: string, message: Omit<Message, 'id' | 'conversationId'>): Promise<string> {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fullMessage: Message = {
            id: messageId,
            conversationId,
            ...message
        };

        await this.kv.set(`message:${messageId}`, JSON.stringify(fullMessage));
        await this.kv.lpush(`messages:${conversationId}`, messageId);

        // Note: In production, you'd need to find the userId from conversation
        // For now, assuming we have it from context

        return messageId;
    }

    async getConversationMessages(conversationId: string, limit = 100): Promise<Message[]> {
        const messageIds = await this.kv.lrange(`messages:${conversationId}`, 0, limit - 1);
        const messages: Message[] = [];

        for (const id of messageIds) {
            const msg = await this.kv.get(`message:${id}`);
            if (msg) messages.push(JSON.parse(msg));
        }

        return messages.reverse(); // Redis lists are LIFO
    }

    // Analytics
    async recordAnalytics(date: string, event: Partial<DailyAnalytics>): Promise<void> {
        const key = `analytics:${date}`;
        const current = await this.kv.hgetall(key) || {};

        const updated = {
            ...current,
            date,
            totalUsers: (current.totalUsers || 0) + (event.totalUsers || 0),
            totalConversations: (current.totalConversations || 0) + (event.totalConversations || 0),
            totalMessages: (current.totalMessages || 0) + (event.totalMessages || 0),
            // Add other metrics...
        };

        await this.kv.hset(key, updated);
        await this.kv.expire(key, 30 * 24 * 60 * 60); // 30 days
    }

    async getAnalytics(date: string): Promise<DailyAnalytics | null> {
        const data = await this.kv.hgetall(`analytics:${date}`);
        return data ? data as DailyAnalytics : null;
    }

    // Cleanup (for maintenance)
    async cleanupOldData(daysOld = 90): Promise<void> {
        const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

        // Clean old analytics
        const analyticsKeys = await this.kv.keys('analytics:*');
        for (const key of analyticsKeys) {
            const date = key.split(':')[1];
            if (new Date(date).getTime() < cutoff) {
                await this.kv.del(key);
            }
        }

        // Clean old cache entries (handled by TTL)
        // Clean inactive conversations after 1 year
    }
}

// Usage Examples:
//
// const db = new ShikhboDatabase(kv);
//
// // Create user
// await db.createUser('user123', { preferences: { locale: 'bn', grade: '8' } });
//
// // Create conversation
// const convId = await db.createConversation('user123', {
//   title: 'Math Homework Help',
//   grade: '8'
// });
//
// // Add messages
// await db.addMessage(convId, {
//   role: 'user',
//   content: 'Help with algebra',
//   timestamp: Date.now()
// });
//
// // Get conversation history
// const conversations = await db.getUserConversations('user123');
// const messages = await db.getConversationMessages(convId);
