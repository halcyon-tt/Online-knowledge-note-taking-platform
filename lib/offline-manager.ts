// lib/offline-manager.ts
export class OfflineManager {
    private offlineQueue: Array<{
        operation: 'create' | 'update' | 'delete';
        table: 'notes' | 'folders';
        data: any;
        timestamp: string;
    }> = [];

    constructor() {
        this.loadQueue();
    }

    // 添加到离线队列
    addToQueue(operation: 'create' | 'update' | 'delete', table: 'notes' | 'folders', data: any) {
        const item = {
            operation,
            table,
            data,
            timestamp: new Date().toISOString()
        };

        this.offlineQueue.push(item);
        this.saveQueue();

        console.log(`添加到离线队列: ${operation} ${table}`, data);
    }

    // 处理离线队列
    async processQueue(supabase: any, userId: string) {
        if (this.offlineQueue.length === 0) return;

        console.log(`开始处理离线队列，共 ${this.offlineQueue.length} 条数据`);

        const successfulItems: number[] = [];

        for (let i = 0; i < this.offlineQueue.length; i++) {
            const item = this.offlineQueue[i];

            try {
                switch (item.operation) {
                    case 'create':
                        await supabase
                            .from(item.table)
                            .insert({
                                ...item.data,
                                user_id: userId,
                                created_at: item.timestamp,
                                updated_at: item.timestamp
                            });
                        break;

                    case 'update':
                        await supabase
                            .from(item.table)
                            .update({
                                ...item.data,
                                updated_at: item.timestamp
                            })
                            .eq('id', item.data.id)
                            .eq('user_id', userId);
                        break;

                    case 'delete':
                        await supabase
                            .from(item.table)
                            .delete()
                            .eq('id', item.data.id)
                            .eq('user_id', userId);
                        break;
                }

                successfulItems.push(i);
                console.log(`同步成功: ${item.operation} ${item.table} ${item.data.id}`);
            } catch (error) {
                console.error(`同步失败 ${item.operation} ${item.table}:`, error);
                break; // 遇到错误停止处理
            }
        }

        // 移除已成功的项目
        this.offlineQueue = this.offlineQueue.filter(
            (_, index) => !successfulItems.includes(index)
        );
        this.saveQueue();

        console.log(`离线队列处理完成，剩余 ${this.offlineQueue.length} 条`);
    }

    // 保存队列到本地存储
    private saveQueue() {
        localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
    }

    // 从本地加载队列
    private loadQueue() {
        try {
            const saved = localStorage.getItem('offlineQueue');
            this.offlineQueue = saved ? JSON.parse(saved) : [];
        } catch (error) {
            this.offlineQueue = [];
        }
    }

    // 清空队列
    clearQueue() {
        this.offlineQueue = [];
        this.saveQueue();
    }

    // 获取队列状态
    getQueueStatus() {
        return {
            count: this.offlineQueue.length,
            items: this.offlineQueue
        };
    }
}

// 单例实例
export const offlineManager = new OfflineManager();