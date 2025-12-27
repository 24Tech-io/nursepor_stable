/**
 * IndexedDB Storage Layer
 * Provides persistent local storage for offline-first architecture
 */

const DB_NAME = 'nursepro-academy';
const DB_VERSION = 1;

export interface Course {
    id: number;
    title: string;
    description: string;
    progress: number;
    lastAccessed: number;
    thumbnail?: string;
    status: string;
    data: any;
}

export interface Quiz {
    id: number;
    courseId: number;
    title: string;
    questions: any[];
    score?: number;
    completedAt?: number;
    data: any;
}

export interface Video {
    id: number;
    courseId: number;
    chapterId: number;
    title: string;
    duration: number;
    progress: number;
    lastPosition: number;
    data: any;
}

export interface UserData {
    id: number;
    name: string;
    email: string;
    role: string;
    settings: any;
    lastSync: number;
}

export interface SyncQueueItem {
    id: string;
    type: 'quiz-submit' | 'video-progress' | 'chapter-complete' | 'api-request';
    data: any;
    url: string;
    method: string;
    timestamp: number;
    retries: number;
    maxRetries: number;
    status: 'pending' | 'syncing' | 'failed' | 'success';
}

class IndexedDBManager {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize database
     */
    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            if (typeof window === 'undefined' || !('indexedDB' in window)) {
                reject(new Error('IndexedDB not supported'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Courses store
                if (!db.objectStoreNames.contains('courses')) {
                    const courseStore = db.createObjectStore('courses', { keyPath: 'id' });
                    courseStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                    courseStore.createIndex('status', 'status', { unique: false });
                }

                // Quizzes store
                if (!db.objectStoreNames.contains('quizzes')) {
                    const quizStore = db.createObjectStore('quizzes', { keyPath: 'id' });
                    quizStore.createIndex('courseId', 'courseId', { unique: false });
                    quizStore.createIndex('completedAt', 'completedAt', { unique: false });
                }

                // Videos store
                if (!db.objectStoreNames.contains('videos')) {
                    const videoStore = db.createObjectStore('videos', { keyPath: 'id' });
                    videoStore.createIndex('courseId', 'courseId', { unique: false });
                    videoStore.createIndex('chapterId', 'chapterId', { unique: false });
                    videoStore.createIndex('progress', 'progress', { unique: false });
                }

                // User data store
                if (!db.objectStoreNames.contains('userData')) {
                    db.createObjectStore('userData', { keyPath: 'id' });
                }

                // Sync queue store
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
                    syncStore.createIndex('status', 'status', { unique: false });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('type', 'type', { unique: false });
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Generic get operation
     */
    async get<T>(storeName: string, key: number | string): Promise<T | null> {
        await this.init();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic put operation
     */
    async put<T>(storeName: string, data: T): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic delete operation
     */
    async delete(storeName: string, key: number | string): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic getAll operation
     */
    async getAll<T>(storeName: string): Promise<T[]> {
        await this.init();
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get by index
     */
    async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
        await this.init();
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Bulk put operation
     */
    async bulkPut<T extends { id?: number | string }>(storeName: string, items: T[]): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            let completed = 0;
            const total = items.length;

            items.forEach((item) => {
                const request = store.put(item);
                request.onsuccess = () => {
                    completed++;
                    if (completed === total) resolve();
                };
                request.onerror = () => reject(request.error);
            });

            if (total === 0) resolve();
        });
    }

    /**
     * Clear store
     */
    async clear(storeName: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Close database connection
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initPromise = null;
        }
    }
}

// Singleton instance
const db = new IndexedDBManager();

// Exported API
export const IndexedDB = {
    // Courses
    getCourse: (id: number) => db.get<Course>('courses', id),
    putCourse: (course: Course) => db.put('courses', course),
    getAllCourses: () => db.getAll<Course>('courses'),
    deleteCourse: (id: number) => db.delete('courses', id),
    bulkPutCourses: (courses: Course[]) => db.bulkPut('courses', courses),

    // Quizzes
    getQuiz: (id: number) => db.get<Quiz>('quizzes', id),
    putQuiz: (quiz: Quiz) => db.put('quizzes', quiz),
    getAllQuizzes: () => db.getAll<Quiz>('quizzes'),
    getQuizzesByCourse: (courseId: number) => db.getByIndex<Quiz>('quizzes', 'courseId', courseId),
    deleteQuiz: (id: number) => db.delete('quizzes', id),

    // Videos
    getVideo: (id: number) => db.get<Video>('videos', id),
    putVideo: (video: Video) => db.put('videos', video),
    getAllVideos: () => db.getAll<Video>('videos'),
    getVideosByCourse: (courseId: number) => db.getByIndex<Video>('videos', 'courseId', courseId),
    getVideosByChapter: (chapterId: number) => db.getByIndex<Video>('videos', 'chapterId', chapterId),
    deleteVideo: (id: number) => db.delete('videos', id),

    // User data
    getUserData: (id: number) => db.get<UserData>('userData', id),
    putUserData: (data: UserData) => db.put('userData', data),
    deleteUserData: (id: number) => db.delete('userData', id),

    // Sync queue
    getSyncItem: (id: string) => db.get<SyncQueueItem>('syncQueue', id),
    putSyncItem: (item: SyncQueueItem) => db.put('syncQueue', item),
    getAllSyncItems: () => db.getAll<SyncQueueItem>('syncQueue'),
    getPendingSyncItems: () => db.getByIndex<SyncQueueItem>('syncQueue', 'status', 'pending'),
    deleteSyncItem: (id: string) => db.delete('syncQueue', id),
    clearSyncQueue: () => db.clear('syncQueue'),

    // Utility
    clearAll: async () => {
        await db.clear('courses');
        await db.clear('quizzes');
        await db.clear('videos');
        await db.clear('userData');
        await db.clear('syncQueue');
    },
    close: () => db.close(),
};

export default IndexedDB;
